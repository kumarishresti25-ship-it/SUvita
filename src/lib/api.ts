import type {
  AIConversationDTO,
  AIStructuredResponseDTO,
  AlternativeRecommendationDTO,
  CollectionDTO,
  ComparisonPayloadDTO,
  DashboardSummaryDTO,
  InsightsDataDTO,
  ProductDTO,
  SavedComparisonDTO,
  SavedProductDTO,
  ScanRecordDTO,
  UserPreferencesDTO,
  UserProfileDTO,
} from '../shared/types';

// In-memory token getter set by AuthProvider (never stored in localStorage)
let tokenProvider: (() => Promise<string | null>) | null = null;

export function registerAuthTokenProvider(fn: () => Promise<string | null>) {
  tokenProvider = fn;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (tokenProvider) {
    const token = await tokenProvider();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const res = await fetch(path, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  // Public catalog & barcode endpoints
  getProducts: (params?: { search?: string; category?: string; grade?: string; sort?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.category && params.category !== 'all') qs.set('category', params.category);
    if (params?.grade && params.grade !== 'all') qs.set('grade', params.grade);
    if (params?.sort) qs.set('sort', params.sort);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<{ products: ProductDTO[] }>(`/api/products${suffix}`);
  },

  searchExternal: (q: string) =>
    apiFetch<{
      local: ProductDTO[];
      external: Array<{
        barcode: string;
        name: string;
        brand: string;
        imageUrl: string | null;
        source: string;
      }>;
    }>(`/api/products/search-external?q=${encodeURIComponent(q)}`),

  lookupBarcode: (barcode: string) =>
    apiFetch<{
      product: ProductDTO;
      alternatives: AlternativeRecommendationDTO[];
      lookupSource: string;
    }>(`/api/products/lookup/${encodeURIComponent(barcode)}`),

  getProduct: (idOrBarcode: string) =>
    apiFetch<{
      product: ProductDTO;
      alternatives: AlternativeRecommendationDTO[];
    }>(`/api/products/${encodeURIComponent(idOrBarcode)}`),

  getDailyInsight: () =>
    apiFetch<{ title: string; body: string; source: string; category: string }>('/api/insights/daily'),

  generateProductBrief: (idOrBarcode: string) =>
    apiFetch<{
      summary: string;
      keyTakeaways: string[];
      caveat: string;
      generatedByAi: boolean;
    }>(`/api/products/${encodeURIComponent(idOrBarcode)}/ai-brief`, {
      method: 'POST',
    }),

  // Scan & Compare endpoints
  scanFirstProduct: (barcodeOrId: string) =>
    apiFetch<{ product: ProductDTO }>('/api/compare/scan-first', {
      method: 'POST',
      body: JSON.stringify({ barcodeOrId }),
    }),

  scanSecondProduct: (barcodeOrId: string, firstProductId?: number) =>
    apiFetch<{ product: ProductDTO }>('/api/compare/scan-second', {
      method: 'POST',
      body: JSON.stringify({ barcodeOrId, firstProductId }),
    }),

  getComparisonData: (ids: number[]) =>
    apiFetch<ComparisonPayloadDTO>(`/api/compare/data?ids=${ids.join(',')}`),

  // SUvita AI endpoints
  chatWithAI: (payload: {
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    contextProductId?: number | null;
    contextComparisonIds?: number[] | null;
    conversationId?: number | null;
    action?: 'chat' | 'explain_product' | 'explain_ingredient' | 'compare';
    guestPreferences?: UserPreferencesDTO;
  }) =>
    apiFetch<{
      conversationId: number | null;
      response: AIStructuredResponseDTO;
    }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAIConversations: () =>
    apiFetch<{ conversations: AIConversationDTO[] }>('/api/ai/conversations'),

  getAIConversation: (id: number) =>
    apiFetch<{ conversation: AIConversationDTO }>(`/api/ai/conversations/${id}`),

  deleteAIConversation: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/ai/conversations/${id}`, { method: 'DELETE' }),

  // Authenticated user endpoints
  getMe: () =>
    apiFetch<{ profile: UserProfileDTO; preferences: UserPreferencesDTO }>('/api/me'),

  updateProfile: (updates: { displayName?: string; avatarUrl?: string | null }) =>
    apiFetch<{ profile: UserProfileDTO }>('/api/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  updatePreferences: (updates: Partial<UserPreferencesDTO>) =>
    apiFetch<{ preferences: UserPreferencesDTO }>('/api/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  getDashboard: () => apiFetch<DashboardSummaryDTO>('/api/me/dashboard'),

  getScans: () => apiFetch<{ scans: ScanRecordDTO[] }>('/api/me/scans'),

  logScan: (productId: number, scanMethod: 'camera' | 'manual' | 'search') =>
    apiFetch<{ scan: ScanRecordDTO }>('/api/me/scans', {
      method: 'POST',
      body: JSON.stringify({ productId, scanMethod }),
    }),

  getSaved: () => apiFetch<{ saved: SavedProductDTO[] }>('/api/me/saved'),

  saveProduct: (productId: number, notes?: string) =>
    apiFetch<{ ok: boolean }>('/api/me/saved', {
      method: 'POST',
      body: JSON.stringify({ productId, notes }),
    }),

  unsaveProduct: (productId: number) =>
    apiFetch<{ ok: boolean }>(`/api/me/saved/${productId}`, { method: 'DELETE' }),

  getCollections: () => apiFetch<{ collections: CollectionDTO[] }>('/api/me/collections'),

  createCollection: (name: string, description?: string) =>
    apiFetch<{ collection: CollectionDTO }>('/api/me/collections', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  deleteCollection: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/me/collections/${id}`, { method: 'DELETE' }),

  addProductToCollection: (collectionId: number, productId: number) =>
    apiFetch<{ ok: boolean }>(`/api/me/collections/${collectionId}/products`, {
      method: 'POST',
      body: JSON.stringify({ productId }),
    }),

  removeProductFromCollection: (collectionId: number, productId: number) =>
    apiFetch<{ ok: boolean }>(`/api/me/collections/${collectionId}/products/${productId}`, {
      method: 'DELETE',
    }),

  getSavedComparisons: () =>
    apiFetch<{ comparisons: SavedComparisonDTO[] }>('/api/me/saved-comparisons'),

  saveComparison: (productIds: number[], title?: string) =>
    apiFetch<{ comparison: SavedComparisonDTO }>('/api/me/saved-comparisons', {
      method: 'POST',
      body: JSON.stringify({ productIds, title }),
    }),

  deleteSavedComparison: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/me/saved-comparisons/${id}`, { method: 'DELETE' }),

  getInsights: () => apiFetch<InsightsDataDTO>('/api/me/insights'),
};
