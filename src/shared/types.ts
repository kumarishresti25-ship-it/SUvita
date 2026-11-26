export type ProductCategory =
  | 'food_beverages'
  | 'beauty_cosmetics'
  | 'personal_care'
  | 'household';

export type EcoGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'INSUFFICIENT_DATA';

export type IngredientSafetyStatus =
  | 'verified_safe'
  | 'attention'
  | 'limited_info';

export type SustainabilityPriority =
  | 'ingredient_transparency'
  | 'environmental_sustainability'
  | 'packaging'
  | 'ethical_brands';

export interface ProductIngredientDTO {
  id?: number;
  name: string;
  inciName?: string | null;
  purpose?: string | null;
  safetyStatus: IngredientSafetyStatus;
  regulatoryInfo?: string | null;
  warningText?: string | null;
  sourceName: string;
  position: number;
}

export interface ProductSourceDTO {
  id?: number;
  sourceName: string;
  sourceType: string;
  sourceUrl?: string | null;
  licenseNote?: string | null;
  isVerifiedExternal: boolean;
  fetchedAt?: string;
}

export interface DimensionBreakdown {
  key: 'ingredientSafety' | 'packagingType' | 'brandEthics' | 'energyFootprint';
  label: string;
  weight: number;
  weightPercent: number;
  score: number | null;
  weightedContribution: number | null;
  available: boolean;
  explanation: string;
  source: string;
}

export interface SustainabilityScoreDTO {
  overallScore: number | null;
  observedSubscoreAverage: number | null;
  grade: EcoGrade;
  gradeLabel: string;
  ingredientScore: number | null;
  packagingScore: number | null;
  brandEthicsScore: number | null;
  energyScore: number | null;
  confidencePercent: number;
  confidenceLevel: 'High' | 'Moderate' | 'Low' | 'Insufficient';
  availableDimensions: number;
  dimensions: DimensionBreakdown[];
  strongestFactor: string | null;
  weakestFactor: string | null;
  methodologyVersion: string;
  missingNotice: string | null;
}

export interface ProductDTO {
  id: number;
  barcode: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  imageUrl: string | null;
  priceCents: number | null; // stored in minor units (INR paise: 24900 = ₹249)
  currency: string;
  packagingSummary: string | null;
  packagingType: string | null;
  originCountry: string | null;
  isSampleData: boolean;
  sourceLabel: string;
  createdAt: string;
  score: SustainabilityScoreDTO;
  ingredients: ProductIngredientDTO[];
  sources: ProductSourceDTO[];
}

export interface AlternativeRecommendationDTO {
  product: ProductDTO;
  scoreDelta: number;
  mainReason: string;
  improvementHighlights: string[];
  matchesPreferences: boolean;
}

