import type {
  AlternativeRecommendationDTO,
  DimensionBreakdown,
  EcoGrade,
  IngredientDiffDTO,
  ProductDifferenceMetric,
  ProductDTO,
  SmartComparisonSummaryDTO,
  SustainabilityScoreDTO,
  UserPreferencesDTO,
} from './types.ts';
import { formatPriceINR, GRADE_LABELS } from './types.ts';

export interface EcoScoreWeights {
  ingredientSafety: number;
  packagingType: number;
  brandEthics: number;
  energyFootprint: number;
}

export interface EcoGradeThresholds {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
}

export interface EcoScoreConfig {
  weights: EcoScoreWeights;
  thresholds: EcoGradeThresholds;
  minimumWeightForRating: number;
  methodologyVersion: string;
}

export const DEFAULT_ECOSCORE_CONFIG: EcoScoreConfig = {
  weights: {
    ingredientSafety: 0.4,
    packagingType: 0.3,
    brandEthics: 0.2,
    energyFootprint: 0.1,
  },
  thresholds: {
    A: 80,
    B: 65,
    C: 50,
    D: 35,
    E: 0,
  },
  minimumWeightForRating: 0.5,
  methodologyVersion: 'SUvita-EcoScore-v1.0',
};

export interface EcoScoreInputs {
  ingredientSafety: {
    score: number | null;
    explanation?: string;
    source?: string;
  };
  packagingType: {
    score: number | null;
    explanation?: string;
    source?: string;
  };
  brandEthics: {
    score: number | null;
    explanation?: string;
    source?: string;
  };
  energyFootprint: {
    score: number | null;
    explanation?: string;
    source?: string;
  };
}

