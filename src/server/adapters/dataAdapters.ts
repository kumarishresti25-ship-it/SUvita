import { GoogleGenAI } from '@google/genai';
import { calculateEcoScore } from '../../shared/ecoscore.ts';
import type {
  IngredientSafetyStatus,
  ProductCategory,
  ProductDTO,
  ProductIngredientDTO,
  ProductSourceDTO,
} from '../../shared/types.ts';

// Simple in-memory TTL cache + basic rate-limit guard for upstream public APIs
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const adapterCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes
let lastExternalRequestTs = 0;

function getCached<T>(key: string): T | null {
  const entry = adapterCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    adapterCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCached<T>(key: string, value: T): void {
  if (adapterCache.size > 500) {
    const oldestKey = adapterCache.keys().next().value;
    if (oldestKey) adapterCache.delete(oldestKey);
  }
  adapterCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function sanitizeBarcode(raw: string): string | null {
  const cleaned = raw.replace(/[\s-]/g, '').trim();
  if (!/^\d{6,18}$/.test(cleaned)) {
    return null;
  }
  return cleaned;
}

async function throttledFetch(url: string, timeoutMs = 6000): Promise<Response> {
  // Strictly allowlist public Open Food Facts / Open Beauty Facts hosts (SSRF protection)
  const parsed = new URL(url);
  const allowedHosts = new Set([
    'world.openfoodfacts.org',
    'world.openbeautyfacts.org',
  ]);
  if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname)) {
    throw new Error('Blocked request to non-allowlisted host');
  }

  const now = Date.now();
  const wait = Math.max(0, 150 - (now - lastExternalRequestTs));
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastExternalRequestTs = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SUvitaSustainabilityPlatform/1.0 (https://suvita.app)',
        Accept: 'application/json',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

// Reference dictionary for common INCI / food additive ingredients (non-medical, regulatory-grounded)
const INGREDIENT_REFERENCE: Record<
  string,
  {
    purpose: string;
    safetyStatus: IngredientSafetyStatus;
    regulatoryInfo: string;
    warningText?: string;
    sourceName: string;
  }
> = {
  water: {
    purpose: 'Solvent base',
    safetyStatus: 'verified_safe',
    regulatoryInfo: 'Standard potable or cosmetic-grade purified water.',
    sourceName: 'General Regulatory Reference',
  },
  aqua: {
    purpose: 'Cosmetic solvent base',
    safetyStatus: 'verified_safe',
    regulatoryInfo: 'Purified cosmetic-grade water listed in EU CosIng.',
    sourceName: 'EU CosIng Reference',
  },
  glycerin: {
    purpose: 'Humectant supporting moisture retention',
    safetyStatus: 'verified_safe',
    regulatoryInfo: 'Readily biodegradable humectant with well-established safety record.',
    sourceName: 'EU CosIng Reference',
  },
  niacinamide: {
    purpose: 'Skin-conditioning vitamin B3 derivative',
    safetyStatus: 'verified_safe',
    regulatoryInfo: 'Widely permitted cosmetic active with published CIR safety review.',
    sourceName: 'CIR / EU CosIng Reference',
  },
  squalane: {
    purpose: 'Emollient and moisture barrier support',
    safetyStatus: 'verified_safe',
    regulatoryInfo: 'Biodegradable emollient, commonly plant-derived from sugarcane or olive.',
    sourceName: 'EU CosIng Reference',
  },
  'citric acid': {
    purpose: 'pH adjuster and mild antioxidant',
    safetyStatus: 'verified_safe',
    regulatoryInfo: 'Permitted food additive (E330) and EPA Safer Choice ingredient.',
    sourceName: 'EFSA / EPA Safer Choice',
  },
  'palm oil': {
    purpose: 'Plant fat / texture stabilizer',
    safetyStatus: 'attention',
    regulatoryInfo: 'Permitted food/cosmetic oil; environmental impact depends heavily on RSPO deforestation-free certification.',
    warningText: 'Uncertified palm oil is linked to tropical land-use change when origin is not disclosed.',
    sourceName: 'Sustainability Commodity Reference',
  },
  'sodium lauryl sulfate': {
    purpose: 'Anionic foaming surfactant',
    safetyStatus: 'attention',
    regulatoryInfo: 'Permitted rinse-off surfactant; known skin irritant at higher concentrations in CIR review.',
    warningText: 'Can be drying or irritating on sensitive skin barriers.',
    sourceName: 'CIR / EU CosIng Reference',
  },
  'sodium laureth sulfate': {
    purpose: 'Foaming detergent surfactant',
    safetyStatus: 'attention',
    regulatoryInfo: 'Permitted surfactant; ethoxylated feedstock requires purification controls.',
    warningText: 'May feel drying for sensitive skin; petrochemical ethoxylation footprint.',
    sourceName: 'CIR / EU CosIng Reference',
  },
  phenoxyethanol: {
    purpose: 'Antimicrobial preservative',
    safetyStatus: 'attention',
    regulatoryInfo: 'Regulated under EU Cosmetics Regulation Annex V up to 1.0% maximum concentration.',
    warningText: 'Regulated concentration limit (<=1.0%); occasional mild sensitivity reported.',
    sourceName: 'EU Cosmetics Regulation Annex V',
  },
  cyclopentasiloxane: {
    purpose: 'Volatile silicone emollient',
    safetyStatus: 'attention',
    regulatoryInfo: 'Restricted under EU REACH Annex XVII due to environmental persistence (vPvB).',
    warningText: 'Persistent in aquatic environments; subject to EU regulatory restrictions.',
    sourceName: 'ECHA / EU REACH',
  },
  parfum: {
    purpose: 'Fragrance mixture',
    safetyStatus: 'limited_info',
    regulatoryInfo: 'Umbrella label term permitted under cosmetics law; full sub-ingredient breakdown typically undisclosed.',
    warningText: 'Individual scent chemicals are not fully itemized on the label.',
    sourceName: 'Cosmetic Labelling Transparency',
  },
  fragrance: {
    purpose: 'Fragrance mixture',
    safetyStatus: 'limited_info',
    regulatoryInfo: 'Umbrella label term; full sub-ingredient breakdown typically undisclosed.',
    warningText: 'Individual scent chemicals are not fully itemized on the label.',
    sourceName: 'Cosmetic Labelling Transparency',
  },
  sugar: {
    purpose: 'Sweetener',
    safetyStatus: 'attention',
    regulatoryInfo: 'Permitted food ingredient; high added sugar lowers nutritional profile.',
    warningText: 'High free sugar intake is discouraged by WHO dietary guidelines.',
    sourceName: 'WHO Nutritional Reference',
  },
  'soy lecithin': {
    purpose: 'Emulsifier',
    safetyStatus: 'verified_safe',
    regulatoryInfo: 'Permitted food emulsifier (E322); common allergen (soy).',
    sourceName: 'EFSA / FDA Reference',
  },
  'sunflower lecithin': {
    purpose: 'Plant-based emulsifier',
    safetyStatus: 'verified_safe',
    regulatoryInfo: 'Permitted food emulsifier (E322), allergen-friendly alternative to soy.',
    sourceName: 'EFSA / FDA Reference',
  },
};

function parseIngredientsFromText(
  rawText: string | undefined,
  rawList: Array<{ text?: string; id?: string }> | undefined,
  sourceName: string
): ProductIngredientDTO[] {
  const names: string[] = [];

  if (Array.isArray(rawList) && rawList.length > 0) {
    for (const item of rawList.slice(0, 28)) {
      const cleaned = (item.text || '').replace(/[_*]/g, '').trim();
      if (cleaned && cleaned.length < 90) names.push(cleaned);
    }
  } else if (rawText) {
    const parts = rawText
      .split(/,|;/)
      .map((s) => s.replace(/[_*().%0-9]+/g, ' ').replace(/\s+/g, ' ').trim())
      .filter((s) => s.length >= 2 && s.length < 80);
    names.push(...parts.slice(0, 28));
  }

  const seen = new Set<string>();
  const uniqueNames = names.filter((n) => {
    const key = n.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return uniqueNames.map((name, idx) => {
    const lower = name.toLowerCase();
    let matched: (typeof INGREDIENT_REFERENCE)[string] | undefined =
      INGREDIENT_REFERENCE[lower];

    if (!matched) {
      for (const [key, info] of Object.entries(INGREDIENT_REFERENCE)) {
        if (lower.includes(key)) {
          matched = info;
          break;
        }
      }
    }

    if (matched) {
      return {
        name,
        inciName: name.toUpperCase(),
        purpose: matched.purpose,
        safetyStatus: matched.safetyStatus,
        regulatoryInfo: matched.regulatoryInfo,
        warningText: matched.warningText || null,
        sourceName: `${sourceName} + ${matched.sourceName}`,
        position: idx,
      };
    }

    // Never fabricate ingredient safety info when unknown
    return {
      name,
      inciName: null,
      purpose: 'Disclosed product ingredient (function not specified in source)',
      safetyStatus: 'limited_info',
      regulatoryInfo:
        'Listed on product packaging; detailed regulatory profile is not yet indexed in SUvita’s verified reference table.',
      warningText: null,
      sourceName,
      position: idx,
    };
  });
}

export interface NormalizedExternalProduct {
  barcode: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  imageUrl: string | null;
  priceCents: number | null;
  packagingSummary: string | null;
  packagingType: string | null;
  originCountry: string | null;
  isSampleData: boolean;
  sourceLabel: string;
  ingredients: ProductIngredientDTO[];
  sources: ProductSourceDTO[];
  scoreInputs: {
    ingredient: { score: number | null; explanation: string; source: string };
    packaging: { score: number | null; explanation: string; source: string };
    ethics: { score: number | null; explanation: string; source: string };
    energy: { score: number | null; explanation: string; source: string };
  };
}

export function fetchPackagingInformation(raw: {
  packaging?: string;
  packaging_tags?: string[];
}): {
  score: number | null;
  summary: string | null;
  type: string | null;
  explanation: string;
  source: string;
} {
  const tags = (raw.packaging_tags || []).map((t) => t.toLowerCase());
  const text = (raw.packaging || '').toLowerCase();
  const combined = `${text} ${tags.join(' ')}`.trim();

  if (!combined) {
    return {
      score: null,
      summary: null,
      type: null,
      explanation:
        'Packaging material tags were not provided in the external product record.',
      source: 'Unavailable',
    };
  }

  let score = 55;
  let type = 'mixed_packaging';
  if (combined.includes('glass') || combined.includes('verre')) {
    score = combined.includes('return') || combined.includes('refill') ? 90 : 78;
    type = 'glass';
  } else if (combined.includes('aluminum') || combined.includes('aluminium') || combined.includes('metal') || combined.includes('can')) {
    score = 80;
    type = 'aluminum_metal';
  } else if (combined.includes('cardboard') || combined.includes('carton') || combined.includes('paper') || combined.includes('fsc')) {
    score = 74;
    type = 'paperboard';
  } else if (combined.includes('plastic') || combined.includes('plastique') || combined.includes('pet') || combined.includes('hdpe')) {
    score = combined.includes('recycled') || combined.includes('rpet') ? 62 : 42;
    type = 'plastic';
  }

  return {
    score,
    summary: raw.packaging || tags.slice(0, 3).map((t) => t.replace(/^en:/, '')).join(', '),
    type,
    explanation: `Derived from external packaging disclosures (${raw.packaging || tags.slice(0, 3).join(', ')}).`,
    source: 'Open Facts Packaging Tags',
  };
}

export function fetchBrandInformation(
  brandName: string,
  labelsTags: string[] = []
): {
  score: number | null;
  explanation: string;
  source: string;
} {
  const labels = labelsTags.map((l) => l.toLowerCase());
  const positiveCerts: string[] = [];

  if (labels.some((l) => l.includes('fair-trade') || l.includes('fairtrade'))) {
    positiveCerts.push('Fair Trade');
  }
  if (labels.some((l) => l.includes('organic') || l.includes('bio'))) {
    positiveCerts.push('Organic');
  }
  if (labels.some((l) => l.includes('rainforest-alliance') || l.includes('utz'))) {
    positiveCerts.push('Rainforest Alliance / UTZ');
  }
  if (labels.some((l) => l.includes('b-corp') || l.includes('leaping-bunny') || l.includes('cruelty-free'))) {
    positiveCerts.push('Ethical / Cruelty-Free Certification');
  }
  if (labels.some((l) => l.includes('fsc'))) {
    positiveCerts.push('FSC Certified');
  }

  if (positiveCerts.length === 0) {
    return {
      score: null,
      explanation: `No verifiable third-party ethical or sustainability certifications were found in public metadata for ${brandName || 'this brand'}.`,
      source: 'Unavailable',
    };
  }

  const score = Math.min(95, 68 + positiveCerts.length * 9);
  return {
    score,
    explanation: `Recognized third-party label disclosures present: ${positiveCerts.join(', ')}.`,
    source: 'Open Facts Label Certifications',
  };
}

function scoreIngredientsList(
  ingredients: ProductIngredientDTO[],
  additivesTags: string[] = [],
  novaGroup?: number
): { score: number | null; explanation: string; source: string } {
  if (ingredients.length === 0 && additivesTags.length === 0) {
    return {
      score: null,
      explanation: 'No ingredient list was provided in the external product record.',
      source: 'Unavailable',
    };
  }

  let score = 84;
  const attentionCount = ingredients.filter((i) => i.safetyStatus === 'attention').length;
  const limitedCount = ingredients.filter((i) => i.safetyStatus === 'limited_info').length;

  score -= attentionCount * 10;
  score -= Math.min(18, additivesTags.length * 4);
  if (novaGroup === 4) score -= 12;
  if (novaGroup === 1) score += 8;

  score = Math.max(15, Math.min(96, score));

  return {
    score,
    explanation: `${ingredients.length} disclosed ingredient(s): ${attentionCount} flagged for attention, ${limitedCount} with limited reference coverage${additivesTags.length > 0 ? `, ${additivesTags.length} listed additive code(s)` : ''}.`,
    source: 'External Ingredient List + SUvita Reference Rules',
  };
}

export async function fetchOpenFoodFacts(
  rawBarcode: string
): Promise<NormalizedExternalProduct | null> {
  const barcode = sanitizeBarcode(rawBarcode);
  if (!barcode) return null;

  const cacheKey = `off:${barcode}`;
  const cached = getCached<NormalizedExternalProduct | null>(cacheKey);
  if (cached !== null) return cached;

  try {
    const res = await throttledFetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: number; product?: Record<string, any> };
    if (data.status !== 1 || !data.product) {
      return null;
    }

    const p = data.product;
    const name = p.product_name || p.product_name_en || p.generic_name || null;
    if (!name) return null;

    const brand = (p.brands || 'Unknown Brand').split(',')[0].trim();
    const ingredients = parseIngredientsFromText(
      p.ingredients_text_en || p.ingredients_text,
      p.ingredients,
      'Open Food Facts'
    );

    const ingScoring = scoreIngredientsList(
      ingredients,
      Array.isArray(p.additives_tags) ? p.additives_tags : [],
      typeof p.nova_group === 'number' ? p.nova_group : undefined
    );
    const pkgScoring = fetchPackagingInformation({
      packaging: p.packaging,
      packaging_tags: p.packaging_tags,
    });
    const brandScoring = fetchBrandInformation(brand, p.labels_tags || []);

    let energyScore: number | null = null;
    let energyExplanation =
      'Verified lifecycle carbon / energy footprint data is unavailable in the Open Food Facts record.';
    let energySource = 'Unavailable';

    if (typeof p.ecoscore_score === 'number' && p.ecoscore_score >= 0 && p.ecoscore_score <= 100) {
      energyScore = p.ecoscore_score;
      energyExplanation = `Derived from Open Food Facts Agribalyse / Eco-Score environmental indicator (${p.ecoscore_score}/100).`;
      energySource = 'Open Food Facts Eco-Score (Agribalyse)';
    }

    const normalized: NormalizedExternalProduct = {
      barcode,
      name,
      brand,
      category: 'food_beverages',
      description:
        p.generic_name ||
        p.categories ||
        `${brand} food & beverage product retrieved live from Open Food Facts.`,
      imageUrl: p.image_front_url || p.image_url || null,
      priceCents: null,
      packagingSummary: pkgScoring.summary,
      packagingType: pkgScoring.type,
      originCountry: p.origins || p.countries || null,
      isSampleData: false,
      sourceLabel: 'Open Food Facts (Live Verified API)',
      ingredients,
      sources: [
        {
          sourceName: 'Open Food Facts',
          sourceType: 'open_food_facts',
          sourceUrl: `https://world.openfoodfacts.org/product/${barcode}`,
          licenseNote: 'Open Database License (ODbL) — live barcode lookup.',
          isVerifiedExternal: true,
        },
      ],
      scoreInputs: {
        ingredient: ingScoring,
        packaging: {
          score: pkgScoring.score,
          explanation: pkgScoring.explanation,
          source: pkgScoring.source,
        },
        ethics: brandScoring,
        energy: {
          score: energyScore,
          explanation: energyExplanation,
          source: energySource,
        },
      },
    };

    setCached(cacheKey, normalized);
    return normalized;
  } catch (err) {
    console.warn('Open Food Facts lookup failed or timed out:', (err as Error).message);
    return null;
  }
}

export async function fetchCosmeticProduct(
  rawBarcode: string
): Promise<NormalizedExternalProduct | null> {
  const barcode = sanitizeBarcode(rawBarcode);
  if (!barcode) return null;

  const cacheKey = `obf:${barcode}`;
  const cached = getCached<NormalizedExternalProduct | null>(cacheKey);
  if (cached !== null) return cached;

  try {
    const res = await throttledFetch(
      `https://world.openbeautyfacts.org/api/v2/product/${barcode}.json`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: number; product?: Record<string, any> };
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const name = p.product_name || p.product_name_en || null;
    if (!name) return null;

    const brand = (p.brands || 'Unknown Brand').split(',')[0].trim();
    const cats = (p.categories || '').toLowerCase();
    const category: ProductCategory =
      cats.includes('shampoo') || cats.includes('soap') || cats.includes('wash') || cats.includes('toothpaste')
        ? 'personal_care'
        : 'beauty_cosmetics';

    const ingredients = parseIngredientsFromText(
      p.ingredients_text_en || p.ingredients_text,
      p.ingredients,
      'Open Beauty Facts (INCI)'
    );
    const ingScoring = scoreIngredientsList(ingredients, []);
    const pkgScoring = fetchPackagingInformation({
      packaging: p.packaging,
      packaging_tags: p.packaging_tags,
    });
    const brandScoring = fetchBrandInformation(brand, p.labels_tags || []);

    const normalized: NormalizedExternalProduct = {
      barcode,
      name,
      brand,
      category,
      description:
        p.generic_name ||
        p.categories ||
        `${brand} cosmetic/personal care item retrieved live from Open Beauty Facts.`,
      imageUrl: p.image_front_url || p.image_url || null,
      priceCents: null,
      packagingSummary: pkgScoring.summary,
      packagingType: pkgScoring.type,
      originCountry: p.origins || p.countries || null,
      isSampleData: false,
      sourceLabel: 'Open Beauty Facts (Live Verified API)',
      ingredients,
      sources: [
        {
          sourceName: 'Open Beauty Facts',
          sourceType: 'inci_reference',
          sourceUrl: `https://world.openbeautyfacts.org/product/${barcode}`,
          licenseNote: 'Open Database License (ODbL) — live INCI lookup.',
          isVerifiedExternal: true,
        },
      ],
      scoreInputs: {
        ingredient: ingScoring,
        packaging: {
          score: pkgScoring.score,
          explanation: pkgScoring.explanation,
          source: pkgScoring.source,
        },
        ethics: brandScoring,
        energy: {
          score: null,
          explanation:
            'Manufacturing energy footprint is unavailable in Open Beauty Facts.',
          source: 'Unavailable',
        },
      },
    };

    setCached(cacheKey, normalized);
    return normalized;
  } catch (err) {
    console.warn('Open Beauty Facts lookup failed or timed out:', (err as Error).message);
    return null;
  }
}

export async function searchOpenFoodFactsByName(
  query: string
): Promise<Array<{ barcode: string; name: string; brand: string; imageUrl: string | null; source: string }>> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const cacheKey = `off-search:${trimmed.toLowerCase()}`;
  const cached = getCached<Array<{ barcode: string; name: string; brand: string; imageUrl: string | null; source: string }>>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
      trimmed
    )}&search_simple=1&action=process&json=1&page_size=6&fields=code,product_name,brands,image_small_url`;
    const res = await throttledFetch(url, 5000);
    if (!res.ok) return [];
    const data = (await res.json()) as { products?: Array<Record<string, any>> };
    const results = (data.products || [])
      .filter((p) => p.code && p.product_name && /^\d{6,18}$/.test(String(p.code)))
      .slice(0, 6)
      .map((p) => ({
        barcode: String(p.code),
        name: String(p.product_name),
        brand: String(p.brands || 'Unknown Brand').split(',')[0].trim(),
        imageUrl: p.image_small_url ? String(p.image_small_url) : null,
        source: 'Open Food Facts (Live)',
      }));

    setCached(cacheKey, results);
    return results;
  } catch {
    return [];
  }
}

/**
 * Server-side Gemini AI plain-language sustainability explainer strictly grounded in verified product attributes.
 */
export async function generateGroundedProductBrief(product: ProductDTO): Promise<{
  summary: string;
  keyTakeaways: string[];
  caveat: string;
  generatedByAi: boolean;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    // Transparent deterministic fallback if GEMINI_API_KEY is not configured in environment
    const available = product.score.dimensions
      .filter((d) => d.available)
      .map((d) => `${d.label} scored ${Math.round(d.score as number)}/100`);
    const missing = product.score.dimensions
      .filter((d) => !d.available)
      .map((d) => d.label);

    return {
      summary: `${product.name} by ${product.brand} holds an EcoScore of ${
        product.score.overallScore !== null
          ? `${product.score.overallScore.toFixed(1)}/100 (Grade ${product.score.grade})`
          : 'Insufficient Data'
      } with ${product.score.confidencePercent}% data confidence.`,
      keyTakeaways: [
        ...available.slice(0, 2),
        missing.length > 0
          ? `Missing data: ${missing.join(', ')} (not estimated or invented).`
          : `All four weighted sustainability dimensions have disclosed data.`,
      ],
      caveat:
        'Based strictly on retrieved product disclosures and regulatory reference rules. Not medical or diagnostic advice.',
      generatedByAi: false,
    };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const payload = {
    name: product.name,
    brand: product.brand,
    category: product.category,
    isSampleData: product.isSampleData,
    overallScore: product.score.overallScore,
    grade: product.score.grade,
    confidencePercent: product.score.confidencePercent,
    dimensions: product.score.dimensions.map((d) => ({
      label: d.label,
      weightPercent: d.weightPercent,
      score: d.score,
      available: d.available,
      explanation: d.explanation,
    })),
    ingredients: product.ingredients.slice(0, 12).map((i) => ({
      name: i.name,
      safetyStatus: i.safetyStatus,
      warningText: i.warningText,
    })),
  };

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Analyze this sustainability product record and return strict JSON with keys "summary" (2 plain-language sentences), "keyTakeaways" (array of 3 concise factual strings), and "caveat" (1 short transparency note). NEVER invent missing attributes, NEVER fabricate carbon/water savings, and NEVER make medical diagnoses. Record: ${JSON.stringify(
      payload
    )}`,
    config: {
      systemInstruction:
        'You are SUvita’s transparent sustainability analyst. Use clear, approachable everyday language. Distinguish verified facts from missing information. Never make medical claims.',
      responseMimeType: 'application/json',
    },
  });

  const text = (response.text || '{}').trim();
  const parsed = JSON.parse(text) as {
    summary?: string;
    keyTakeaways?: string[];
    caveat?: string;
  };

  return {
    summary:
      parsed.summary ||
      `${product.name} carries a Grade ${product.score.grade} rating at ${product.score.confidencePercent}% data confidence.`,
    keyTakeaways: Array.isArray(parsed.keyTakeaways)
      ? parsed.keyTakeaways.slice(0, 4)
      : [],
    caveat:
      parsed.caveat ||
      'Generated strictly from available product disclosures; not medical or diagnostic advice.',
    generatedByAi: true,
  };
}

export function buildScoreFromNormalized(item: NormalizedExternalProduct) {
  return calculateEcoScore({
    ingredientSafety: item.scoreInputs.ingredient,
    packagingType: item.scoreInputs.packaging,
    brandEthics: item.scoreInputs.ethics,
    energyFootprint: item.scoreInputs.energy,
  });
}
