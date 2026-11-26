import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile as firebaseUpdateProfile,
  type User,
} from 'firebase/auth';
import { toast } from 'sonner';
import { auth, googleAuthProvider } from '../lib/firebase';
import { api, registerAuthTokenProvider } from '../lib/api';
import type {
  CollectionDTO,
  ProductDTO,
  SavedComparisonDTO,
  SavedProductDTO,
  ScanRecordDTO,
  UserPreferencesDTO,
  UserProfileDTO,
} from '../shared/types';

export interface AIContextSeed {
  product?: ProductDTO | null;
  comparisonProducts?: ProductDTO[] | null;
  initialPrompt?: string | null;
}

interface GuestWorkspaceState {
  profile: UserProfileDTO;
  preferences: UserPreferencesDTO;
  scans: ScanRecordDTO[];
  saved: SavedProductDTO[];
  collections: CollectionDTO[];
  savedComparisons: SavedComparisonDTO[];
}

const GUEST_STORAGE_KEY = 'suvita_india_workspace_v1';

const DEFAULT_PREFERENCES: UserPreferencesDTO = {
  mainReason: 'make_healthier_sustainable_choices',
  preferredCategories: ['food_beverages', 'personal_care'],
  priorities: ['ingredient_transparency', 'packaging'],
  onboardingCompleted: false,
  emailNotifications: true,
  weeklyDigest: true,
  alternativeAlerts: true,
  saveChatHistory: true,
};

