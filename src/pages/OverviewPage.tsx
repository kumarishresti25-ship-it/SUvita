import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Barcode,
  Bot,
  GitCompareArrows,
  Lightbulb,
  ScanBarcode,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { formatRelativeTime, getGreeting } from '../lib/utils';
import { CATEGORY_LABELS, type ProductDTO } from '../shared/types';
import { ProductCard } from '../components/common/ProductCard';
import {
  Button,
  EmptyState,
  GradeDisplay,
  Input,
  ProductImage,
  SkeletonBlock,
} from '../components/ui/primitives';

const HERO_IMAGE = '/src/assets/images/suvita_scan_hero_1795708656819.jpg';

export const OverviewPage: React.FC = () => {
  const { profile, preferences, scans, savedProducts, recordScan } = useApp();
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState<ProductDTO[]>([]);
  const [insight, setInsight] = useState<{
    title: string;
    body: string;
    source: string;
    category: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualBarcode, setManualBarcode] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([api.getProducts({ sort: 'score_desc' }), api.getDailyInsight()])
      .then(([prodRes, daily]) => {
        if (!active) return;
        setCatalog(prodRes.products);
        setInsight(daily);
      })
      .catch((err) => console.error('Failed to load overview data:', err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Compute real dashboard metrics exclusively from user's actual scans & saved products
  const stats = useMemo(() => {
    const scoredScans = scans.filter((s) => s.ecoscoreSnapshot !== null);
    const avgScore =
      scoredScans.length > 0
        ? Math.round(
            (scoredScans.reduce((acc, s) => acc + (s.ecoscoreSnapshot as number), 0) /
              scoredScans.length) *
              10
          ) / 10
        : null;

    const sustainableIds = new Set<number>();
    for (const s of scans) {
      if (s.gradeSnapshot === 'A' || s.gradeSnapshot === 'B') {
        sustainableIds.add(s.productId);
      }
    }
    for (const item of savedProducts) {
      if (item.product.score.grade === 'A' || item.product.score.grade === 'B') {
        sustainableIds.add(item.productId);
      }
    }

    return {
      totalScans: scans.length,
      avgScore,
      sustainableCount: sustainableIds.size,
      savedCount: savedProducts.length,
    };
  }, [scans, savedProducts]);

  // Personalized Discover Better Alternatives driven by user's preferred categories & priorities
  const discoverAlternatives = useMemo(() => {
    const prefCats = preferences.preferredCategories || [];
    const priorities = preferences.priorities || [];

    return catalog
      .filter((p) => p.score.grade === 'A' || p.score.grade === 'B')
      .sort((a, b) => {
        let scoreA = a.score.overallScore ?? 0;
        let scoreB = b.score.overallScore ?? 0;
        if (prefCats.includes(a.category)) scoreA += 10;
        if (prefCats.includes(b.category)) scoreB += 10;
        if (priorities.includes('packaging')) {
          scoreA += (a.score.packagingScore ?? 0) * 0.1;
          scoreB += (b.score.packagingScore ?? 0) * 0.1;
        }
        if (priorities.includes('ingredient_transparency')) {
          scoreA += (a.score.ingredientScore ?? 0) * 0.1;
          scoreB += (b.score.ingredientScore ?? 0) * 0.1;
        }
        return scoreB - scoreA;
      })
      .slice(0, 4);
  }, [catalog, preferences.preferredCategories, preferences.priorities]);

  const handleManualBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = manualBarcode.trim();
    if (!cleaned) return;
    setLookingUp(true);
    try {
      const res = await api.lookupBarcode(cleaned);
      await recordScan(res.product, 'manual');
      toast.success(`Analyzed ${res.product.name}`);
      navigate(`/product/${res.product.id}`);
    } catch (err: any) {
      toast.error(err?.message || 'Barcode not found. Try searching by name.');
    } finally {
      setLookingUp(false);
    }
  };

  const handleNameSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = nameQuery.trim();
    if (!q) return;
    navigate(`/explore?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="space-y-8">
      {/* Top Greeting Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            {getGreeting()}, {profile.displayName}
          </h1>
          <p className="mt-1 text-sm text-[#A0AAA5]">
            Make better choices, one product at a time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/compare">
            <Button variant="secondary" size="sm">
              <GitCompareArrows className="h-4 w-4" />
              Scan & Compare
            </Button>
          </Link>
          <Link to="/assistant">
            <Button variant="secondary" size="sm">
              <Bot className="h-4 w-4 text-[#00FFAA]" />
              Ask SUvita AI
            </Button>
          </Link>
        </div>
      </header>

      {/* Prominent Product-Scanning Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch rounded-2xl border border-white/[0.08] bg-[#1C2421] overflow-hidden">
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-[#00FFAA]">
              Product Intelligence · India (INR ₹)
            </p>
            <h2 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-white">
              Scan any barcode to reveal real ingredients, transparent EcoScores, and greener swaps.
            </h2>
            <p className="mt-2 text-sm text-[#A0AAA5] leading-relaxed max-w-xl">
              Evaluate food, beauty, personal care, and household products across Ingredient Safety (40%), Packaging Type (30%), Brand Ethics (20%), and Energy Footprint (10%).
            </p>

            <div className="mt-6 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
              <Link to="/scan" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  <ScanBarcode className="h-4 w-4" />
                  Scan Product
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/compare" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  <GitCompareArrows className="h-4 w-4" />
                  Compare Two Products
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-3">
            <form onSubmit={handleManualBarcodeSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#7A8781]" />
                <Input
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="Enter barcode (e.g. 8903300003040)"
                  aria-label="Enter barcode manually"
                  className="pl-9 font-mono text-xs"
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                disabled={lookingUp || !manualBarcode.trim()}
              >
                {lookingUp ? '...' : 'Go'}
              </Button>
            </form>

            <form onSubmit={handleNameSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#7A8781]" />
                <Input
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  placeholder="Search product by name..."
                  aria-label="Search product by name"
                  className="pl-9 text-xs"
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                disabled={!nameQuery.trim()}
              >
                Find
              </Button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-5 relative min-h-[220px] lg:min-h-full bg-[#141916]">
          <img
            src={HERO_IMAGE}
            alt="SUvita precision barcode scanning on frosted glass organic bottle and refillable serum"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1C2421] via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#1C2421]/60 lg:via-transparent lg:to-transparent" />
        </div>
      </section>

      {/* 4-Column Real User KPI Strip */}
      <section aria-label="Your sustainability metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#202923] p-5">
          <div className="text-xs font-medium text-[#A0AAA5]">Products Scanned</div>
          <div className="mt-2 font-mono text-3xl font-semibold text-white tabular-nums">
            {stats.totalScans}
          </div>
          <div className="mt-1 text-xs text-[#8E9B94]">
            {stats.totalScans === 0 ? 'Start with your first scan' : 'Logged in your history'}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#202923] p-5">
          <div className="text-xs font-medium text-[#A0AAA5]">Average EcoScore</div>
          <div className="mt-2 font-mono text-3xl font-semibold text-[#00FFAA] tabular-nums">
            {stats.avgScore !== null ? stats.avgScore.toFixed(1) : '—'}
          </div>
          <div className="mt-1 text-xs text-[#8E9B94]">
            {stats.avgScore !== null ? 'Out of 100 weighted scale' : 'Scan to calculate'}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#202923] p-5">
          <div className="text-xs font-medium text-[#A0AAA5]">Sustainable Discovered</div>
          <div className="mt-2 font-mono text-3xl font-semibold text-white tabular-nums">
            {stats.sustainableCount}
          </div>
          <div className="mt-1 text-xs text-[#8E9B94]">Grade A or B products found</div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#202923] p-5">
          <div className="text-xs font-medium text-[#A0AAA5]">Products Saved</div>
          <div className="mt-2 font-mono text-3xl font-semibold text-white tabular-nums">
            {stats.savedCount}
          </div>
          <div className="mt-1 text-xs text-[#8E9B94]">
            <Link to="/collection" className="hover:text-[#00FFAA] transition-colors">
              Open My Collection
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Activity + Insight of the Day */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Scan Activity</h2>
            {scans.length > 0 && (
              <Link
                to="/collection"
                className="text-xs font-medium text-[#00FFAA] hover:underline"
              >
                View all history
              </Link>
            )}
          </div>

          {scans.length === 0 ? (
            <EmptyState
              icon={<ScanBarcode className="h-6 w-6" />}
              title="No products scanned yet"
              description="Scan your first barcode using your camera or enter an Indian retail barcode manually to build your personal sustainability profile."
              action={
                <div className="flex flex-wrap justify-center gap-2.5">
                  <Link to="/scan">
                    <Button>
                      <ScanBarcode className="h-4 w-4" />
                      Start Your First Scan
                    </Button>
                  </Link>
                  <Link to="/explore">
                    <Button variant="secondary">Browse Catalog</Button>
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="rounded-xl border border-white/[0.08] bg-[#202923] divide-y divide-white/[0.06]">
              {scans.slice(0, 5).map((scan) => (
                <Link
                  key={scan.id}
                  to={`/product/${scan.productId}`}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <ProductImage
                      src={scan.product.imageUrl}
                      alt={scan.product.name}
                      className="h-12 w-12 shrink-0 rounded-lg border border-white/10"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">
                        {scan.product.name}
                      </div>
                      <div className="mt-0.5 text-xs text-[#A0AAA5] truncate">
                        {scan.product.brand} · {CATEGORY_LABELS[scan.product.category]} ·{' '}
                        {formatRelativeTime(scan.scannedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <GradeDisplay
                      grade={scan.gradeSnapshot}
                      score={scan.ecoscoreSnapshot}
                      size="sm"
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sustainability Insight of the Day */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Sustainability Insight of the Day
          </h2>
          {loading || !insight ? (
            <SkeletonBlock className="h-52 w-full" />
          ) : (
            <div className="rounded-xl border border-white/[0.08] bg-[#202923] p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-medium text-[#00FFAA]">
                <Lightbulb className="h-4 w-4" />
                <span>{insight.category}</span>
              </div>
              <h3 className="text-base font-semibold text-white leading-snug">
                {insight.title}
              </h3>
              <p className="text-sm text-[#A0AAA5] leading-relaxed">
                {insight.body}
              </p>
              <div className="pt-3 border-t border-white/[0.07] flex items-center justify-between text-xs text-[#8E9B94]">
                <span>Source: {insight.source}</span>
                <Link
                  to="/assistant"
                  className="font-medium text-[#00FFAA] hover:underline"
                >
                  Ask SUvita AI
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Discover Better Alternatives */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Discover Better Alternatives
            </h2>
            <p className="mt-0.5 text-xs text-[#A0AAA5]">
              Personalized for your preferred categories and sustainability priorities
            </p>
          </div>
          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#00FFAA] hover:underline"
          >
            Explore all products
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonBlock key={i} className="h-72 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {discoverAlternatives.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
