import React, { useEffect, useState } from 'react';
import { Check, LogIn, LogOut, RotateCcw, Save, User } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  type ProductCategory,
  type SustainabilityPriority,
} from '../shared/types';
import { Button, Input, SurfaceCard } from '../components/ui/primitives';

const ALL_CATEGORIES: ProductCategory[] = [
  'food_beverages',
  'beauty_cosmetics',
  'personal_care',
  'household',
];

const ALL_PRIORITIES: SustainabilityPriority[] = [
  'ingredient_transparency',
  'environmental_sustainability',
  'packaging',
  'ethical_brands',
];

function isValidAvatarUrl(raw: string): boolean {
  if (!raw) return true;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const ProfilePage: React.FC = () => {
  const {
    profile,
    preferences,
    isAuthenticated,
    setAuthModalOpen,
    setShowOnboarding,
    logout,
    updateProfile,
    updatePreferences,
  } = useApp();

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [selectedCategories, setSelectedCategories] = useState<ProductCategory[]>(
    preferences.preferredCategories
  );
  const [selectedPriorities, setSelectedPriorities] = useState<SustainabilityPriority[]>(
    preferences.priorities
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile.displayName);
    setAvatarUrl(profile.avatarUrl || '');
  }, [profile.displayName, profile.avatarUrl]);

  useEffect(() => {
    setSelectedCategories(preferences.preferredCategories);
    setSelectedPriorities(preferences.priorities);
  }, [preferences.preferredCategories, preferences.priorities]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = displayName.trim();
    const cleanAvatar = avatarUrl.trim();

    if (!cleanName) {
      setProfileError('Display name cannot be empty.');
      return;
    }
    if (cleanAvatar && !isValidAvatarUrl(cleanAvatar)) {
      setProfileError('Avatar URL must be a valid https:// image link.');
      return;
    }

    setProfileError(null);
    setSavingProfile(true);
    try {
      await updateProfile({
        displayName: cleanName,
        avatarUrl: cleanAvatar || null,
      });
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleCategory = (cat: ProductCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const togglePriority = (pri: SustainabilityPriority) => {
    setSelectedPriorities((prev) =>
      prev.includes(pri) ? prev.filter((p) => p !== pri) : [...prev, pri]
    );
  };

  const handleSavePreferences = async () => {
    if (selectedCategories.length === 0 || selectedPriorities.length === 0) {
      toast.error('Please keep at least one category and one sustainability priority selected.');
      return;
    }
    setSavingPrefs(true);
    try {
      await updatePreferences({
        preferredCategories: selectedCategories,
        priorities: selectedPriorities,
      });
      toast.success('Sustainability preferences saved');
    } catch (err: any) {
      toast.error(err?.message || 'Could not save preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const initials = (profile.displayName || 'S')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-8 max-w-4xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">My Profile</h1>
          <p className="mt-1.5 text-sm text-[#A0AAA5]">
            Manage your SUvita identity and personalize which product categories and sustainability
            factors matter most to you.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowOnboarding(true)}>
          <RotateCcw className="h-3.5 w-3.5" />
          Re-run Onboarding
        </Button>
      </header>

      {/* Account Summary Banner */}
      <SurfaceCard className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              referrerPolicy="no-referrer"
              className="h-14 w-14 rounded-full object-cover border border-white/15"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#00FFAA]/15 text-base font-bold text-[#00FFAA]">
              {initials}
            </div>
          )}
          <div>
            <h2 className="text-base font-semibold text-white">{profile.displayName}</h2>
            <p className="text-xs text-[#A0AAA5] mt-0.5">
              {isAuthenticated ? profile.email : 'Guest Workspace · Sign in to sync across devices'}
            </p>
          </div>
        </div>

        <div>
          {isAuthenticated ? (
            <Button variant="secondary" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={() => setAuthModalOpen(true)}>
              <LogIn className="h-4 w-4" />
              Sign In / Sync Account
            </Button>
          )}
        </div>
      </SurfaceCard>

      {/* Identity Form */}
      <SurfaceCard className="space-y-5">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-[#00FFAA]" aria-hidden="true" />
          <h2 className="text-base font-semibold text-white">Profile Details</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-display-name" className="block text-xs font-medium text-[#C8D3CD] mb-1.5">
                Display Name
              </label>
              <Input
                id="profile-display-name"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (profileError) setProfileError(null);
                }}
                placeholder="Your name"
                maxLength={80}
              />
            </div>

            <div>
              <label htmlFor="profile-avatar-url" className="block text-xs font-medium text-[#C8D3CD] mb-1.5">
                Avatar Image URL (optional, https://)
              </label>
              <Input
                id="profile-avatar-url"
                type="url"
                value={avatarUrl}
                onChange={(e) => {
                  setAvatarUrl(e.target.value);
                  if (profileError) setProfileError(null);
                }}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>

          {profileError && (
            <p role="alert" className="text-xs text-[#F38B8B]">
              {profileError}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={savingProfile}>
              <Save className="h-4 w-4" />
              {savingProfile ? 'Saving…' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </SurfaceCard>

      {/* Preferences Editor */}
      <SurfaceCard className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-white">Personalization Preferences</h2>
          <p className="mt-1 text-xs text-[#A0AAA5]">
            Used to tailor your Overview recommendations, greener alternative suggestions, and
            SUvita AI responses.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A0AAA5]">
            Preferred Product Categories
          </h3>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {ALL_CATEGORIES.map((cat) => {
              const selected = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  aria-pressed={selected}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors cursor-pointer ${
                    selected
                      ? 'border-[#00FFAA]/45 bg-[#00FFAA]/10 text-white'
                      : 'border-white/[0.08] bg-[#161D1A] text-[#A0AAA5] hover:border-white/20 hover:text-white'
                  }`}
                >
                  <span className="font-medium">{CATEGORY_LABELS[cat]}</span>
                  {selected && <Check className="h-4 w-4 text-[#00FFAA]" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A0AAA5]">
            Sustainability Priorities
          </h3>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {ALL_PRIORITIES.map((pri) => {
              const selected = selectedPriorities.includes(pri);
              return (
                <button
                  key={pri}
                  type="button"
                  onClick={() => togglePriority(pri)}
                  aria-pressed={selected}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors cursor-pointer ${
                    selected
                      ? 'border-[#00FFAA]/45 bg-[#00FFAA]/10 text-white'
                      : 'border-white/[0.08] bg-[#161D1A] text-[#A0AAA5] hover:border-white/20 hover:text-white'
                  }`}
                >
                  <span className="font-medium">{PRIORITY_LABELS[pri]}</span>
                  {selected && <Check className="h-4 w-4 text-[#00FFAA]" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-white/[0.07]">
          <Button onClick={handleSavePreferences} disabled={savingPrefs}>
            <Save className="h-4 w-4" />
            {savingPrefs ? 'Saving…' : 'Save Preferences'}
          </Button>
        </div>
      </SurfaceCard>
    </div>
  );
};
