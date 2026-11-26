import React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, BookmarkCheck, GitCompareArrows } from 'lucide-react';
import { CATEGORY_LABELS, formatPriceINR, type ProductDTO } from '../../shared/types';
import { useApp } from '../../context/AppContext';
import { GradeDisplay, ProductImage } from '../ui/primitives';

interface ProductCardProps {
  product: ProductDTO;
  highlightNote?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, highlightNote }) => {
  const { isProductSaved, toggleSaveProduct, addToCompare, compareIds } = useApp();
  const saved = isProductSaved(product.id);
  const inCompare = compareIds.includes(product.id);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#202923] transition-colors duration-150 hover:border-white/[0.16]">
      <Link
        to={`/product/${product.id}`}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#181F1C] block"
      >
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-1.5 text-xs text-[#A0AAA5] truncate">
          <span className="truncate font-medium text-[#C8D3CD]">{product.brand}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{CATEGORY_LABELS[product.category]}</span>
        </div>

        <Link
          to={`/product/${product.id}`}
          className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-white group-hover:text-[#00FFAA] transition-colors"
        >
          {product.name}
        </Link>

        {highlightNote && (
          <p className="mt-2 text-xs text-[#A0AAA5] line-clamp-2 leading-relaxed">
            {highlightNote}
          </p>
        )}

        <div className="mt-4 pt-3 border-t border-white/[0.07] flex items-center justify-between gap-2">
          <GradeDisplay
            grade={product.score.grade}
            score={product.score.overallScore}
            size="sm"
          />
          <span className="font-mono text-xs font-medium text-white tabular-nums">
            {formatPriceINR(product.priceCents, product.currency)}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-[#8E9B94]">
          <span className="tabular-nums">{product.score.confidencePercent}% data confidence</span>
          <span>{product.isSampleData ? 'Demo catalog' : 'Verified source'}</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Link
            to={`/product/${product.id}`}
            className="flex-1 inline-flex h-9 items-center justify-center rounded-lg bg-[#161D1A] border border-white/10 px-3 text-xs font-medium text-white hover:border-[#00FFAA]/40 hover:text-[#00FFAA] transition-colors whitespace-nowrap"
          >
            View Analysis
          </Link>
          <button
            type="button"
            onClick={() => addToCompare(product.id)}
            aria-label={`Compare ${product.name}`}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
              inCompare
                ? 'border-[#00FFAA]/40 bg-[#00FFAA]/15 text-[#00FFAA]'
                : 'border-white/10 bg-[#161D1A] text-[#A0AAA5] hover:text-white'
            }`}
          >
            <GitCompareArrows className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => toggleSaveProduct(product)}
            aria-label={saved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
              saved
                ? 'border-[#00FFAA]/40 bg-[#00FFAA]/15 text-[#00FFAA]'
                : 'border-white/10 bg-[#161D1A] text-[#A0AAA5] hover:text-white'
            }`}
          >
            {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </article>
  );
};
