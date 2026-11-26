import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import type { ComparisonPayloadDTO, ProductDTO } from '../shared/types';
import { ComparisonResults } from '../components/comparison/ComparisonResults';
import { ComparisonScanner } from '../components/comparison/ComparisonScanner';
import { Button, SkeletonBlock } from '../components/ui/primitives';

export const ComparePage: React.FC = () => {
  const { compareIds, setCompareIds, savedComparisons, deleteSavedComparison } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [catalog, setCatalog] = useState<ProductDTO[]>([]);
  const [productA, setProductA] = useState<ProductDTO | null>(null);
  const [productB, setProductB] = useState<ProductDTO | null>(null);
  const [productC, setProductC] = useState<ProductDTO | null>(null);
  const [viewMode, setViewMode] = useState<'scan' | 'results'>('scan');
  const [comparisonData, setComparisonData] = useState<ComparisonPayloadDTO | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // Load catalog + initialize from ?ids= or AppContext compareIds
  useEffect(() => {
    let active = true;
    api
      .getProducts({ sort: 'score_desc' })
      .then(({ products }) => {
        if (!active) return;
        setCatalog(products);

        const urlIdsRaw = searchParams.get('ids');
        const initialIds = urlIdsRaw
          ? urlIdsRaw
              .split(',')
              .map(Number)
              .filter((n) => Number.isInteger(n) && n > 0)
          : compareIds;

        if (initialIds.length > 0) {
          const found = initialIds
            .map((id) => products.find((p) => p.id === id))
            .filter((p): p is ProductDTO => Boolean(p));

          if (found[0]) setProductA(found[0]);
          if (found[1]) setProductB(found[1]);
          if (found[2]) setProductC(found[2]);
          if (found.length >= 2) {
            setViewMode('results');
          }
        }
      })
      .catch((err) => console.error('Failed to load catalog for comparison:', err));

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute backend comparison dynamically whenever products change in results mode
  useEffect(() => {
    const activeIds = [productA?.id, productB?.id, productC?.id].filter(
      (id): id is number => Boolean(id)
    );
    setCompareIds(activeIds);

    if (viewMode !== 'results' || activeIds.length < 2) {
      return;
    }

    let active = true;
    setLoadingResults(true);
    setSearchParams({ ids: activeIds.join(',') }, { replace: true });

    api
      .getComparisonData(activeIds)
      .then((payload) => {
        if (active) setComparisonData(payload);
      })
      .catch((err: any) => {
        if (active) toast.error(err?.message || 'Comparison failed');
      })
      .finally(() => {
        if (active) setLoadingResults(false);
      });

    return () => {
      active = false;
    };
  }, [productA?.id, productB?.id, productC?.id, viewMode, setCompareIds, setSearchParams]);

  const handleScanAnotherPair = () => {
    setProductA(null);
    setProductB(null);
    setProductC(null);
    setComparisonData(null);
    setSearchParams({}, { replace: true });
    setViewMode('scan');
  };

  const handleSwapWithAlternative = (altId: number) => {
    const alt = catalog.find((p) => p.id === altId);
    if (!alt) return;
    if (!productC) {
      setProductC(alt);
      toast.success(`Added ${alt.name} as 3rd product in comparison`);
    } else {
      setProductB(alt);
      toast.success(`Replaced Product B with ${alt.name}`);
    }
  };

  const availableForThird = catalog.filter(
    (p) => p.id !== productA?.id && p.id !== productB?.id && p.id !== productC?.id
  );

  return (
    <div className="space-y-8">
      {viewMode === 'scan' ? (
        <ComparisonScanner
          productA={productA}
          productB={productB}
          onSetProductA={setProductA}
          onSetProductB={setProductB}
          onCompareReady={() => setViewMode('results')}
          catalog={catalog}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Product Comparison Results
              </h1>
              <p className="mt-1 text-sm text-[#A0AAA5]">
                Side-by-side SUvita Score, ingredient profile, packaging, INR value, and confidence breakdown.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {!productC && availableForThird.length > 0 && (
                <select
                  aria-label="Add a third product to comparison"
                  value=""
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const found = catalog.find((p) => p.id === id);
                    if (found) setProductC(found);
                  }}
                  className="h-10 rounded-lg border border-white/10 bg-[#1C2421] px-3 text-xs text-white focus:border-[#00FFAA]/60 focus:outline-none"
                >
                  <option value="">+ Add 3rd Product</option>
                  {availableForThird.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Grade {p.score.grade})
                    </option>
                  ))}
                </select>
              )}

              {productC && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setProductC(null)}
                >
                  Remove 3rd Product
                </Button>
              )}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setViewMode('scan')}
              >
                <Plus className="h-3.5 w-3.5" />
                Change Products
              </Button>
            </div>
          </div>

          {loadingResults || !comparisonData ? (
            <div className="space-y-4">
              <SkeletonBlock className="h-44 w-full" />
              <SkeletonBlock className="h-36 w-full" />
              <SkeletonBlock className="h-36 w-full" />
            </div>
          ) : (
            <ComparisonResults
              data={comparisonData}
              onScanAnotherPair={handleScanAnotherPair}
              onSwapWithAlternative={handleSwapWithAlternative}
            />
          )}
        </div>
      )}

      {/* Saved Comparisons Strip */}
      {savedComparisons.length > 0 && (
        <section className="space-y-3 pt-4 border-t border-white/[0.08]">
          <h2 className="text-base font-semibold text-white">Your Saved Comparisons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {savedComparisons.map((comp) => (
              <div
                key={comp.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#202923] p-4"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (comp.products[0]) setProductA(comp.products[0]);
                    if (comp.products[1]) setProductB(comp.products[1]);
                    setProductC(comp.products[2] || null);
                    setViewMode('results');
                  }}
                  className="min-w-0 flex-1 text-left cursor-pointer"
                >
                  <div className="truncate text-sm font-medium text-white hover:text-[#00FFAA]">
                    {comp.title}
                  </div>
                  {comp.summarySnapshot && (
                    <p className="mt-0.5 truncate text-xs text-[#A0AAA5]">
                      {comp.summarySnapshot}
                    </p>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteSavedComparison(comp.id)}
                  aria-label={`Delete saved comparison ${comp.title}`}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#8E9B94] hover:bg-white/5 hover:text-[#F38B8B] cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