function loadGuestWorkspace(): GuestWorkspaceState {
  try {
    const raw = sessionStorage.getItem(GUEST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GuestWorkspaceState;
      if (parsed && parsed.profile && parsed.preferences) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage parse failures
  }
  return {
    profile: {
      uid: 'guest',
      email: 'guest@suvita.in',
      displayName: 'Explorer',
      avatarUrl: null,
    },
    preferences: { ...DEFAULT_PREFERENCES },
    scans: [],
    saved: [],
    collections: [],
    savedComparisons: [],
  };
}

function saveGuestWorkspace(state: GuestWorkspaceState) {
  try {
    sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

interface AppContextValue {
  firebaseUser: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  profile: UserProfileDTO;
  preferences: UserPreferencesDTO;
  scans: ScanRecordDTO[];
  savedProducts: SavedProductDTO[];
  collections: CollectionDTO[];
  savedComparisons: SavedComparisonDTO[];
  compareIds: number[];
  aiContext: AIContextSeed;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  showOnboarding: boolean;
  setShowOnboarding: (open: boolean) => void;
  setAIContext: (ctx: AIContextSeed) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  sendPasswordRecovery: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: { displayName?: string; avatarUrl?: string | null }) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferencesDTO>) => Promise<void>;
  recordScan: (product: ProductDTO, method: 'camera' | 'manual' | 'search') => Promise<void>;
  toggleSaveProduct: (product: ProductDTO) => Promise<void>;
  isProductSaved: (productId: number) => boolean;
  createCollection: (name: string, description?: string) => Promise<void>;
  deleteCollection: (collectionId: number) => Promise<void>;
  addToCollection: (collectionId: number, product: ProductDTO) => Promise<void>;
  removeFromCollection: (collectionId: number, productId: number) => Promise<void>;
  saveComparisonPair: (products: ProductDTO[], title?: string) => Promise<void>;
  deleteSavedComparison: (id: number) => Promise<void>;
  addToCompare: (productId: number) => void;
  removeFromCompare: (productId: number) => void;
  setCompareIds: React.Dispatch<React.SetStateAction<number[]>>;
  refreshUserData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [guestState, setGuestState] = useState<GuestWorkspaceState>(() => loadGuestWorkspace());

  const [authProfile, setAuthProfile] = useState<UserProfileDTO | null>(null);
  const [authPreferences, setAuthPreferences] = useState<UserPreferencesDTO | null>(null);
  const [authScans, setAuthScans] = useState<ScanRecordDTO[]>([]);
  const [authSaved, setAuthSaved] = useState<SavedProductDTO[]>([]);
  const [authCollections, setAuthCollections] = useState<CollectionDTO[]>([]);
  const [authSavedComparisons, setAuthSavedComparisons] = useState<SavedComparisonDTO[]>([]);

  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [aiContext, setAIContext] = useState<AIContextSeed>({});
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const isAuthenticated = Boolean(firebaseUser);

  // Persist guest workspace changes cleanly
  useEffect(() => {
    saveGuestWorkspace(guestState);
  }, [guestState]);

  const refreshUserData = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const [meRes, scansRes, savedRes, colsRes, compsRes] = await Promise.all([
        api.getMe(),
        api.getScans(),
        api.getSaved(),
        api.getCollections(),
        api.getSavedComparisons(),
      ]);
      setAuthProfile(meRes.profile);
      setAuthPreferences(meRes.preferences);
      setAuthScans(scansRes.scans);
      setAuthSaved(savedRes.saved);
      setAuthCollections(colsRes.collections);
      setAuthSavedComparisons(compsRes.comparisons);

      const urlParams = new URLSearchParams(window.location.search);
      if (!meRes.preferences.onboardingCompleted && urlParams.get('autostart') !== '1') {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error('Failed to sync authenticated user data:', err);
    }
  }, []);

  useEffect(() => {
    registerAuthTokenProvider(async () => {
      if (!auth.currentUser) return null;
      try {
        return await auth.currentUser.getIdToken();
      } catch {
        return null;
      }
    });

    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await refreshUserData();
      } else {
        setAuthProfile(null);
        setAuthPreferences(null);
        setAuthScans([]);
        setAuthSaved([]);
        setAuthCollections([]);
        setAuthSavedComparisons([]);
      }
      setAuthLoading(false);
    });

    return () => unsub();
  }, [refreshUserData]);

  // Check onboarding on initial load for guest mode (respects ?autostart=1)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('autostart') === '1') {
        setShowOnboarding(false);
      } else if (!guestState.preferences.onboardingCompleted) {
        setShowOnboarding(true);
      }
    }
  }, [authLoading, isAuthenticated, guestState.preferences.onboardingCompleted]);

  const profile = isAuthenticated && authProfile ? authProfile : guestState.profile;
  const preferences =
    isAuthenticated && authPreferences ? authPreferences : guestState.preferences;
  const scans = isAuthenticated ? authScans : guestState.scans;
  const savedProducts = isAuthenticated ? authSaved : guestState.saved;
  const collections = isAuthenticated ? authCollections : guestState.collections;
  const savedComparisons = isAuthenticated
    ? authSavedComparisons
    : guestState.savedComparisons;

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
      setAuthModalOpen(false);
      toast.success('Signed in to SUvita with Google');
    } catch (err: any) {
      const msg =
        err?.code === 'auth/popup-closed-by-user'
          ? 'Sign-in window was closed before completing.'
          : err?.message || 'Google sign-in failed.';
      toast.error(msg);
      throw err;
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setAuthModalOpen(false);
      toast.success('Welcome back to SUvita');
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        toast.error(
          'Email/Password sign-in is not yet enabled in Firebase Console. Please use Google Sign-In.'
        );
      } else {
        toast.error(err?.message || 'Invalid email or password.');
      }
      throw err;
    }
  }, []);

  const signUpWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) {
          await firebaseUpdateProfile(cred.user, { displayName: name.trim() });
        }
        setAuthModalOpen(false);
        toast.success('Account created! Welcome to SUvita.');
      } catch (err: any) {
        if (err?.code === 'auth/operation-not-allowed') {
          toast.error(
            'Email/Password registration needs to be enabled in Firebase Console. Use Google Sign-In for instant access.'
          );
        } else {
          toast.error(err?.message || 'Could not create account.');
        }
        throw err;
      }
    },
    []
  );

  const sendPasswordRecovery = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password recovery link sent to your email.');
    } catch (err: any) {
      toast.error(err?.message || 'Could not send password recovery email.');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
      toast.success('Logged out of SUvita');
    } catch (err: any) {
      toast.error(err?.message || 'Logout failed');
    }
  }, []);

  const updateProfile = useCallback(
    async (updates: { displayName?: string; avatarUrl?: string | null }) => {
      if (isAuthenticated) {
        const { profile: updated } = await api.updateProfile(updates);
        setAuthProfile(updated);
      } else {
        setGuestState((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            displayName: updates.displayName?.trim() || prev.profile.displayName,
            avatarUrl:
              updates.avatarUrl !== undefined ? updates.avatarUrl : prev.profile.avatarUrl,
          },
        }));
      }
      toast.success('Profile updated');
    },
    [isAuthenticated]
  );

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferencesDTO>) => {
      if (isAuthenticated) {
        const { preferences: updated } = await api.updatePreferences(updates);
        setAuthPreferences(updated);
      } else {
        setGuestState((prev) => ({
          ...prev,
          preferences: { ...prev.preferences, ...updates },
        }));
      }
    },
    [isAuthenticated]
  );

  const recordScan = useCallback(
    async (product: ProductDTO, method: 'camera' | 'manual' | 'search') => {
      if (isAuthenticated) {
        try {
          const { scan } = await api.logScan(product.id, method);
          setAuthScans((prev) => [scan, ...prev]);
        } catch (err) {
          console.error('Failed to log scan to Cloud SQL:', err);
        }
      } else {
        const record: ScanRecordDTO = {
          id: Date.now(),
          productId: product.id,
          barcode: product.barcode,
          scanMethod: method,
          ecoscoreSnapshot: product.score.overallScore,
          gradeSnapshot: product.score.grade,
          scannedAt: new Date().toISOString(),
          product,
        };
        setGuestState((prev) => ({
          ...prev,
          scans: [record, ...prev.scans].slice(0, 60),
        }));
      }
    },
    [isAuthenticated]
  );

  const isProductSaved = useCallback(
    (productId: number) => savedProducts.some((s) => s.productId === productId),
    [savedProducts]
  );

  const toggleSaveProduct = useCallback(
    async (product: ProductDTO) => {
      const already = isProductSaved(product.id);
      if (isAuthenticated) {
        if (already) {
          await api.unsaveProduct(product.id);
          setAuthSaved((prev) => prev.filter((s) => s.productId !== product.id));
          toast.success(`Removed ${product.name} from Saved Products`);
        } else {
          await api.saveProduct(product.id);
          const { saved } = await api.getSaved();
          setAuthSaved(saved);
          toast.success(`Saved ${product.name} to My Collection`);
        }
      } else {
        if (already) {
          setGuestState((prev) => ({
            ...prev,
            saved: prev.saved.filter((s) => s.productId !== product.id),
          }));
          toast.success(`Removed ${product.name} from Saved Products`);
        } else {
          const entry: SavedProductDTO = {
            id: Date.now(),
            productId: product.id,
            notes: null,
            savedAt: new Date().toISOString(),
            product,
          };
          setGuestState((prev) => ({
            ...prev,
            saved: [entry, ...prev.saved],
          }));
          toast.success(`Saved ${product.name} to My Collection`);
        }
      }
    },
    [isAuthenticated, isProductSaved]
  );

  const createCollection = useCallback(
    async (name: string, description?: string) => {
      const clean = name.trim();
      if (!clean) return;
      if (isAuthenticated) {
        const { collection } = await api.createCollection(clean, description);
        setAuthCollections((prev) => [collection, ...prev]);
      } else {
        const created: CollectionDTO = {
          id: Date.now(),
          name: clean,
          description: description?.trim() || null,
          createdAt: new Date().toISOString(),
          productIds: [],
          products: [],
        };
        setGuestState((prev) => ({
          ...prev,
          collections: [created, ...prev.collections],
        }));
      }
      toast.success(`Created collection "${clean}"`);
    },
    [isAuthenticated]
  );

  const deleteCollection = useCallback(
    async (collectionId: number) => {
      if (isAuthenticated) {
        await api.deleteCollection(collectionId);
        setAuthCollections((prev) => prev.filter((c) => c.id !== collectionId));
      } else {
        setGuestState((prev) => ({
          ...prev,
          collections: prev.collections.filter((c) => c.id !== collectionId),
        }));
      }
      toast.success('Collection deleted');
    },
    [isAuthenticated]
  );

  const addToCollection = useCallback(
    async (collectionId: number, product: ProductDTO) => {
      if (isAuthenticated) {
        await api.addProductToCollection(collectionId, product.id);
        const { collections: refreshed } = await api.getCollections();
        setAuthCollections(refreshed);
      } else {
        setGuestState((prev) => ({
          ...prev,
          collections: prev.collections.map((c) => {
            if (c.id !== collectionId) return c;
            if (c.productIds.includes(product.id)) return c;
            return {
              ...c,
              productIds: [...c.productIds, product.id],
              products: [...c.products, product],
            };
          }),
        }));
      }
      toast.success(`Added ${product.name} to collection`);
    },
    [isAuthenticated]
  );

  const removeFromCollection = useCallback(
    async (collectionId: number, productId: number) => {
      if (isAuthenticated) {
        await api.removeProductFromCollection(collectionId, productId);
        setAuthCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  productIds: c.productIds.filter((id) => id !== productId),
                  products: c.products.filter((p) => p.id !== productId),
                }
              : c
          )
        );
      } else {
        setGuestState((prev) => ({
          ...prev,
          collections: prev.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  productIds: c.productIds.filter((id) => id !== productId),
                  products: c.products.filter((p) => p.id !== productId),
                }
              : c
          ),
        }));
      }
      toast.success('Removed product from collection');
    },
    [isAuthenticated]
  );

  const saveComparisonPair = useCallback(
    async (prods: ProductDTO[], title?: string) => {
      if (prods.length < 2) return;
      const compTitle = title?.trim() || prods.map((p) => p.name).join(' vs ');
      if (isAuthenticated) {
        const { comparison } = await api.saveComparison(
          prods.map((p) => p.id),
          compTitle
        );
        setAuthSavedComparisons((prev) => [comparison, ...prev]);
      } else {
        const entry: SavedComparisonDTO = {
          id: Date.now(),
          productAId: prods[0].id,
          productBId: prods[1].id,
          productCId: prods[2]?.id ?? null,
          title: compTitle,
          summarySnapshot: `Compared ${prods[0].name} (Grade ${prods[0].score.grade}) vs ${prods[1].name} (Grade ${prods[1].score.grade})`,
          createdAt: new Date().toISOString(),
          products: prods,
        };
        setGuestState((prev) => ({
          ...prev,
          savedComparisons: [entry, ...prev.savedComparisons],
        }));
      }
      toast.success('Comparison saved to your account');
    },
    [isAuthenticated]
  );

  const deleteSavedComparison = useCallback(
    async (id: number) => {
      if (isAuthenticated) {
        await api.deleteSavedComparison(id);
        setAuthSavedComparisons((prev) => prev.filter((c) => c.id !== id));
      } else {
        setGuestState((prev) => ({
          ...prev,
          savedComparisons: prev.savedComparisons.filter((c) => c.id !== id),
        }));
      }
      toast.success('Saved comparison removed');
    },
    [isAuthenticated]
  );

  const addToCompare = useCallback((productId: number) => {
    setCompareIds((prev) => {
      if (prev.includes(productId)) {
        toast.info('Product is already in Compare');
        return prev;
      }
      if (prev.length >= 3) {
        toast.error('You can compare up to 3 products at a time.');
        return prev;
      }
      toast.success('Added to Scan & Compare');
      return [...prev, productId];
    });
  }, []);

  const removeFromCompare = useCallback((productId: number) => {
    setCompareIds((prev) => prev.filter((id) => id !== productId));
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      firebaseUser,
      isAuthenticated,
      authLoading,
      profile,
      preferences,
      scans,
      savedProducts,
      collections,
      savedComparisons,
      compareIds,
      aiContext,
      authModalOpen,
      setAuthModalOpen,
      showOnboarding,
      setShowOnboarding,
      setAIContext,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordRecovery,
      logout,
      updateProfile,
      updatePreferences,
      recordScan,
      toggleSaveProduct,
      isProductSaved,
      createCollection,
      deleteCollection,
      addToCollection,
      removeFromCollection,
      saveComparisonPair,
      deleteSavedComparison,
      addToCompare,
      removeFromCompare,
      setCompareIds,
      refreshUserData,
    }),
    [
      firebaseUser,
      isAuthenticated,
      authLoading,
      profile,
      preferences,
      scans,
      savedProducts,
      collections,
      savedComparisons,
      compareIds,
      aiContext,
      authModalOpen,
      showOnboarding,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordRecovery,
      logout,
      updateProfile,
      updatePreferences,
      recordScan,
      toggleSaveProduct,
      isProductSaved,
      createCollection,
      deleteCollection,
      addToCollection,
      removeFromCollection,
      saveComparisonPair,
      deleteSavedComparison,
      addToCompare,
      removeFromCompare,
      refreshUserData,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
