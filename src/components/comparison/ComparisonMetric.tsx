import React from 'react';
import { Award } from 'lucide-react';
import type { ProductDifferenceMetric, ProductDTO } from '../../shared/types';
import { cn } from '../../lib/utils';

interface ComparisonMetricProps {
  metric: ProductDifferenceMetric;
  products: ProductDTO[];
}

export const ComparisonMetric: React.FC<ComparisonMetricProps> = ({
  metric,
  products,
}) => {
  const isScoreScale =
    metric.key === 'overall' ||
    metric.key === 'ingredientSafety' ||
    metric.key === 'packagingType' ||
    metric.key === 'brandEthics' ||
    metric.key === 'energyFootprint' ||
    metric.key === 'confidence';

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#202923] p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-white/[0.07]">
        <div>
          <h3 className="text-sm font-semibold text-white">{metric.label}</h3>
          {metric.weightLabel && (
            <span className="text-xs text-[#8E9B94]">{metric.weightLabel}</span>
          )}
        </div>
        <span className="text-xs text-[#A0AAA5]">{metric.deltaNote}</span>
      </div>

      <div
        className={cn(
          'mt-4 grid gap-4',
          products.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
        )}
      >
        {products.map((prod) => {
          const val = metric.values.find((v) => v.productId === prod.id);
          const isWinner = metric.winnerProductIds.includes(prod.id);
          const barPct =
            isScoreScale && val?.available && val.score !== null
              ? Math.max(0, Math.min(100, val.score))
              : null;

          return (
            <div
              key={prod.id}
              className={cn(
                'rounded-lg border p-3.5 transition-colors',
                isWinner
                  ? 'border-[#00FFAA]/40 bg-[#00FFAA]/[0.06]'
                  : 'border-white/[0.06] bg-[#181F1C]'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-[#A0AAA5]">{prod.name}</span>
                {isWinner && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#00FFAA] shrink-0">
                    <Award className="h-3.5 w-3.5" />
                    Stronger
                  </span>
                )}
              </div>

              <div className="mt-2 font-mono text-base font-semibold text-white tabular-nums">
                {val?.display || 'Insufficient data'}
              </div>

              {barPct !== null ? (
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      isWinner ? 'bg-[#00FFAA]' : 'bg-[#6F8278]'
                    )}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              ) : (
                !val?.available && (
                  <p className="mt-1.5 text-[11px] text-[#8E9B94]">
                    Unavailable in verified sources (not counted as zero)
                  </p>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