function clampScore(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

export function scoreToGrade(
  score: number | null,
  thresholds: EcoGradeThresholds = DEFAULT_ECOSCORE_CONFIG.thresholds
): EcoGrade {
  if (score === null || Number.isNaN(score)) {
    return 'INSUFFICIENT_DATA';
  }
  if (score >= thresholds.A) return 'A';
  if (score >= thresholds.B) return 'B';
  if (score >= thresholds.C) return 'C';
  if (score >= thresholds.D) return 'D';
  return 'E';
}

export function getConfidenceLevel(
  confidencePercent: number
): 'High' | 'Moderate' | 'Low' | 'Insufficient' {
  if (confidencePercent >= 90) return 'High';
  if (confidencePercent >= 70) return 'Moderate';
  if (confidencePercent >= 50) return 'Low';
  return 'Insufficient';
}

/**
 * Transparent weighted SUvita EcoScore calculation engine.
 * Formula: (Ingredient Safety × 0.40) + (Packaging Type × 0.30) + (Brand Ethics × 0.20) + (Energy Footprint × 0.10)
 */
export function calculateEcoScore(
  inputs: EcoScoreInputs,
  config: EcoScoreConfig = DEFAULT_ECOSCORE_CONFIG
): SustainabilityScoreDTO {
  const ingScore = clampScore(inputs.ingredientSafety.score);
  const pkgScore = clampScore(inputs.packagingType.score);
  const ethScore = clampScore(inputs.brandEthics.score);
  const engScore = clampScore(inputs.energyFootprint.score);

  const dimensions: DimensionBreakdown[] = [
    {
      key: 'ingredientSafety',
      label: 'Ingredient Safety',
      weight: config.weights.ingredientSafety,
      weightPercent: Math.round(config.weights.ingredientSafety * 100),
      score: ingScore,
      weightedContribution:
        ingScore !== null
          ? Math.round(ingScore * config.weights.ingredientSafety * 10) / 10
          : null,
      available: ingScore !== null,
      explanation:
        inputs.ingredientSafety.explanation ||
        (ingScore !== null
          ? 'Evaluated from available ingredient disclosures and regulatory references.'
          : 'Ingredient safety data is unavailable from verified sources for this product.'),
      source:
        inputs.ingredientSafety.source ||
        (ingScore !== null ? 'Product Disclosure' : 'Unavailable'),
    },
    {
      key: 'packagingType',
      label: 'Packaging Type',
      weight: config.weights.packagingType,
      weightPercent: Math.round(config.weights.packagingType * 100),
      score: pkgScore,
      weightedContribution:
        pkgScore !== null
          ? Math.round(pkgScore * config.weights.packagingType * 10) / 10
          : null,
      available: pkgScore !== null,
      explanation:
        inputs.packagingType.explanation ||
        (pkgScore !== null
          ? 'Evaluated based on primary packaging material, recyclability, and refill potential.'
          : 'Packaging material details are not yet disclosed in available sources.'),
      source:
        inputs.packagingType.source ||
        (pkgScore !== null ? 'Packaging Registry' : 'Unavailable'),
    },
    {
      key: 'brandEthics',
      label: 'Brand Ethics',
      weight: config.weights.brandEthics,
      weightPercent: Math.round(config.weights.brandEthics * 100),
      score: ethScore,
      weightedContribution:
        ethScore !== null
          ? Math.round(ethScore * config.weights.brandEthics * 10) / 10
          : null,
      available: ethScore !== null,
      explanation:
        inputs.brandEthics.explanation ||
        (ethScore !== null
          ? 'Assessed using public sustainability reporting, certifications, and supply chain transparency.'
          : 'No verifiable brand ethics or third-party certification record was found.'),
      source:
        inputs.brandEthics.source ||
        (ethScore !== null ? 'Brand Transparency Record' : 'Unavailable'),
    },
    {
      key: 'energyFootprint',
      label: 'Energy Footprint',
      weight: config.weights.energyFootprint,
      weightPercent: Math.round(config.weights.energyFootprint * 100),
      score: engScore,
      weightedContribution:
        engScore !== null
          ? Math.round(engScore * config.weights.energyFootprint * 10) / 10
          : null,
      available: engScore !== null,
      explanation:
        inputs.energyFootprint.explanation ||
        (engScore !== null
          ? 'Based on disclosed manufacturing energy indicators, regional sourcing, or Eco-Score LCA markers.'
          : 'Lifecycle energy and manufacturing emissions data is unavailable for this item.'),
      source:
        inputs.energyFootprint.source ||
        (engScore !== null ? 'Lifecycle Indicator' : 'Unavailable'),
    },
  ];

  const availableDims = dimensions.filter((d) => d.available && d.score !== null);
  const availableWeightSum = availableDims.reduce((acc, d) => acc + d.weight, 0);
  const confidencePercent = Math.round(availableWeightSum * 100);
  const confidenceLevel = getConfidenceLevel(confidencePercent);

  const rawWeightedSum = availableDims.reduce(
    (acc, d) => acc + (d.score as number) * d.weight,
    0
  );

  let overallScore: number | null = null;
  let observedSubscoreAverage: number | null = null;

  if (availableWeightSum > 0) {
    observedSubscoreAverage =
      Math.round((rawWeightedSum / availableWeightSum) * 10) / 10;
  }

  if (availableWeightSum >= config.minimumWeightForRating) {
    overallScore = Math.round(rawWeightedSum * 10) / 10;
  }

  const grade = scoreToGrade(overallScore, config.thresholds);
  const missingDims = dimensions.filter((d) => !d.available);

  let strongestFactor: string | null = null;
  let weakestFactor: string | null = null;

  if (availableDims.length > 0) {
    const sorted = [...availableDims].sort(
      (a, b) => (b.score as number) - (a.score as number)
    );
    strongestFactor = `${sorted[0].label} (${Math.round(sorted[0].score as number)}/100)`;
    const lowest = sorted[sorted.length - 1];
    weakestFactor = `${lowest.label} (${Math.round(lowest.score as number)}/100)`;
  }

  let missingNotice: string | null = null;
  if (missingDims.length > 0) {
    const names = missingDims.map((d) => `${d.label} (${d.weightPercent}%)`).join(', ');
    if (overallScore === null) {
      missingNotice = `Rating withheld because essential data is missing (${names}). Confidence is ${confidencePercent}%, below the 50% threshold required for a SUvita Score grade.`;
    } else {
      missingNotice = `Missing data for ${names} reduces confidence to ${confidencePercent}%. Missing dimensions are never treated as zero or silently redistributed.`;
    }
  }

  return {
    overallScore,
    observedSubscoreAverage,
    grade,
    gradeLabel: GRADE_LABELS[grade],
    ingredientScore: ingScore,
    packagingScore: pkgScore,
    brandEthicsScore: ethScore,
    energyScore: engScore,
    confidencePercent,
    confidenceLevel,
    availableDimensions: availableDims.length,
    dimensions,
    strongestFactor,
    weakestFactor,
    methodologyVersion: config.methodologyVersion,
    missingNotice,
  };
}

export function findGreenerAlternatives(
  target: ProductDTO,
  catalog: ProductDTO[],
  preferences?: Partial<UserPreferencesDTO> | null,
  limit = 4
): AlternativeRecommendationDTO[] {
  const targetScore = target.score.overallScore ?? 0;
  const userPriorities = preferences?.priorities ?? [];

  const sameCategory = catalog.filter(
    (candidate) =>
      candidate.id !== target.id &&
      candidate.barcode !== target.barcode &&
      candidate.category === target.category &&
      candidate.score.overallScore !== null &&
      candidate.score.overallScore > targetScore
  );

  const scored = sameCategory.map((candidate) => {
    const candScore = candidate.score.overallScore ?? 0;
    const scoreDelta = Math.round((candScore - targetScore) * 10) / 10;

    let preferenceBonus = 0;
    const highlights: string[] = [];

    if (
      candidate.score.ingredientScore !== null &&
      (target.score.ingredientScore === null ||
        candidate.score.ingredientScore > target.score.ingredientScore + 5)
    ) {
      highlights.push(
        `Cleaner ingredient profile (${Math.round(candidate.score.ingredientScore)}/100)`
      );
      if (userPriorities.includes('ingredient_transparency')) {
        preferenceBonus += 8;
      }
    }

    if (
      candidate.score.packagingScore !== null &&
      (target.score.packagingScore === null ||
        candidate.score.packagingScore > target.score.packagingScore + 5)
    ) {
      highlights.push(
        `Lower-waste packaging (${Math.round(candidate.score.packagingScore)}/100)`
      );
      if (userPriorities.includes('packaging')) {
        preferenceBonus += 8;
      }
    }

    if (
      candidate.score.brandEthicsScore !== null &&
      (target.score.brandEthicsScore === null ||
        candidate.score.brandEthicsScore > target.score.brandEthicsScore + 5)
    ) {
      highlights.push(
        `Stronger brand transparency (${Math.round(candidate.score.brandEthicsScore)}/100)`
      );
      if (userPriorities.includes('ethical_brands')) {
        preferenceBonus += 7;
      }
    }

    if (
      candidate.score.energyScore !== null &&
      (target.score.energyScore === null ||
        candidate.score.energyScore > target.score.energyScore + 5)
    ) {
      highlights.push(
        `Lower energy footprint (${Math.round(candidate.score.energyScore)}/100)`
      );
      if (userPriorities.includes('environmental_sustainability')) {
        preferenceBonus += 7;
      }
    }

    if (highlights.length === 0) {
      highlights.push(
        `+${scoreDelta} points higher overall SUvita Score with ${candidate.score.confidencePercent}% data confidence`
      );
    }

    const mainReason =
      preferenceBonus > 0
        ? `${highlights[0]} — aligned with your sustainability priorities.`
        : `${highlights[0]} with Grade ${candidate.score.grade} overall rating.`;

    return {
      product: candidate,
      scoreDelta,
      mainReason,
      improvementHighlights: highlights.slice(0, 3),
      matchesPreferences: preferenceBonus > 0,
      rankScore: scoreDelta + preferenceBonus + candidate.score.confidencePercent * 0.05,
    };
  });

  scored.sort((a, b) => b.rankScore - a.rankScore);
  return scored.slice(0, limit).map(({ rankScore: _r, ...rest }) => rest);
}

/**
 * Computes transparent per-dimension differences for 2–3 products without inventing missing values.
 */
export function calculateProductDifferences(products: ProductDTO[]): {
  metrics: ProductDifferenceMetric[];
  ingredientDiff: IngredientDiffDTO;
} {
  const pickMax = (vals: Array<{ productId: number; score: number | null; available: boolean }>) => {
    const valid = vals.filter((v) => v.available && v.score !== null);
    if (valid.length < 2) return [];
    const maxVal = Math.max(...valid.map((v) => v.score as number));
    const minVal = Math.min(...valid.map((v) => v.score as number));
    if (maxVal === minVal) return [];
    return valid.filter((v) => v.score === maxVal).map((v) => v.productId);
  };

  const pickMin = (vals: Array<{ productId: number; score: number | null; available: boolean }>) => {
    const valid = vals.filter((v) => v.available && v.score !== null);
    if (valid.length < 2) return [];
    const minVal = Math.min(...valid.map((v) => v.score as number));
    const maxVal = Math.max(...valid.map((v) => v.score as number));
    if (maxVal === minVal) return [];
    return valid.filter((v) => v.score === minVal).map((v) => v.productId);
  };

  const makeDeltaNote = (
    vals: Array<{ productId: number; score: number | null; available: boolean }>,
    unit = 'pts'
  ) => {
    const missingCount = vals.filter((v) => !v.available).length;
    if (missingCount > 0) {
      return 'Insufficient data for one or more products';
    }
    const nums = vals.map((v) => v.score as number);
    const spread = Math.round((Math.max(...nums) - Math.min(...nums)) * 10) / 10;
    if (spread === 0) return 'Tied across compared products';
    return `${spread} ${unit} difference between highest and lowest`;
  };

  const overallValues = products.map((p) => ({
    productId: p.id,
    score: p.score.overallScore,
    available: p.score.overallScore !== null,
    display:
      p.score.overallScore !== null
        ? `${p.score.overallScore.toFixed(1)} · Grade ${p.score.grade}`
        : 'Insufficient data',
  }));

  const ingValues = products.map((p) => ({
    productId: p.id,
    score: p.score.ingredientScore,
    available: p.score.ingredientScore !== null,
    display:
      p.score.ingredientScore !== null
        ? `${Math.round(p.score.ingredientScore)}/100`
        : 'Insufficient data',
  }));

  const pkgValues = products.map((p) => ({
    productId: p.id,
    score: p.score.packagingScore,
    available: p.score.packagingScore !== null,
    display:
      p.score.packagingScore !== null
        ? `${Math.round(p.score.packagingScore)}/100`
        : 'Insufficient data',
  }));

  const ethicsValues = products.map((p) => ({
    productId: p.id,
    score: p.score.brandEthicsScore,
    available: p.score.brandEthicsScore !== null,
    display:
      p.score.brandEthicsScore !== null
        ? `${Math.round(p.score.brandEthicsScore)}/100`
        : 'Insufficient data',
  }));

  const energyValues = products.map((p) => ({
    productId: p.id,
    score: p.score.energyScore,
    available: p.score.energyScore !== null,
    display:
      p.score.energyScore !== null
        ? `${Math.round(p.score.energyScore)}/100`
        : 'Insufficient data',
  }));

  const confidenceValues = products.map((p) => ({
    productId: p.id,
    score: p.score.confidencePercent,
    available: true,
    display: `${p.score.confidencePercent}% (${p.score.confidenceLevel})`,
  }));

  const priceValues = products.map((p) => ({
    productId: p.id,
    score: p.priceCents,
    available: p.priceCents !== null,
    display:
      p.priceCents !== null
        ? formatPriceINR(p.priceCents, p.currency)
        : 'Insufficient data',
  }));

  const metrics: ProductDifferenceMetric[] = [
    {
      key: 'overall',
      label: 'Overall SUvita Score',
      weightLabel: 'Weighted 100%',
      values: overallValues,
      winnerProductIds: pickMax(overallValues),
      deltaNote: makeDeltaNote(overallValues, 'pts'),
    },
    {
      key: 'ingredientSafety',
      label: 'Ingredient Safety',
      weightLabel: '40% weight',
      values: ingValues,
      winnerProductIds: pickMax(ingValues),
      deltaNote: makeDeltaNote(ingValues, 'pts'),
    },
    {
      key: 'packagingType',
      label: 'Packaging Type',
      weightLabel: '30% weight',
      values: pkgValues,
      winnerProductIds: pickMax(pkgValues),
      deltaNote: makeDeltaNote(pkgValues, 'pts'),
    },
    {
      key: 'brandEthics',
      label: 'Brand Ethics',
      weightLabel: '20% weight',
      values: ethicsValues,
      winnerProductIds: pickMax(ethicsValues),
      deltaNote: makeDeltaNote(ethicsValues, 'pts'),
    },
    {
      key: 'energyFootprint',
      label: 'Energy Footprint',
      weightLabel: '10% weight',
      values: energyValues,
      winnerProductIds: pickMax(energyValues),
      deltaNote: makeDeltaNote(energyValues, 'pts'),
    },
    {
      key: 'confidence',
      label: 'Data Availability & Confidence',
      values: confidenceValues,
      winnerProductIds: pickMax(confidenceValues),
      deltaNote: makeDeltaNote(confidenceValues, '%'),
    },
    {
      key: 'price',
      label: 'Reference Price (INR)',
      values: priceValues,
      winnerProductIds: pickMin(priceValues),
      deltaNote:
        priceValues.some((v) => !v.available)
          ? 'Price unavailable for one or more products'
          : 'Lower reference price highlighted',
    },
  ];

  // Ingredient differences
  const normalizedSets = products.map(
    (p) => new Set(p.ingredients.map((i) => i.name.trim().toLowerCase()))
  );
  const sharedLower = new Set<string>();
  if (normalizedSets.length >= 2) {
    for (const ing of normalizedSets[0]) {
      if (normalizedSets.every((s) => s.has(ing))) {
        sharedLower.add(ing);
      }
    }
  }

  const sharedIngredients = products[0]
    ? products[0].ingredients
        .filter((i) => sharedLower.has(i.name.trim().toLowerCase()))
        .map((i) => i.name)
    : [];

  const uniqueByProduct = products.map((p) => ({
    productId: p.id,
    productName: p.name,
    attentionCount: p.ingredients.filter((i) => i.safetyStatus === 'attention').length,
    limitedInfoCount: p.ingredients.filter((i) => i.safetyStatus === 'limited_info').length,
    verifiedSafeCount: p.ingredients.filter((i) => i.safetyStatus === 'verified_safe').length,
    uniqueIngredients: p.ingredients
      .filter((i) => !sharedLower.has(i.name.trim().toLowerCase()))
      .map((i) => i.name)
      .slice(0, 6),
  }));

  return {
    metrics,
    ingredientDiff: {
      sharedCount: sharedIngredients.length,
      sharedIngredients,
      uniqueByProduct,
    },
  };
}

export function generateComparisonSummary(
  products: ProductDTO[],
  metrics: ProductDifferenceMetric[]
): SmartComparisonSummaryDTO {
  if (products.length < 2) {
    return {
      headline: "Here's how these two products compare.",
      higherRatedProductId: products[0]?.id ?? null,
      higherRatedLabel: 'Add a second product to compare.',
      advantageA: 'Select Product A to inspect strengths.',
      advantageB: 'Select Product B to inspect strengths.',
      tradeOffs: [],
      missingDataNotes: [],
    };
  }

  const [a, b] = products;
  const scoreA = a.score.overallScore;
  const scoreB = b.score.overallScore;

  let higherRatedProductId: number | null = null;
  let higherRatedLabel = 'Cannot determine an overall leader due to insufficient score data.';

  const scored = products
    .filter((p) => p.score.overallScore !== null)
    .sort((x, y) => (y.score.overallScore as number) - (x.score.overallScore as number));

  if (scored.length > 0) {
    const top = scored[0];
    higherRatedProductId = top.id;
    higherRatedLabel = `${top.name} (${top.brand}) leads with ${top.score.overallScore?.toFixed(1)}/100 (Grade ${top.score.grade})`;
  }

  const findMainAdvantage = (subject: ProductDTO, other: ProductDTO): string => {
    const dims: Array<{ label: string; s: number | null; o: number | null }> = [
      { label: 'Ingredient Safety', s: subject.score.ingredientScore, o: other.score.ingredientScore },
      { label: 'Packaging Type', s: subject.score.packagingScore, o: other.score.packagingScore },
      { label: 'Brand Ethics', s: subject.score.brandEthicsScore, o: other.score.brandEthicsScore },
      { label: 'Energy Footprint', s: subject.score.energyScore, o: other.score.energyScore },
    ];
    const wins = dims
      .filter((d) => d.s !== null && d.o !== null && d.s > d.o)
      .sort((x, y) => ((y.s as number) - (y.o as number)) - ((x.s as number) - (x.o as number)));

    if (wins.length > 0) {
      const top = wins[0];
      return `Stronger ${top.label} (${Math.round(top.s as number)} vs. ${Math.round(top.o as number)}/100).`;
    }
    if (
      subject.priceCents !== null &&
      other.priceCents !== null &&
      subject.priceCents < other.priceCents
    ) {
      return `Lower reference price (${formatPriceINR(subject.priceCents, subject.currency)} vs. ${formatPriceINR(other.priceCents, other.currency)}).`;
    }
    if (subject.score.confidencePercent > other.score.confidencePercent) {
      return `Broader data transparency (${subject.score.confidencePercent}% vs. ${other.score.confidencePercent}% coverage).`;
    }
    return subject.score.strongestFactor
      ? `Strongest dimension is ${subject.score.strongestFactor}.`
      : 'Limited disclosed metrics available for advantage comparison.';
  };

  const advantageA = findMainAdvantage(a, b);
  const advantageB = findMainAdvantage(b, a);

  const tradeOffs: string[] = [];
  if (scoreA !== null && scoreB !== null && scoreA !== scoreB) {
    const higher = scoreA > scoreB ? a : b;
    const lower = scoreA > scoreB ? b : a;
    if (
      lower.priceCents !== null &&
      higher.priceCents !== null &&
      lower.priceCents < higher.priceCents
    ) {
      const diff = formatPriceINR(higher.priceCents - lower.priceCents, higher.currency);
      tradeOffs.push(
        `${higher.name} offers a higher SUvita Score (+${(
          (higher.score.overallScore as number) -
          (lower.score.overallScore as number)
        ).toFixed(1)} pts), while ${lower.name} costs ${diff} less.`
      );
    }
    if (
      lower.score.packagingScore !== null &&
      higher.score.packagingScore !== null &&
      lower.score.packagingScore > higher.score.packagingScore
    ) {
      tradeOffs.push(
        `Even with a lower overall score, ${lower.name} performs better on Packaging Type (${Math.round(lower.score.packagingScore)} vs. ${Math.round(higher.score.packagingScore)}).`
      );
    }
    if (
      lower.score.ingredientScore !== null &&
      higher.score.ingredientScore !== null &&
      lower.score.ingredientScore > higher.score.ingredientScore
    ) {
      tradeOffs.push(
        `${lower.name} holds an edge in Ingredient Safety (${Math.round(lower.score.ingredientScore)} vs. ${Math.round(higher.score.ingredientScore)}).`
      );
    }
  }
  if (tradeOffs.length === 0) {
    const spreadMetric = metrics.find((m) => m.key === 'overall');
    if (spreadMetric) {
      tradeOffs.push(
        `Compare individual dimensions below — the best choice depends on whether you prioritize ingredients, packaging, or budget.`
      );
    }
  }

  const missingDataNotes: string[] = [];
  for (const p of products) {
    const missingDims = p.score.dimensions.filter((d) => !d.available).map((d) => d.label);
    if (missingDims.length > 0) {
      missingDataNotes.push(
        `${p.name} is missing verified data for ${missingDims.join(', ')} (${p.score.confidencePercent}% confidence).`
      );
    }
    if (p.priceCents === null) {
      missingDataNotes.push(`Reference price in INR is not available for ${p.name}.`);
    }
  }

  return {
    headline: "Here's how these two products compare.",
    higherRatedProductId,
    higherRatedLabel,
    advantageA,
    advantageB,
    tradeOffs,
    missingDataNotes,
  };
}

export interface ComparisonMetricRow {
  key: string;
  label: string;
  winnerProductIds: number[];
  values: Array<{
    productId: number;
    display: string;
    numeric: number | null;
  }>;
}

export interface ComparisonAnalysis {
  rows: ComparisonMetricRow[];
  overallWinnerId: number | null;
  summary: string;
  tradeOffs: string[];
}

export function buildComparisonAnalysis(products: ProductDTO[]): ComparisonAnalysis {
  const { metrics } = calculateProductDifferences(products);
  const smart = generateComparisonSummary(products, metrics);
  return {
    rows: metrics.map((m) => ({
      key: m.key,
      label: m.label,
      winnerProductIds: m.winnerProductIds,
      values: m.values.map((v) => ({
        productId: v.productId,
        display: v.display,
        numeric: v.score,
      })),
    })),
    overallWinnerId: smart.higherRatedProductId,
    summary: smart.higherRatedLabel,
    tradeOffs: smart.tradeOffs,
  };
}
