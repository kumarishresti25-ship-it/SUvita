import { GoogleGenAI, Type } from '@google/genai';
import {
  calculateProductDifferences,
  findGreenerAlternatives,
  generateComparisonSummary,
} from '../../shared/ecoscore.ts';
import type {
  AIStructuredResponseDTO,
  ProductDTO,
  UserPreferencesDTO,
} from '../../shared/types.ts';
import { formatPriceINR, PRIORITY_LABELS } from '../../shared/types.ts';
import { getProductByIdOrBarcode, listProducts } from '../repository.ts';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'SUvita AI is currently unavailable because GEMINI_API_KEY is not configured in the server environment.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function summarizeProductForPrompt(p: ProductDTO) {
  return {
    id: p.id,
    barcode: p.barcode,
    name: p.name,
    brand: p.brand,
    category: p.category,
    priceINR: p.priceCents !== null ? formatPriceINR(p.priceCents, p.currency) : 'Price unavailable',
    priceRupeesNumeric: p.priceCents !== null ? Math.round(p.priceCents / 100) : null,
    originCountry: p.originCountry,
    packagingSummary: p.packagingSummary,
    isSampleData: p.isSampleData,
    sourceLabel: p.sourceLabel,
    suvitaScore: p.score.overallScore,
    grade: p.score.grade,
    gradeLabel: p.score.gradeLabel,
    confidencePercent: p.score.confidencePercent,
    missingNotice: p.score.missingNotice,
    strongestFactor: p.score.strongestFactor,
    weakestFactor: p.score.weakestFactor,
    dimensions: p.score.dimensions.map((d) => ({
      label: d.label,
      weightPercent: d.weightPercent,
      score: d.score,
      available: d.available,
      explanation: d.explanation,
      source: d.source,
    })),
    ingredients: p.ingredients.map((i) => ({
      name: i.name,
      inciName: i.inciName,
      purpose: i.purpose,
      safetyStatus: i.safetyStatus,
      regulatoryInfo: i.regulatoryInfo,
      warningText: i.warningText,
      sourceName: i.sourceName,
    })),
  };
}

function detectIntent(
  message: string,
  hasContextProduct: boolean,
  comparisonCount: number
): AIStructuredResponseDTO['responseType'] {
  const lower = message.toLowerCase();
  if (comparisonCount >= 2 || /\b(compare|versus|vs\.?|better choice between|which product)\b/.test(lower)) {
    return 'comparison';
  }
  if (/\b(ingredient|inci|sulfate|sls|sles|paraben|phenoxyethanol|silicone|palmolein|fragrance|parfum|citric|niacinamide|squalane|limonene|hypochlorite|ins 476)\b/.test(lower)) {
    return 'ingredient_explainer';
  }
  if (/\b(under|₹|rs\.?|rupee|budget|recommend|suggest|find me|show me|need a|looking for|alternative|swap|grade a|a or b)\b/.test(lower)) {
    return 'shopping_advisor';
  }
  if (hasContextProduct) {
    return 'product_analysis';
  }
  return 'general';
}

function extractBudgetRupees(message: string): number | null {
  const match = message.match(/(?:under|below|less than|within|max|upto|up to)\s*(?:₹|rs\.?|inr)?\s*(\d{2,5})/i);
  if (match) return Number(match[1]);
  const rupeeMatch = message.match(/(?:₹|rs\.?)\s*(\d{2,5})/i);
  if (rupeeMatch) return Number(rupeeMatch[1]);
  return null;
}

