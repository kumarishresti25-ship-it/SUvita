import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Compass, RotateCcw, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { CATEGORY_LABELS, type EcoGrade, type ProductCategory, type ProductDTO } from '../shared/types';
import { ProductCard } from '../components/common/ProductCard';
import { Button, EmptyState, Input, SkeletonBlock } from '../components/ui/primitives';

const CATEGORY_OPTIONS: Array<{ value: 'all' | ProductCategory; label: string }> = [
  { value: 'all', label: 'All Categories' },
  { value: 'food_beverages', label: CATEGORY_LABELS.food_beverages },
  { value: 'beauty_cosmetics', label: CATEGORY_LABELS.beauty_cosmetics },
  { value: 'personal_care', label: CATEGORY_LABELS.personal_care },
  { value: 'household', label: CATEGORY_LABELS.household },
];

const GRADE_OPTIONS: Array<'all' | Exclude<EcoGrade, 'INSUFFICIENT_DATA'>> = [
  'all',
  'A',
  'B',
  'C',
  'D',
  'E',
];

const SORT_OPTIONS = [
  { value: 'score_desc', label: 'Highest EcoScore' },
  { value: 'score_asc', label: 'Lowest EcoScore' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'name_asc', label: 'Name (A–Z)' },
];

export const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = (searchParams.get('category') as 'all' | ProductCategory) || 'all';

  const [searchInput, setSearchInput] = useState(initialQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(initialQuery);
  const [category, setCategory] = useState<'all' | ProductCategory>(initialCategory);
  const [grade, setGrade] = useState<'all' | Exclude<EcoGrade, 'INSUFFICIENT_DATA'>>('all');
  const [sort, setSort] = useState('score_desc');

  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 220);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedSearch) next.set('q', debouncedSearch);
    if (category !== 'all') next.set('category', category);
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, category, setSearchParams]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getProducts({
        search: debouncedSearch || undefined,
        category: category === 'all' ? undefined : category,
        grade: grade === 'all' ? undefined : grade,
        sort,
      });
      setProducts(res.products);
    } catch (err: any) {
      setError(err?.message || 'Could not load products right now.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, grade, sort]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const hasActiveFilters =
    Boolean(debouncedSearch) || category !== 'all' || grade !== 'all' || sort !== 'score_desc';

  const resetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setCategory('all');
    setGrade('all');
    setSort('score_desc');
  };

  const featuredTopRated = useMemo(
    () =>
      products
        .filter((p) => p.score.grade === 'A' && p.score.overallScore !== null)
        .slice(0, 3),
    [products]
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Explore Products
          </h1>
          <p className="mt-1.5 text-sm text-[#A0AAA5] max-w-2xl">
            Browse transparent sustainability intelligence across Indian household, personal care,
            beauty, and food staples. Filter by category, SUvita EcoScore grade, or search by brand.
          </p>
        </div>
        <Link
          to="/scan"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[#00FFAA] px-4 text-sm font-semibold text-[#09130F] hover:bg-[#19FFB3] transition-colors whitespace-nowrap shrink-0"
        >
          Scan a Barcode
        </Link>
      </header>

      {/* Search & Filter Toolbar */}
      <section
        aria-label="Product filters"
        className="rounded-xl border border-white/[0.08] bg-[#1C2421] p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A8781]"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products, brands, or barcodes (e.g. shampoo, oat milk, 890...)"
              aria-label="Search products"
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <SlidersHorizontal className="h-4 w-4 text-[#8E9B94] shrink-0" aria-hidden="true" />
            <label htmlFor="explore-sort" className="sr-only">
              Sort products
            </label>
            <select
              id="explore-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-10 rounded-lg border border-white/10 bg-[#161D1A] px-3 text-sm text-white focus:border-[#00FFAA]/60 focus:outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#161D1A]">
                  {opt.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Category & EcoScore Grade Controls */}
        <div className="flex flex-col gap-3 pt-1 lg:flex-row lg:items-center lg:justify-between border-t border-white/[0.06]">
          <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-2" role="group" aria-label="Filter by category">
            {CATEGORY_OPTIONS.map((opt) => {
              const active = category === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategory(opt.value)}
                  className={`h-8 rounded-lg px-3 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#00FFAA] text-[#09130F] font-semibold'
                      : 'bg-[#161D1A] text-[#A0AAA5] border border-white/[0.08] hover:text-white hover:border-white/20'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 pt-1 lg:pt-2" role="group" aria-label="Filter by EcoScore grade">
            <span className="text-xs text-[#8E9B94] mr-1">EcoScore:</span>
            {GRADE_OPTIONS.map((g) => {
              const active = grade === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`h-8 min-w-8 rounded-lg px-2.5 font-mono text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#00FFAA]/15 text-[#00FFAA] border border-[#00FFAA]/40'
                      : 'bg-[#161D1A] text-[#A0AAA5] border border-white/[0.08] hover:text-white'
                  }`}
                >
                  {g === 'all' ? 'All' : g}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Top-Rated Section (shown on default unfiltered browse) */}
      {!loading && !error && !hasActiveFilters && featuredTopRated.length > 0 && (
        <section aria-labelledby="featured-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#00FFAA]" aria-hidden="true" />
              <h2 id="featured-heading" className="text-lg font-semibold text-white">
                Top-Rated Sustainable Picks
              </h2>
            </div>
            <span className="text-xs text-[#8E9B94] font-mono tabular-nums">
              Grade A · 80–100 EcoScore
            </span>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredTopRated.map((p) => (
              <ProductCard
                key={`featured-${p.id}`}
                product={p}
                highlightNote={p.score.strongestFactor ? `Strongest: ${p.score.strongestFactor}` : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {/* Main Catalog Grid */}
      <section aria-labelledby="catalog-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="catalog-heading" className="text-lg font-semibold text-white">
            {hasActiveFilters ? 'Matching Products' : 'All Products'}
          </h2>
          {!loading && (
            <span className="font-mono text-xs text-[#A0AAA5] tabular-nums">
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </span>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-[#E05A5A]/30 bg-[#E05A5A]/10 p-4 flex items-center justify-between gap-4"
          >
            <p className="text-sm text-[#F38B8B]">{error}</p>
            <Button variant="secondary" size="sm" onClick={loadProducts}>
              Try Again
            </Button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-white/[0.08] bg-[#202923] p-4 space-y-3"
              >
                <SkeletonBlock className="aspect-[4/3] w-full" />
                <SkeletonBlock className="h-4 w-2/3" />
                <SkeletonBlock className="h-5 w-4/5" />
                <SkeletonBlock className="h-9 w-full" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Compass className="h-6 w-6" />}
            title="No matching products found"
            description="Try adjusting your category or EcoScore filter, or scan the product's barcode directly to fetch live Open Food Facts or Open Beauty Facts data."
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button variant="secondary" onClick={resetFilters}>
                  Reset Filters
                </Button>
                <Link
                  to="/scan"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#00FFAA] px-4 text-sm font-semibold text-[#09130F] hover:bg-[#19FFB3] transition-colors"
                >
                  Scan Barcode
                </Link>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
