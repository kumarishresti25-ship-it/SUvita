import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEcoScore,
  calculateProductDifferences,
  findGreenerAlternatives,
  generateComparisonSummary,
  scoreToGrade,
} from './ecoscore';
import { formatPriceINR, type ProductDTO } from './types';

function makeMockProduct(
  id: number,
  name: string,
  category: ProductDTO['category'],
  scores: [number | null, number | null, number | null, number | null],
  priceCents: number | null = 24900
): ProductDTO {
  const score = calculateEcoScore({
    ingredientSafety: { score: scores[0] },
    packagingType: { score: scores[1] },
    brandEthics: { score: scores[2] },
    energyFootprint: { score: scores[3] },
  });
  return {
    id,
    barcode: `89011000000${id}`,
    name,
    brand: `Brand ${id}`,
    category,
    description: 'Test product',
    imageUrl: null,
    priceCents,
    currency: 'INR',
    packagingSummary: 'Test packaging',
    packagingType: 'glass',
    originCountry: 'India',
    isSampleData: true,
    sourceLabel: 'Test Fixture',
    createdAt: new Date().toISOString(),
    score,
    ingredients: [
      {
        name: 'Water',
        safetyStatus: 'verified_safe',
        sourceName: 'Test',
        position: 0,
      },
    ],
    sources: [],
  };
}

test('formatPriceINR formats paise into Indian Rupees cleanly', () => {
  assert.equal(formatPriceINR(24900, 'INR'), '₹249');
  assert.equal(formatPriceINR(129900, 'INR'), '₹1,299');
  assert.equal(formatPriceINR(null, 'INR'), 'Price unavailable');
});

test('calculateEcoScore applies exact 40/30/20/10 weighted formula when all dimensions exist', () => {
  const result = calculateEcoScore({
    ingredientSafety: { score: 90 },
    packagingType: { score: 80 },
    brandEthics: { score: 70 },
    energyFootprint: { score: 60 },
  });
  assert.equal(result.overallScore, 80);
  assert.equal(result.grade, 'A');
  assert.equal(result.confidencePercent, 100);
  assert.equal(result.confidenceLevel, 'High');
  assert.equal(result.missingNotice, null);
});

test('scoreToGrade enforces exact A-E thresholds', () => {
  assert.equal(scoreToGrade(80), 'A');
  assert.equal(scoreToGrade(79.9), 'B');
  assert.equal(scoreToGrade(65), 'B');
  assert.equal(scoreToGrade(64.9), 'C');
  assert.equal(scoreToGrade(50), 'C');
  assert.equal(scoreToGrade(35), 'D');
  assert.equal(scoreToGrade(34.9), 'E');
  assert.equal(scoreToGrade(null), 'INSUFFICIENT_DATA');
});

test('missing dimensions are never silently redistributed to inflate EcoScore', () => {
  const partial = calculateEcoScore({
    ingredientSafety: { score: 90 },
    packagingType: { score: null },
    brandEthics: { score: 80 },
    energyFootprint: { score: null },
  });
  assert.equal(partial.confidencePercent, 60);
  assert.equal(partial.overallScore, 52);
  assert.equal(partial.grade, 'C');
  assert.equal(partial.observedSubscoreAverage, 86.7);
});

test('below 50% data weight returns INSUFFICIENT_DATA', () => {
  const insufficient = calculateEcoScore({
    ingredientSafety: { score: null },
    packagingType: { score: 95 },
    brandEthics: { score: null },
    energyFootprint: { score: 90 },
  });
  assert.equal(insufficient.confidencePercent, 40);
  assert.equal(insufficient.overallScore, null);
  assert.equal(insufficient.grade, 'INSUFFICIENT_DATA');
});

test('findGreenerAlternatives filters by same category and respects user priorities', () => {
  const scanned = makeMockProduct(1, 'Standard Cereal', 'food_beverages', [55, 45, 50, 40]);
  const crossCat = makeMockProduct(2, 'Eco Serum', 'beauty_cosmetics', [95, 95, 95, 95]);
  const altPackaging = makeMockProduct(3, 'Glass Jar Oats', 'food_beverages', [75, 96, 75, 70]);
  const altEthics = makeMockProduct(4, 'Fair Oats', 'food_beverages', [82, 70, 96, 75]);

  const results = findGreenerAlternatives(
    scanned,
    [scanned, crossCat, altPackaging, altEthics],
    { priorities: ['packaging'] }
  );

  assert.equal(results.length, 2);
  assert.ok(results.every((r) => r.product.category === 'food_beverages'));
  assert.equal(results[0].product.id, 3);
});

test('calculateProductDifferences and generateComparisonSummary expose missing data & INR trade-offs', () => {
  const a = makeMockProduct(1, 'Budget Cleaner', 'household', [52, 48, 50, null], 18500);
  const b = makeMockProduct(2, 'Refillable Cleaner', 'household', [92, 95, 88, 84], 39900);

  const { metrics } = calculateProductDifferences([a, b]);
  const summary = generateComparisonSummary([a, b], metrics);

  assert.equal(summary.higherRatedProductId, 2);
  const energyMetric = metrics.find((m) => m.key === 'energyFootprint');
  assert.equal(energyMetric?.values[0].display, 'Insufficient data');
  assert.ok(summary.missingDataNotes.some((n) => n.includes('Energy Footprint')));
  assert.ok(summary.tradeOffs.some((t) => t.includes('₹214')));
});