export async function generateShoppingRecommendations(
  query: string,
  preferences?: UserPreferencesDTO | null
): Promise<ProductDTO[]> {
  const all = await listProducts({ sort: 'score_desc' });
  const lower = query.toLowerCase();
  const maxRupees = extractBudgetRupees(query);

  let filtered = all;

  if (maxRupees !== null) {
    filtered = filtered.filter(
      (p) => p.priceCents !== null && p.priceCents / 100 <= maxRupees
    );
  }

  if (/\b(a or b|top rated|sustainable|high score|grade a|best)\b/.test(lower)) {
    const ab = filtered.filter((p) => p.score.grade === 'A' || p.score.grade === 'B');
    if (ab.length > 0) filtered = ab;
  }

  if (/\b(transparent|full data|high confidence|100%)\b/.test(lower)) {
    const highConf = filtered.filter((p) => p.score.confidencePercent >= 90);
    if (highConf.length > 0) filtered = highConf;
  }

  // Keyword / category matching
  const keywords: Array<{ regex: RegExp; filter: (p: ProductDTO) => boolean }> = [
    {
      regex: /\b(shampoo|hair|wash|soap|body wash|cleanser)\b/,
      filter: (p) =>
        p.category === 'personal_care' ||
        p.name.toLowerCase().includes('shampoo') ||
        p.name.toLowerCase().includes('wash'),
    },
    {
      regex: /\b(chocolate|cacao|choco|snack|sweet)\b/,
      filter: (p) =>
        p.name.toLowerCase().includes('chocol') ||
        p.name.toLowerCase().includes('choco') ||
        p.description.toLowerCase().includes('cacao'),
    },
    {
      regex: /\b(oat|milk|granola|food|beverage|drink)\b/,
      filter: (p) => p.category === 'food_beverages',
    },
    {
      regex: /\b(serum|skin|primer|beauty|cosmetic|vitamin c|face)\b/,
      filter: (p) => p.category === 'beauty_cosmetics',
    },
    {
      regex: /\b(cleaner|spray|bleach|household|kitchen|surface|detergent)\b/,
      filter: (p) => p.category === 'household',
    },
  ];

  for (const kw of keywords) {
    if (kw.regex.test(lower)) {
      const matched = filtered.filter(kw.filter);
      if (matched.length > 0) {
        filtered = matched;
        break;
      }
    }
  }

  // Boost based on user preferences
  const priorities = preferences?.priorities || [];
  const prefCats = preferences?.preferredCategories || [];

  const ranked = [...filtered].sort((a, b) => {
    let scoreA = a.score.overallScore ?? 0;
    let scoreB = b.score.overallScore ?? 0;
    if (prefCats.includes(a.category)) scoreA += 4;
    if (prefCats.includes(b.category)) scoreB += 4;
    if (priorities.includes('packaging')) {
      scoreA += (a.score.packagingScore ?? 0) * 0.1;
      scoreB += (b.score.packagingScore ?? 0) * 0.1;
    }
    if (priorities.includes('ingredient_transparency')) {
      scoreA += (a.score.ingredientScore ?? 0) * 0.1;
      scoreB += (b.score.ingredientScore ?? 0) * 0.1;
    }
    return scoreB - scoreA;
  });

  return ranked.slice(0, 6);
}

export async function findAlternatives(
  productId: number,
  preferences?: UserPreferencesDTO | null
) {
  const target = await getProductByIdOrBarcode(String(productId));
  if (!target) return [];
  const catalog = await listProducts({ category: target.category });
  return findGreenerAlternatives(target, catalog, preferences, 3);
}

