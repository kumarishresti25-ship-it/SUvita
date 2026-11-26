import {
  calculateProductDifferences,
  findGreenerAlternatives,
  generateComparisonSummary,
} from '../../shared/ecoscore.ts';
import type {
  ComparisonPayloadDTO,
  ProductDTO,
  SavedComparisonDTO,
  UserPreferencesDTO,
} from '../../shared/types.ts';
import {
  fetchCosmeticProduct,
  fetchOpenFoodFacts,
  sanitizeBarcode,
} from '../adapters/dataAdapters.ts';
import {
  createSavedComparisonRecord,
  getProductByIdOrBarcode,
  listProducts,
  upsertExternalProduct,
} from '../repository.ts';

async function resolveScannedProduct(barcodeOrId: string): Promise<ProductDTO | null> {
  const existing = await getProductByIdOrBarcode(barcodeOrId);
  if (existing) return existing;

  const clean = sanitizeBarcode(barcodeOrId);
  if (!clean) return null;

  const off = await fetchOpenFoodFacts(clean);
  if (off) return upsertExternalProduct(off);

  const obf = await fetchCosmeticProduct(clean);
  if (obf) return upsertExternalProduct(obf);

  return null;
}

export async function scanFirstProduct(barcodeOrId: string): Promise<ProductDTO> {
  const product = await resolveScannedProduct(barcodeOrId);
  if (!product) {
    throw new Error(
      `No verified product record found for "${barcodeOrId}". Try manual search or another barcode.`
    );
  }
  return product;
}

export async function scanSecondProduct(
  barcodeOrId: string,
  firstProductId?: number
): Promise<ProductDTO> {
  const product = await resolveScannedProduct(barcodeOrId);
  if (!product) {
    throw new Error(
      `No verified product record found for "${barcodeOrId}". Try manual search or another barcode.`
    );
  }
  if (firstProductId && product.id === firstProductId) {
    throw new Error(
      'This is the same product as Product A. Please scan or select a different second product to compare.'
    );
  }
  return product;
}

export async function fetchComparisonData(
  productIds: number[],
  preferences?: UserPreferencesDTO | null
): Promise<ComparisonPayloadDTO> {
  const uniqueIds = Array.from(new Set(productIds)).slice(0, 3);
  const resolved: ProductDTO[] = [];

  for (const id of uniqueIds) {
    const p = await getProductByIdOrBarcode(String(id));
    if (p) resolved.push(p);
  }

  const { metrics, ingredientDiff } = calculateProductDifferences(resolved);
  const summary = generateComparisonSummary(resolved, metrics);

  let betterAlternatives: ComparisonPayloadDTO['betterAlternatives'] = [];
  if (resolved.length >= 2) {
    const primaryCat = resolved[0].category;
    const catalog = await listProducts({ category: primaryCat });
    const filteredCatalog = catalog.filter(
      (c) => !uniqueIds.includes(c.id)
    );
    // Find alternatives better than the lowest-scored compared product in that category
    const sortedByScore = [...resolved].sort(
      (a, b) => (a.score.overallScore ?? 0) - (b.score.overallScore ?? 0)
    );
    betterAlternatives = findGreenerAlternatives(
      sortedByScore[0],
      filteredCatalog,
      preferences,
      3
    );
  }

  return {
    products: resolved,
    metrics,
    ingredientDiff,
    summary,
    betterAlternatives,
  };
}

export { calculateProductDifferences, generateComparisonSummary };

export async function saveComparison(
  uid: string,
  productIds: number[],
  title?: string
): Promise<SavedComparisonDTO> {
  const uniqueIds = Array.from(new Set(productIds)).slice(0, 3);
  if (uniqueIds.length < 2) {
    throw new Error('Select at least two distinct products to save a comparison.');
  }

  const data = await fetchComparisonData(uniqueIds);
  if (data.products.length < 2) {
    throw new Error('Both products must exist before saving a comparison.');
  }

  const autoTitle =
    title && title.trim()
      ? title.trim()
      : data.products.map((p) => p.name).join(' vs ');

  return createSavedComparisonRecord(
    uid,
    data.products[0].id,
    data.products[1].id,
    data.products[2]?.id ?? null,
    autoTitle,
    data.summary.higherRatedLabel
  );
}
