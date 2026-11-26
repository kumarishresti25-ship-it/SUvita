import React from 'react';
import { RefreshCw, ScanBarcode, X } from 'lucide-react';
import { CATEGORY_LABELS, formatPriceINR, type ProductDTO } from '../../shared/types';
import { GradeDisplay, ProductImage } from '../ui/primitives';

interface ProductSlotProps {
  slotLabel: string;
  emptyPrompt: string;
  product: ProductDTO | null;
  isActive: boolean;
  onSelectSlot: () => void;
  onRemove: () => void;
  onRescan: () => void;
}

export const ProductSlot: React.FC<ProductSlotProps> = ({
  slotLabel,
  emptyPrompt,
  product,
  isActive,
  onSelectSlot,
  onRemove,
  onRescan,
}) => {
  if (!product) {
    return (
      <button
        type="button"
        onClick={onSelectSlot}
        className={`flex min-h-[164px] w-full flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center transition-colors cursor-pointer ${
          isActive
            ? 'border-[#00FFAA] bg-[#00FFAA]/[0.06]'
            : 'border-white/15 bg-[#1C2421] hover:border-white/30'
        }`}
      >
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            isActive ? 'bg-[#00FFAA]/20 text-[#00FFAA]' : 'bg-white/[0.06] text-[#A0AAA5]'
          }`}
        >
          <ScanBarcode className="h-5 w-5" />
        </div>
        <div className="mt-3 text-sm font-semibold text-white">{slotLabel}</div>
        <p className="mt-1 text-xs text-[#A0AAA5]">{emptyPrompt}</p>
        {isActive && (
          <span className="mt-2.5 text-[11px] font-medium text-[#00FFAA]">
            Ready to scan or select below
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        isActive
          ? 'border-[#00FFAA]/60 bg-[#202923]'
          : 'border-white/[0.08] bg-[#202923]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.07]">
        <span className="text-xs font-medium text-[#00FFAA]">{slotLabel}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRescan}
            aria-label={`Replace ${slotLabel}`}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-white/10 bg-[#161D1A] px-2 text-[11px] font-medium text-[#C8D3CD] hover:text-white cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            Replace
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${product.name} from ${slotLabel}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-[#161D1A] text-[#A0AAA5] hover:text-[#F38B8B] cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-3.5">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="h-20 w-20 shrink-0 rounded-lg border border-white/10"
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs text-[#A0AAA5] truncate">
            {product.brand} · {CATEGORY_LABELS[product.category]}
          </div>
          <h3 className="mt-0.5 text-sm font-semibold text-white line-clamp-2">
            {product.name}
          </h3>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <GradeDisplay
              grade={product.score.grade}
              score={product.score.overallScore}
              size="sm"
            />
            <span className="font-mono text-xs text-white tabular-nums">
              {formatPriceINR(product.priceCents, product.currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