async function runStructuredGeminiPrompt(params: {
  userMessage: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  contextBlock: Record<string, unknown>;
  candidateProducts: ProductDTO[];
  responseType: AIStructuredResponseDTO['responseType'];
  preferences?: UserPreferencesDTO | null;
}): Promise<AIStructuredResponseDTO> {
  const ai = getGeminiClient();

  const prioritySummary =
    params.preferences?.priorities?.length
      ? params.preferences.priorities.map((p) => PRIORITY_LABELS[p] || p).join(', ')
      : 'Balanced sustainability (ingredients, packaging, brand ethics, energy)';

  const systemInstruction = `You are SUvita AI, a personal green shopping assistant based in India (prices in Indian Rupees ₹).
CRITICAL RULES:
1. NEVER invent products, prices, certifications, ingredients, or sustainability scores.
2. ONLY cite SUvita Scores, grades, and dimensions provided in the JSON context (calculated by SUvita's deterministic 40/30/20/10 scoring engine).
3. ALWAYS clearly distinguish: (a) verified product database information, (b) general educational/AI guidance, and (c) unavailable/missing product data.
4. NEVER make medical diagnoses or claim an ingredient is guaranteed harmful or completely safe; stick to regulatory facts (FSSAI, BIS, EU CosIng, ECHA, CIR, EPA Safer Choice) and plain consumer language.
5. Respect the user's sustainability priorities: ${prioritySummary}.
6. When recommending products, ONLY return product IDs that exist in the provided "availableProducts" array, with honest reasons grounded in their real attributes and INR prices.
7. When comparing products, never declare one better solely on overall score; explain concrete trade-offs (e.g., packaging vs. price in ₹, missing data confidence).`;

  const historyLines = params.history
    .slice(-8)
    .map((h) => `${h.role === 'user' ? 'User' : 'SUvita AI'}: ${h.content}`)
    .join('\n');

  const prompt = `${historyLines ? `Recent conversation:\n${historyLines}\n\n` : ''}Current user question: ${params.userMessage}

Retrieved SUvita Database Context (ground truth — do not contradict or invent beyond this):
${JSON.stringify(params.contextBlock)}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          explanation: {
            type: Type.STRING,
            description: 'Clear, helpful, consumer-friendly answer in 2-4 sentences.',
          },
          keyFindings: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3-5 concise factual bullet points grounded in retrieved product data.',
          },
          recommendedProductEntries: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                productId: { type: Type.INTEGER },
                reason: { type: Type.STRING },
              },
              required: ['productId', 'reason'],
            },
            description: 'Relevant products from availableProducts by exact numeric productId and factual reason.',
          },
          comparisonHighlights: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                dimension: { type: Type.STRING },
                leader: { type: Type.STRING },
                note: { type: Type.STRING },
              },
              required: ['dimension', 'leader', 'note'],
            },
            description: 'Optional comparison breakdown rows when comparing 2+ products.',
          },
          dataLimitations: {
            type: Type.STRING,
            description: 'Explicit note distinguishing verified product records, demo catalog markers, missing data, or general guidance.',
          },
          sources: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Source attributions cited from the context.',
          },
          followUpSuggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3 short, relevant follow-up questions the user can click next.',
          },
        },
        required: [
          'explanation',
          'keyFindings',
          'recommendedProductEntries',
          'dataLimitations',
          'sources',
          'followUpSuggestions',
        ],
      },
    },
  });

  const rawText = (response.text || '{}').trim();
  const parsed = JSON.parse(rawText) as {
    explanation?: string;
    keyFindings?: string[];
    recommendedProductEntries?: Array<{ productId: number; reason: string }>;
    comparisonHighlights?: Array<{ dimension: string; leader: string; note: string }>;
    dataLimitations?: string;
    sources?: string[];
    followUpSuggestions?: string[];
  };

  const productMap = new Map(params.candidateProducts.map((p) => [p.id, p]));
  const recommendedProducts: AIStructuredResponseDTO['recommendedProducts'] = [];
  const seenIds = new Set<number>();

  for (const entry of parsed.recommendedProductEntries || []) {
    const prod = productMap.get(Number(entry.productId));
    if (prod && !seenIds.has(prod.id)) {
      seenIds.add(prod.id);
      recommendedProducts.push({
        product: prod,
        reason: entry.reason || `Grade ${prod.score.grade} sustainability match`,
      });
    }
  }

  return {
    explanation: parsed.explanation || 'Here is what SUvita found based on verified product records.',
    keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings.slice(0, 5) : [],
    recommendedProducts: recommendedProducts.slice(0, 4),
    comparisonHighlights: Array.isArray(parsed.comparisonHighlights)
      ? parsed.comparisonHighlights.slice(0, 6)
      : undefined,
    dataLimitations:
      parsed.dataLimitations ||
      'Scores are computed by SUvita EcoScore v1.0 from available disclosures; missing dimensions are never estimated.',
    sources: Array.isArray(parsed.sources) ? parsed.sources.slice(0, 5) : ['SUvita Product Database'],
    followUpSuggestions:
      Array.isArray(parsed.followUpSuggestions) && parsed.followUpSuggestions.length > 0
        ? parsed.followUpSuggestions.slice(0, 3)
        : ['Explain the ingredients', 'Find a better alternative', 'Compare two products'],
    responseType: params.responseType,
  };
}

export async function explainProduct(
  productId: number,
  userQuestion?: string,
  preferences?: UserPreferencesDTO | null
): Promise<AIStructuredResponseDTO> {
  const product = await getProductByIdOrBarcode(String(productId));
  if (!product) throw new Error('Product not found');
  const alternatives = await findAlternatives(product.id, preferences);
  const candidateProducts = [product, ...alternatives.map((a) => a.product)];

  return runStructuredGeminiPrompt({
    userMessage: userQuestion || `Explain ${product.name}'s SUvita Score, ingredients, strengths, weaknesses, and any missing data.`,
    history: [],
    contextBlock: {
      focusedProduct: summarizeProductForPrompt(product),
      greenerAlternatives: alternatives.map((a) => ({
        product: summarizeProductForPrompt(a.product),
        scoreDelta: a.scoreDelta,
        reason: a.mainReason,
      })),
      availableProducts: candidateProducts.map(summarizeProductForPrompt),
    },
    candidateProducts,
    responseType: 'product_analysis',
    preferences,
  });
}

