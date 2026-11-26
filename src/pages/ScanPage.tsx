import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Barcode,
  GitCompareArrows,
  Search,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { formatPriceINR, type ProductDTO } from '../shared/types';
import { BarcodeScannerEngine } from '../components/scanner/BarcodeScannerEngine';
import { Button, Input } from '../components/ui/primitives';

const DEMO_BARCODES = [
  { code: '8903300003040', label: 'Reetha & Hibiscus Shampoo Bar (₹249 · Grade A)' },
  { code: '8901100001059', label: 'Idukki 72% Dark Chocolate (₹290 · Grade A)' },
  { code: '8901100001066', label: 'Milk Choco-Crisp Bar (₹60 · Grade D)' },
  { code: '8901100001042', label: 'Himalayan Ragi Granola (Partial Data Example)' },
  { code: '8904400004032', label: 'Bleach Kitchen Spray (₹185 · Grade E)' },
];

export const ScanPage: React.FC = () => {
  const { recordScan } = useApp();
  const navigate = useNavigate();

  const [manualCode, setManualCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [searching, setSearching] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<{
    local: ProductDTO[];
    external: Array<{
      barcode: string;
      name: string;
      brand: string;
      imageUrl: string | null;
      source: string;
    }>;
  } | null>(null);

  const handleLookup = async (
    barcode: string,
    method: 'camera' | 'manual' | 'search'
  ) => {
    const clean = barcode.trim();
    if (!clean) return;
    setLookupError(null);
    setLookingUp(true);
    try {
      const res = await api.lookupBarcode(clean);
      await recordScan(res.product, method);
      toast.success(`Found ${res.product.name}`);
      navigate(`/product/${res.product.id}`);
    } catch (err: any) {
      setLookupError(
        err?.message ||
          `No verified product record found for barcode ${clean}. Try searching by product name below.`
      );
    } finally {
      setLookingUp(false);
    }
  };

  const handleNameSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (q.length < 2) {
      toast.error('Enter at least 2 characters to search.');
      return;
    }
    setSearching(true);
    setLookupError(null);
    try {
      const data = await api.searchExternal(q);
      setSearchResults(data);
    } catch (err: any) {
      toast.error(err?.message || 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Scan Product
          </h1>
          <p className="mt-1 text-sm text-[#A0AAA5]">
            Scan retail barcodes (EAN-13, EAN-8, UPC-A, UPC-E) or look up Indian & global products manually.
          </p>
        </div>

        <Link to="/compare">
          <Button variant="secondary">
            <GitCompareArrows className="h-4 w-4 text-[#00FFAA]" />
            Scan & Compare Two Products
          </Button>
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Live Camera Scanner */}
        <div className="lg:col-span-7 space-y-4">
          <BarcodeScannerEngine
            onDetected={(code) => void handleLookup(code, 'camera')}
          />

          {lookingUp && (
            <div className="rounded-xl border border-[#00FFAA]/30 bg-[#00FFAA]/10 px-4 py-3 text-sm text-[#00FFAA]">
              Retrieving verified product data and calculating SUvita Score...
            </div>
          )}

          {lookupError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-[#E05A5A]/30 bg-[#E05A5A]/10 px-4 py-3.5 text-sm text-[#F38B8B]"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p>{lookupError}</p>
                <p className="mt-1 text-xs text-[#F38B8B]/80">
                  Tip: Use the product name search panel on the right or test with an Indian 890 demo barcode below.
                </p>
              </div>
            </div>
          )}

          {/* Quick Demo Barcodes (clearly labelled) */}
          <div className="rounded-xl border border-white/[0.08] bg-[#202923] p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">
                Quick-Test Demo Barcodes (India Catalog)
              </h2>
              <span className="text-[11px] text-[#8E9B94]">Clearly labelled sample data</span>
            </div>
            <p className="mt-1 text-xs text-[#A0AAA5]">
              Testing on desktop without a physical product? Click any sample barcode below to inspect the full analysis pipeline.
            </p>
            <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_BARCODES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  disabled={lookingUp}
                  onClick={() => void handleLookup(item.code, 'manual')}
                  className="flex flex-col rounded-lg border border-white/[0.07] bg-[#161D1A] px-3 py-2.5 text-left hover:border-[#00FFAA]/45 transition-colors cursor-pointer"
                >
                  <span className="font-mono text-xs text-[#00FFAA] tabular-nums">
                    {item.code}
                  </span>
                  <span className="mt-0.5 text-xs text-[#C8D3CD] truncate">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Manual Entry + Name Search Fallback */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-xl border border-white/[0.08] bg-[#202923] p-5 space-y-3.5">
            <div>
              <h2 className="text-sm font-semibold text-white">Manual Barcode Entry</h2>
              <p className="mt-1 text-xs text-[#A0AAA5]">
                Enter an EAN-13 (e.g. 890... or 3017620422003 for live Open Food Facts lookup).
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleLookup(manualCode, 'manual');
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Barcode className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#7A8781]" />
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter 8–13 digit barcode"
                  aria-label="Manual barcode number"
                  className="pl-9 font-mono"
                />
              </div>
              <Button type="submit" disabled={lookingUp || !manualCode.trim()}>
                Analyze
              </Button>
            </form>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#202923] p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Search by Product Name (Fallback)
              </h2>
              <p className="mt-1 text-xs text-[#A0AAA5]">
                Searches SUvita’s catalog and live Open Food Facts records simultaneously.
              </p>
            </div>
            <form onSubmit={handleNameSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#7A8781]" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="e.g. shampoo, oat milk, chocolate..."
                  aria-label="Search by product name"
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="secondary" disabled={searching}>
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </form>

            {searchResults && (
              <div className="space-y-3 pt-2 border-t border-white/[0.07]">
                {searchResults.local.length === 0 &&
                searchResults.external.length === 0 ? (
                  <p className="text-xs text-[#A0AAA5]">
                    No matching products found. Try another keyword.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {searchResults.local.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={async () => {
                          await recordScan(p, 'search');
                          navigate(`/product/${p.id}`);
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-[#161D1A] px-3 py-2.5 text-left hover:border-[#00FFAA]/40 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium text-white">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-[#8E9B94] truncate">
                            {p.brand} · {formatPriceINR(p.priceCents, p.currency)} · Grade{' '}
                            {p.score.grade}
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-[#00FFAA] shrink-0" />
                      </button>
                    ))}

                    {searchResults.external.map((ext) => (
                      <button
                        key={ext.barcode}
                        type="button"
                        onClick={() => void handleLookup(ext.barcode, 'search')}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-[#161D1A] px-3 py-2.5 text-left hover:border-[#00FFAA]/40 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium text-white">
                            {ext.name}
                          </div>
                          <div className="text-[11px] text-[#8E9B94] truncate">
                            {ext.brand} · {ext.source} · {ext.barcode}
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-[#00FFAA] shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
