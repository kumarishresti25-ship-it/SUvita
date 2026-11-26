import React, { useEffect, useState } from 'react';
import { ArrowRight, GitCompareArrows, Search, Barcode } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { formatPriceINR, type ProductDTO } from '../../shared/types';
import { BarcodeScannerEngine } from '../scanner/BarcodeScannerEngine';
import { Button, Input } from '../ui/primitives';
import { ProductSlot } from './ProductSlot';

interface ComparisonScannerProps {
  productA: ProductDTO | null;
  productB: ProductDTO | null;
  onSetProductA: (p: ProductDTO | null) => void;
  onSetProductB: (p: ProductDTO | null) => void;
  onCompareReady: () => void;
  catalog: ProductDTO[];
}

export const ComparisonScanner: React.FC<ComparisonScannerProps> = ({
  productA,
  productB,
  onSetProductA,
  onSetProductB,
  onCompareReady,
  catalog,
}) => {
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>(!productA ? 'A' : 'B');
  const [manualCode, setManualCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!productA) setActiveSlot('A');
    else if (!productB) setActiveSlot('B');
  }, [productA, productB]);

  const handleResolveForActiveSlot = async (barcodeOrId: string) => {
    const trimmed = barcodeOrId.trim();
    if (!trimmed) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      if (activeSlot === 'A') {
        const { product } = await api.scanFirstProduct(trimmed);
        if (productB && product.id === productB.id) {
          setErrorMsg('This product is already in Product B. Choose a different product.');
          return;
        }
        onSetProductA(product);
        setManualCode('');
        toast.success(`Product A set: ${product.name}`);
        if (!productB) setActiveSlot('B');
      } else {
        const { product } = await api.scanSecondProduct(trimmed, productA?.id);
        onSetProductB(product);
        setManualCode('');
        toast.success(`Product B set: ${product.name}`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to find product.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCatalog = catalog
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.barcode.includes(q)
      );
    })
    .slice(0, 6);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
          Compare two products
        </h1>
        <p className="mt-1.5 text-sm text-[#A0AAA5]">
          Scan two products to discover which is the better choice across ingredients, packaging, brand ethics, and INR value.
        </p>
      </div>

      {/* Product A & Product B Slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProductSlot
          slotLabel="Product A"
          emptyPrompt="Scan first product"
          product={productA}
          isActive={activeSlot === 'A'}
          onSelectSlot={() => setActiveSlot('A')}
          onRemove={() => {
            onSetProductA(null);
            setActiveSlot('A');
          }}
          onRescan={() => setActiveSlot('A')}
        />
        <ProductSlot
          slotLabel="Product B"
          emptyPrompt="Scan second product"
          product={productB}
          isActive={activeSlot === 'B'}
          onSelectSlot={() => setActiveSlot('B')}
          onRemove={() => {
            onSetProductB(null);
            setActiveSlot('B');
          }}
          onRescan={() => setActiveSlot('B')}
        />
      </div>

      {/* Primary Compare CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#1C2421] p-4">
        <div className="text-sm text-[#C8D3CD]">
          {productA && productB ? (
            <span>
              Both products verified and ready for side-by-side analysis.
            </span>
          ) : !productA ? (
            <span>Step 1 of 2 — Scan or select Product A below.</span>
          ) : (
            <span>Step 2 of 2 — Now scan or select Product B to unlock comparison.</span>
          )}
        </div>
        <Button
          type="button"
          onClick={onCompareReady}
          disabled={!productA || !productB}
          size="lg"
        >
          <GitCompareArrows className="h-4 w-4" />
          Compare Products
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Active Slot Scanner + Manual / Name Search */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Scanning for Product {activeSlot}
            </h2>
            <div className="inline-flex rounded-lg bg-[#1C2421] p-0.5 border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setActiveSlot('A')}
                className={`rounded-md px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                  activeSlot === 'A'
                    ? 'bg-[#00FFAA] text-[#09130F]'
                    : 'text-[#A0AAA5] hover:text-white'
                }`}
              >
                Slot A
              </button>
              <button
                type="button"
                onClick={() => setActiveSlot('B')}
                className={`rounded-md px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                  activeSlot === 'B'
                    ? 'bg-[#00FFAA] text-[#09130F]'
                    : 'text-[#A0AAA5] hover:text-white'
                }`}
              >
                Slot B
              </button>
            </div>
          </div>

          <BarcodeScannerEngine
            compact
            activeLabel={`Point camera at barcode for Product ${activeSlot}`}
            onDetected={(code) => void handleResolveForActiveSlot(code)}
          />
        </div>

        <div className="space-y-4 rounded-xl border border-white/[0.08] bg-[#202923] p-5">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Manual Barcode or Product Search (Product {activeSlot})
            </h2>
            <p className="mt-1 text-xs text-[#A0AAA5]">
              Enter any Indian 890 or global EAN/UPC barcode, or pick directly from SUvita’s catalog.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleResolveForActiveSlot(manualCode);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Barcode className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#7A8781]" />
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. 8903300003040 or 8901100001059"
                aria-label={`Enter barcode for Product ${activeSlot}`}
                className="pl-9 font-mono"
              />
            </div>
            <Button type="submit" disabled={loading || !manualCode.trim()}>
              {loading ? 'Looking up...' : 'Add'}
            </Button>
          </form>

          {errorMsg && (
            <p
              role="alert"
              className="rounded-lg border border-[#E05A5A]/30 bg-[#E05A5A]/10 px-3 py-2 text-xs text-[#F38B8B]"
            >
              {errorMsg}
            </p>
          )}

          <div className="pt-2 border-t border-white/[0.07]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#7A8781]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search catalog by name (e.g. shampoo, chocolate, oat)..."
                aria-label="Search catalog products to compare"
                className="pl-9"
              />
            </div>

            <div className="mt-3 divide-y divide-white/[0.06] max-h-60 overflow-y-auto">
              {filteredCatalog.map((item) => {
                const alreadyPicked =
                  item.id === productA?.id || item.id === productB?.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={alreadyPicked || loading}
                    onClick={() => void handleResolveForActiveSlot(String(item.id))}
                    className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-white/[0.03] px-2 rounded-lg transition-colors disabled:opacity-45 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-white">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-[#8E9B94] truncate">
                        {item.brand} · {formatPriceINR(item.priceCents, item.currency)} · Grade{' '}
                        {item.score.grade}
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-[#00FFAA] shrink-0">
                      {alreadyPicked ? 'Selected' : `Set as ${activeSlot}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