export async function explainIngredient(
  ingredientQuery: string,
  contextProduct?: ProductDTO | null,
  preferences?: UserPreferencesDTO | null
): Promise<AIStructuredResponseDTO> {
  const allProducts = await listProducts({ sort: 'score_desc' });
  const q = ingredientQuery.toLowerCase();
  const matchingIngredients = [];

  const searchPool = contextProduct ? [contextProduct, ...allProducts] : allProducts;
  const seen = new Set<string>();
  for (const p of searchPool) {
    for (const ing of p.ingredients) {
      const key = ing.name.toLowerCase();
      if (!seen.has(key) && (q.includes(key) || key.includes(q) || (ing.inciName && q.includes(ing.inciName.toLowerCase())))) {
        seen.add(key);
        matchingIngredients.push({
          ...ing,
          foundInProduct: p.name,
        });
      }
    }
  }

  const candidateProducts = contextProduct ? [contextProduct] : [];

  return runStructuredGeminiPrompt({
    userMessage: ingredientQuery,
    history: [],
    contextBlock: {
      focusedProduct: contextProduct ? summarizeProductForPrompt(contextProduct) : null,
      matchedDatabaseIngredients: matchingIngredients.slice(0, 8),
      guidanceNote:
        'Explain purpose, common uses, regulatory info (FSSAI/BIS/EU CosIng/ECHA/CIR), environmental considerations, and data limitations in plain consumer language without medical diagnoses.',
      availableProducts: candidateProducts.map(summarizeProductForPrompt),
    },
    candidateProducts,
    responseType: 'ingredient_explainer',
    preferences,
  });
}

export async function compareProducts(
  productIds: number[],
  userQuestion?: string,
  preferences?: UserPreferencesDTO | null
): Promise<AIStructuredResponseDTO> {
  const resolved: ProductDTO[] = [];
  for (const id of Array.from(new Set(productIds)).slice(0, 3)) {
    const p = await getProductByIdOrBarcode(String(id));
    if (p) resolved.push(p);
  }
  if (resolved.length < 2) {
    throw new Error('At least two products are required for AI comparison.');
  }

  const { metrics, ingredientDiff } = calculateProductDifferences(resolved);
  const summary = generateComparisonSummary(resolved, metrics);
  const catalog = await listProducts({ category: resolved[0].category });
  const thirdAlts = findGreenerAlternatives(
    resolved[0],
    catalog.filter((c) => !productIds.includes(c.id)),
    preferences,
    2
  );
  const candidateProducts = [...resolved, ...thirdAlts.map((a) => a.product)];

  return runStructuredGeminiPrompt({
    userMessage:
      userQuestion ||
      `Compare ${resolved.map((p) => p.name).join(' vs ')} across ingredients, packaging, brand ethics, energy footprint, INR price, and data confidence, and explain trade-offs.`,
    history: [],
    contextBlock: {
      comparedProducts: resolved.map(summarizeProductForPrompt),
      deterministicComparisonMetrics: metrics,
      ingredientDifferences: ingredientDiff,
      deterministicSummary: summary,
      potentialBetterThirdAlternatives: thirdAlts.map((a) => ({
        product: summarizeProductForPrompt(a.product),
        reason: a.mainReason,
      })),
      availableProducts: candidateProducts.map(summarizeProductForPrompt),
    },
    candidateProducts,
    responseType: 'comparison',
    preferences,
  });
}