export interface UserProfileDTO {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface UserPreferencesDTO {
  mainReason: string;
  preferredCategories: ProductCategory[];
  priorities: SustainabilityPriority[];
  onboardingCompleted: boolean;
  emailNotifications: boolean;
  weeklyDigest: boolean;
  alternativeAlerts: boolean;
  saveChatHistory: boolean;
}

export interface ScanRecordDTO {
  id: number;
  productId: number;
  barcode: string;
  scanMethod: 'camera' | 'manual' | 'search';
  ecoscoreSnapshot: number | null;
  gradeSnapshot: EcoGrade;
  scannedAt: string;
  product: ProductDTO;
}

export interface SavedProductDTO {
  id: number;
  productId: number;
  notes: string | null;
  savedAt: string;
  product: ProductDTO;
}

export interface CollectionDTO {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  productIds: number[];
  products: ProductDTO[];
}

export interface SavedComparisonDTO {
  id: number;
  productAId: number;
  productBId: number;
  productCId: number | null;
  title: string;
  summarySnapshot: string | null;
  createdAt: string;
  products: ProductDTO[];
}

export interface ProductDifferenceMetric {
  key: string;
  label: string;
  weightLabel?: string;
  values: Array<{
    productId: number;
    score: number | null;
    display: string;
    available: boolean;
  }>;
  winnerProductIds: number[];
  deltaNote: string;
}

export interface IngredientDiffDTO {
  sharedCount: number;
  sharedIngredients: string[];
  uniqueByProduct: Array<{
    productId: number;
    productName: string;
    attentionCount: number;
    limitedInfoCount: number;
    verifiedSafeCount: number;
    uniqueIngredients: string[];
  }>;
}

export interface SmartComparisonSummaryDTO {
  headline: string;
  higherRatedProductId: number | null;
  higherRatedLabel: string;
  advantageA: string;
  advantageB: string;
  tradeOffs: string[];
  missingDataNotes: string[];
}

export interface ComparisonPayloadDTO {
  products: ProductDTO[];
  metrics: ProductDifferenceMetric[];
  ingredientDiff: IngredientDiffDTO;
  summary: SmartComparisonSummaryDTO;
  betterAlternatives: AlternativeRecommendationDTO[];
}

export interface AIStructuredResponseDTO {
  explanation: string;
  keyFindings: string[];
  recommendedProducts: Array<{
    product: ProductDTO;
    reason: string;
  }>;
  comparisonHighlights?: Array<{
    dimension: string;
    leader: string;
    note: string;
  }>;
  dataLimitations: string;
  sources: string[];
  followUpSuggestions: string[];
  responseType: 'product_analysis' | 'ingredient_explainer' | 'comparison' | 'shopping_advisor' | 'general';
}

export interface AIChatMessageDTO {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  structured?: AIStructuredResponseDTO | null;
  createdAt: string;
}

export interface AIConversationDTO {
  id: number;
  title: string;
  contextProductId: number | null;
  contextComparisonIds: number[] | null;
  createdAt: string;
  updatedAt: string;
  messages?: AIChatMessageDTO[];
}

export interface DashboardSummaryDTO {
  totalScans: number;
  averageEcoScore: number | null;
  sustainableDiscoveredCount: number;
  savedCount: number;
  recentScans: ScanRecordDTO[];
  recommendedAlternatives: ProductDTO[];
  insightOfTheDay: {
    title: string;
    body: string;
    source: string;
    category: string;
  };
}

export interface InsightsDataDTO {
  totalScans: number;
  averageEcoScore: number | null;
  abRatedCount: number;
  gradeDistribution: Array<{ grade: string; count: number }>;
  categoryBreakdown: Array<{ category: ProductCategory; label: string; count: number; avgScore: number | null }>;
  scoreTrend: Array<{ date: string; avgScore: number; scans: number }>;
  timeline: Array<{
    id: number;
    productId: number;
    productName: string;
    brand: string;
    category: ProductCategory;
    grade: EcoGrade;
    score: number | null;
    scanMethod: string;
    scannedAt: string;
  }>;
  methodologyNote: string;
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  food_beverages: 'Food & Beverages',
  beauty_cosmetics: 'Beauty & Cosmetics',
  personal_care: 'Personal Care',
  household: 'Household Products',
};

export const PRIORITY_LABELS: Record<SustainabilityPriority, string> = {
  ingredient_transparency: 'Ingredient Transparency',
  environmental_sustainability: 'Environmental Sustainability',
  packaging: 'Low-Waste Packaging',
  ethical_brands: 'Ethical Brands',
};

export const GRADE_LABELS: Record<EcoGrade, string> = {
  A: 'Excellent',
  B: 'Good',
  C: 'Average',
  D: 'Poor',
  E: 'Very Poor',
  INSUFFICIENT_DATA: 'Insufficient Data',
};

export function formatPriceINR(pricePaise: number | null | undefined, currency = 'INR'): string {
  if (pricePaise === null || pricePaise === undefined) return 'Price unavailable';
  const amount = pricePaise / 100;
  if (currency === 'INR') {
    const formatted = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
    return `₹${formatted}`;
  }
  return `${currency} ${amount.toFixed(2)}`;
}
