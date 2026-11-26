import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookmarkPlus,
  Check,
  RefreshCw,
  Save,
  Share2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import {
  CATEGORY_LABELS,
  formatPriceINR,
  type ComparisonPayloadDTO,
} from '../../shared/types';
import { Button, GradeDisplay, ProductImage } from '../ui/primitives';
import { AIComparison } from './AIComparison';
import { ComparisonMetric } from './ComparisonMetric';
import { ComparisonSummary } from './ComparisonSummary';

interface ComparisonResultsProps {
  data: ComparisonPayloadDTO;
  onScanAnotherPair: () => void;
  onSwapWithAlternative?: (altId: number) => void;
}

export const ComparisonResults: React.FC<ComparisonResultsProps> = ({
  data,
  onScanAnotherPair,
  onSwapWithAlternative,
}) => {
  const { saveComparisonPair, toggleSaveProduct, isProductSaved } = useApp();
  const [savingComparison, setSavingComparison] = useState(false);
  const [savedDone, setSavedDone] = useState(false);

  const handleSaveComparison = async () => {
    setSavingComparison(true);
    try {
      await saveComparisonPair(data.products);
      setSavedDone(true);
    } finally {
      setSavingComparison(false);
    }
  };

  const handleSaveAllProducts = async () => {
    for (const p of data.products) {
      if (!isProductSaved(p.id)) {
        await toggleSaveProduct(p);
      }
    }
    toast.success('Compared products added to My Collection');
  };

  const handleShare = async () => {
    const ids = data.products.map((p) => p.id).join(',');
    const url = `${window.location.origin}/compare?ids=${ids}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Comparison link copied to clipboard');
    } catch {
      toast.info(`Share link: ${url}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Smart Comparison Summary */}
      <ComparisonSummary summary={data.summary} products={data.products} />

      {/* Side-by-Side Product Header Cards */}
      <div className="overflow-x-auto pb-1">
        <div
          className={`grid gap-4 min-w-[540px] ${
            data.products.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
          }`}
        >
          {data.products.map((product) => {
            const isLeader = data.summary.higherRatedProductId === product.id;
            return (
              <div
                key={product.id}
                className={`rounded-xl border p-4 sm:p-5 bg-[#202923] ${
                  isLeader ? 'border-[#00FFAA]/45' : 'border-white/[0.08]'
                }`}
              >
                <div className="flex items-start gap-4">
                  <ProductImage
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-20 w-20 shrink-0 rounded-lg border border-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-[#A0AAA5] truncate">
                      {product.brand} · {CATEGORY_LABELS[product.category]}
                    </div>
                    <Link
                      to={`/product/${product.id}`}
                      className="mt-1 block text-base font-semibold text-white hover:text-[#00FFAA] transition-colors line-clamp-2"
                    >
                      {product.name}
                    </Link>
                    <div className="mt-2 font-mono text-sm font-medium text-white tabular-nums">
                      {formatPriceINR(product.priceCents, product.currency)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-white/[0.07] flex items-center justify-between gap-2">
                  <GradeDisplay
                    grade={product.score.grade}
                    score={product.score.overallScore}
                    size="md"
                  />
                  <div className="text-right">
                    <div className="font-mono text-xs text-white tabular-nums">
                      {product.score.confidencePercent}% data
                    </div>
                    <div className="text-[11px] text-[#8E9B94]">
                      {product.score.confidenceLevel} confidence
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Aligned Metrics */}
      <div className="space-y-4">
        {data.metrics.map((metric) => (
          <ComparisonMetric
            key={metric.key}
            metric={metric}
            products={data.products}
          />
        ))}
      </div>

      {/* Ingredient Differences */}
      <section className="rounded-xl border border-white/[0.08] bg-[#202923] p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-white/[0.07]">
          <h3 className="text-sm font-semibold text-white">Ingredient Differences</h3>
          <span className="text-xs text-[#A0AAA5]">
            {data.ingredientDiff.sharedCount} shared ingredient(s)
          </span>
        </div>

        <div
          className={`mt-4 grid gap-4 ${
            data.products.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
          }`}
        >
          {data.ingredientDiff.uniqueByProduct.map((entry) => (
            <div
              key={entry.productId}
              className="rounded-lg border border-white/[0.06] bg-[#181F1C] p-4 space-y-2.5"
            >
              <div className="text-xs font-semibold text-white truncate">
                {entry.productName}
              </div>
              <div className="flex items-center gap-3 text-xs text-[#A0AAA5] font-mono tabular-nums">
                <span className="text-[#00FFAA]">{entry.verifiedSafeCount} verified</span>
                <span>·</span>
                <span className="text-amber-400">{entry.attentionCount} attention</span>
                <span>·</span>
                <span>{entry.limitedInfoCount} limited</span>
              </div>
              <div className="text-xs text-[#C8D3CD] leading-relaxed">
                <span className="text-[#8E9B94]">Distinct ingredients: </span>
                {entry.uniqueIngredients.length > 0
                  ? entry.uniqueIngredients.join(', ')
                  : 'None listed'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ask SUvita AI Integration */}
      <AIComparison products={data.products} />

      {/* Better Third Alternatives */}
      {data.betterAlternatives.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#00FFAA]" />
            <h2 className="text-base font-semibold text-white">
              Find Better Alternatives in This Category
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.betterAlternatives.map((alt) => (
              <div
                key={alt.product.id}
                className="rounded-xl border border-white/[0.08] bg-[#202923] p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs text-[#A0AAA5]">
                    {alt.product.brand} · {formatPriceINR(alt.product.priceCents, alt.product.currency)}
                  </div>
                  <Link
                    to={`/product/${alt.product.id}`}
                    className="mt-1 block text-sm font-semibold text-white hover:text-[#00FFAA]"
                  >
                    {alt.product.name}
                  </Link>
                  <div className="mt-2">
                    <GradeDisplay
                      grade={alt.product.score.grade}
                      score={alt.product.score.overallScore}
                      size="sm"
                    />
                  </div>
                  <p className="mt-2.5 text-xs text-[#A0AAA5] leading-relaxed">
                    {alt.mainReason}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Link
                    to={`/product/${alt.product.id}`}
                    className="flex-1 inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-white/10 bg-[#161D1A] text-xs font-medium text-white hover:border-[#00FFAA]/40"
                  >
                    Details
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  {onSwapWithAlternative && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onSwapWithAlternative(alt.product.id)}
                    >
                      Compare
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bottom Action Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.08] bg-[#1C2421] p-4">
        <Button
          type="button"
          onClick={handleSaveComparison}
          disabled={savingComparison || savedDone}
        >
          {savedDone ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {savedDone ? 'Comparison Saved' : 'Save Comparison'}
        </Button>

        <Button type="button" variant="secondary" onClick={handleSaveAllProducts}>
          <BookmarkPlus className="h-4 w-4" />
          Add Both to My Collection
        </Button>

        <Button type="button" variant="secondary" onClick={onScanAnotherPair}>
          <RefreshCw className="h-4 w-4" />
          Scan Another Pair
        </Button>

        <Button type="button" variant="secondary" onClick={handleShare}>
          <Share2 className="h-4 w-4" />
          Share Comparison
        </Button>
      </div>
    </div>
  );
};
