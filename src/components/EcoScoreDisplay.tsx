import React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, BookmarkCheck, GitCompare } from 'lucide-react';
import { CATEGORY_LABELS, type EcoGrade, type ProductDTO } from '../shared/types';
import { cn, formatPrice, getGradeStyle } from '../lib/utils';
import { ProductVisual } from './ProductVisual';

export function GradeMark({
  grade,
  score,
  size = 'md',
}: {
  grade: EcoGrade;
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const style = getGradeStyle(grade);
  const displayGrade = grade === 'INSUFFICIENT_DATA' ? '?' : grade;

  if (size === 'lg') {
    return (
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border font-mono text-3xl font-bold tabular-nums',
            style.surface,
            style.border,
            style.text
          )}
          aria-label={`EcoScore Grade ${grade}`}
        >
          {displayGrade}
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold text-white tabular-nums">
              {score !== null ? score.toFixed(1) : '—'}
            </span>
            <span className="text-sm text-[#A0AAA5] font-mono">/100</span>
          </div>
          <p className={cn('text-sm font-medium mt-0.5', style.text)}>{style.label}</p>
        </div>
      </div>
    );
  }

  if (size === 'sm') {
    return (
      <div className="inline-flex items-center gap-2 font-mono tabular-nums">
        <span
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-md border text-xs font-bold',
            style.surface,
            style.border,
            style.text
          )}
        >
          {displayGrade}
        </span>
        <span className="text-xs font-medium text-white">
          {score !== null ? `${Math.round(score)}` : 'N/A'}
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2.5 font-mono tabular-nums">
      <span
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-bold',
          style.surface,
          style.border,
          style.text
        )}
      >
        {displayGrade}
      </span>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-white">
          {score !== null ? `${score.toFixed(1)}` : 'N/A'}
        </div>
        <div className={cn('text-[11px] font-sans', style.text)}>{style.label}</div>
      </div>
    </div>
  );
}

export function ProductCard({
  product,
  saved,
  onToggleSave,
  onCompare,
  subtitle,
}: {
  product: ProductDTO;
  saved?: boolean;
  onToggleSave?: (product: ProductDTO) => void;
  onCompare?: (productId: number) => void;
  subtitle?: string;
}) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#202923] transition-colors duration-150 hover:border-white/[0.16]">
      <Link
        to={`/product/${product.id}`}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-[#161D1A]"
      >
        <ProductVisual
          src={product.imageUrl}
          alt={product.name}
          category={product.category}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <GradeMark grade={product.score.grade} score={product.score.overallScore} size="sm" />
          <span className="font-mono text-[11px] text-white/80 tabular-nums">
            {product.score.confidencePercent}% data
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-[#A0AAA5] truncate">
          {product.brand}
          <span aria-hidden="true"> · </span>
          {CATEGORY_LABELS[product.category]}
        </p>

        <Link
          to={`/product/${product.id}`}
          className="mt-1.5 text-[15px] font-semibold leading-snug text-white hover:text-[#00FFAA] transition-colors line-clamp-2"
        >
          {product.name}
        </Link>

        {subtitle ? (
          <p className="mt-2 text-xs leading-relaxed text-[#A0AAA5] line-clamp-2">{subtitle}</p>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-[#A0AAA5] line-clamp-2">
            {product.packagingSummary || product.description}
          </p>
        )}

        <div className="mt-auto pt-4 flex items-center justify-between gap-2 border-t border-white/[0.06] text-xs">
          <span className="font-mono text-[#D2DBD6] tabular-nums">
            {product.priceCents !== null ? formatPrice(product.priceCents, product.currency) : product.isSampleData ? 'Demo item' : 'Verified API'}
          </span>

          <div className="flex items-center gap-1">
            {onCompare && (
              <button
                type="button"
                onClick={() => onCompare(product.id)}
                aria-label={`Compare ${product.name}`}
                title="Add to compare"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#A0AAA5] hover:bg-white/[0.07] hover:text-white transition-colors"
              >
                <GitCompare className="h-4 w-4" />
              </button>
            )}
            {onToggleSave && (
              <button
                type="button"
                onClick={() => onToggleSave(product)}
                aria-label={saved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
                title={saved ? 'Saved' : 'Save product'}
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                  saved
                    ? 'text-[#00FFAA] bg-[#00FFAA]/10 hover:bg-[#00FFAA]/15'
                    : 'text-[#A0AAA5] hover:bg-white/[0.07] hover:text-white'
                )}
              >
                {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