export async function askSuvitaAI(params: {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  contextProductId?: number | null;
  contextComparisonIds?: number[] | null;
  preferences?: UserPreferencesDTO | null;
}): Promise<AIStructuredResponseDTO> {
  const history = params.history || [];
  let contextProduct: ProductDTO | null = null;
  if (params.contextProductId) {
    contextProduct = await getProductByIdOrBarcode(String(params.contextProductId));
  }

  const comparisonProducts: ProductDTO[] = [];
  if (Array.isArray(params.contextComparisonIds) && params.contextComparisonIds.length >= 2) {
    for (const id of params.contextComparisonIds.slice(0, 3)) {
      const p = await getProductByIdOrBarcode(String(id));
      if (p) comparisonProducts.push(p);
    }
  }

  const intent = detectIntent(
    params.message,
    Boolean(contextProduct),
    comparisonProducts.length
  );

  // Gather grounded product pool from PostgreSQL
  const [recommendedPool, allCatalog] = await Promise.all([
    generateShoppingRecommendations(params.message, params.preferences),
    listProducts({ sort: 'score_desc' }),
  ]);

  let alternatives: ReturnType<typeof findGreenerAlternatives> = [];
  if (contextProduct) {
    alternatives = findGreenerAlternatives(
      contextProduct,
      allCatalog,
      params.preferences,
      3
    );
  }

  let comparisonContext: Record<string, unknown> | null = null;
  if (comparisonProducts.length >= 2) {
    const { metrics, ingredientDiff } = calculateProductDifferences(comparisonProducts);
    const summary = generateComparisonSummary(comparisonProducts, metrics);
    comparisonContext = {
      comparedProducts: comparisonProducts.map(summarizeProductForPrompt),
      metrics,
      ingredientDiff,
      summary,
    };
  }

  // Merge unique candidate products so AI can reference any relevant real product card
  const candidateMap = new Map<number, ProductDTO>();
  if (contextProduct) candidateMap.set(contextProduct.id, contextProduct);
  for (const p of comparisonProducts) candidateMap.set(p.id, p);
  for (const a of alternatives) candidateMap.set(a.product.id, a.product);
  for (const p of recommendedPool) candidateMap.set(p.id, p);
  for (const p of allCatalog.slice(0, 8)) candidateMap.set(p.id, p);
  const candidateProducts = Array.from(candidateMap.values());

  return runStructuredGeminiPrompt({
    userMessage: params.message,
    history,
    contextBlock: {
      region: 'India (INR ₹ pricing, FSSAI/BIS/EPR context)',
      focusedProduct: contextProduct ? summarizeProductForPrompt(contextProduct) : null,
      focusedProductAlternatives: alternatives.map((a) => ({
        productId: a.product.id,
        name: a.product.name,
        scoreDelta: a.scoreDelta,
        reason: a.mainReason,
      })),
      comparisonContext,
      matchedCatalogProducts: recommendedPool.map(summarizeProductForPrompt),
      availableProducts: candidateProducts.map(summarizeProductForPrompt),
    },
    candidateProducts,
    responseType: intent,
    preferences: params.preferences,
  });
}
