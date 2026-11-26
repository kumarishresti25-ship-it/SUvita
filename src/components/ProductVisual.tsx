import React, { useState } from 'react';
import { Leaf, Package } from 'lucide-react';
import { CATEGORY_LABELS, type ProductCategory } from '../shared/types';
import { cn } from '../lib/utils';

export function ProductVisual({
  src,
  alt,
  category,
  className,
}: {
  src?: string | null;
  alt: string;
  category?: ProductCategory;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-gradient-to-br from-[#1C2421] to-[#141A17] text-[#6E7D75] p-4 text-center',
          className
        )}
      >
        {category === 'household' ? (
          <Package className="h-8 w-8 mb-2 text-[#00FFAA]/60" />
        ) : (
          <Leaf className="h-8 w-8 mb-2 text-[#00FFAA]/60" />
        )}
        <span className="text-xs font-medium text-[#A0AAA5]">
          {category ? CATEGORY_LABELS[category] : 'Product image unavailable'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn('object-cover w-full h-full bg-[#161D1A]', className)}
    />
  );
}
