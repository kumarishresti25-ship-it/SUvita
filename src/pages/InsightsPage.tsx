import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Info, ScanBarcode } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import {
  CATEGORY_LABELS,
  type InsightsDataDTO,
  type ProductCategory,
  type ScanRecordDTO,
} from '../shared/types';
import { formatRelativeTime } from '../lib/utils';
import { EmptyState, GradeDisplay, SkeletonBlock, SurfaceCard } from '../components/ui/primitives';

const GRADE_COLORS: Record<string, string> = {
  A: '#00FFAA',
  B: '#34D399',
  C: '#FBBF24',
  D: '#FB923C',
  E: '#E05A5A',
};

function computeLocalInsights(scans: ScanRecordDTO[]): InsightsDataDTO {
  const scored = scans.filter((s) => s.ecoscoreSnapshot !== null);
  const averageEcoScore =
    scored.length > 0
      ? Number(
          (
            scored.reduce((acc, s) => acc + (s.ecoscoreSnapshot ?? 0), 0) / scored.length
          ).toFixed(1)
        )
      : null;

  const abRatedCount = scans.filter(
    (s) => s.gradeSnapshot === 'A' || s.gradeSnapshot === 'B'
  ).length;

  const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const s of scans) {
    if (s.gradeSnapshot in gradeCounts) {
      gradeCounts[s.gradeSnapshot] += 1;
    }
  }

  const catBuckets = new Map<ProductCategory, { count: number; sum: number; scoredCount: number }>();
  for (const s of scans) {
    const cat = s.product.category;
    const entry = catBuckets.get(cat) || { count: 0, sum: 0, scoredCount: 0 };
    entry.count += 1;
    if (s.ecoscoreSnapshot !== null) {
      entry.sum += s.ecoscoreSnapshot;
      entry.scoredCount += 1;
    }
    catBuckets.set(cat, entry);
  }

  const categoryBreakdown = Array.from(catBuckets.entries())
    .map(([category, data]) => ({
      category,
      label: CATEGORY_LABELS[category],
      count: data.count,
      avgScore: data.scoredCount > 0 ? Number((data.sum / data.scoredCount).toFixed(1)) : null,
    }))
    .sort((a, b) => b.count - a.count);

  const dayMap = new Map<string, { sum: number; count: number }>();
  const chronological = [...scans].reverse();
  for (const s of chronological) {
    if (s.ecoscoreSnapshot === null) continue;
    const dayKey = new Date(s.scannedAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
    const prev = dayMap.get(dayKey) || { sum: 0, count: 0 };
    prev.sum += s.ecoscoreSnapshot;
    prev.count += 1;
    dayMap.set(dayKey, prev);
  }

  const scoreTrend = Array.from(dayMap.entries()).map(([date, val]) => ({
    date,
    avgScore: Number((val.sum / val.count).toFixed(1)),
    scans: val.count,
  }));

  return {
    totalScans: scans.length,
    averageEcoScore,
    abRatedCount,
    gradeDistribution: ['A', 'B', 'C', 'D', 'E'].map((g) => ({
      grade: g,
      count: gradeCounts[g],
    })),
    categoryBreakdown,
    scoreTrend,
    timeline: scans.slice(0, 12).map((s) => ({
      id: s.id,
      productId: s.productId,
      productName: s.product.name,
      brand: s.product.brand,
      category: s.product.category,
      grade: s.gradeSnapshot,
      score: s.ecoscoreSnapshot,
      scanMethod: s.scanMethod,
      scannedAt: s.scannedAt,
    })),
    methodologyNote:
      'All analytics are calculated strictly from your verified SUvita scans and transparent EcoScore records. SUvita does not fabricate carbon footprint or water-saved estimates.',
  };
}

export const InsightsPage: React.FC = () => {
  const { isAuthenticated, scans } = useApp();
  const [serverInsights, setServerInsights] = useState<InsightsDataDTO | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setServerInsights(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    api
      .getInsights()
      .then((res) => {
        if (mounted) setServerInsights(res);
      })
      .catch(() => {
        if (mounted) setServerInsights(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, scans.length]);

  const data = useMemo(
    () => (isAuthenticated && serverInsights ? serverInsights : computeLocalInsights(scans)),
    [isAuthenticated, serverInsights, scans]
  );

  const topCategory = data.categoryBreakdown[0]?.label || '—';

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Sustainability Insights
          </h1>
          <p className="mt-1.5 text-sm text-[#A0AAA5] max-w-2xl">
            Track your real scanning habits, average SUvita EcoScore progression, and category
            coverage over time.
          </p>
        </div>
        <Link
          to="/scan"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#00FFAA] px-4 text-sm font-semibold text-[#09130F] hover:bg-[#19FFB3] transition-colors whitespace-nowrap shrink-0"
        >
          <ScanBarcode className="h-4 w-4" />
          Scan New Product
        </Link>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : data.totalScans === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="Scan products to unlock personal insights"
          description="Your EcoScore trends, grade distribution, and category breakdown will populate automatically as you scan or inspect products."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/scan"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#00FFAA] px-4 text-sm font-semibold text-[#09130F] hover:bg-[#19FFB3] transition-colors"
              >
                Scan a Product
              </Link>
              <Link
                to="/explore"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 bg-[#202923] px-4 text-sm font-medium text-white hover:border-white/20 transition-colors"
              >
                Explore Catalog
              </Link>
            </div>
          }
        />
      ) : (
        <>
          {/* KPI Row */}
          <section
            aria-label="Personal sustainability KPIs"
            className="grid grid-cols-2 gap-4 lg:grid-cols-4"
          >
            <SurfaceCard>
              <p className="text-xs font-medium text-[#A0AAA5]">Products Scanned</p>
              <p className="mt-2 font-mono text-2xl sm:text-3xl font-bold text-white tabular-nums">
                {data.totalScans}
              </p>
              <p className="mt-1 text-xs text-[#8E9B94]">Verified lookups</p>
            </SurfaceCard>

            <SurfaceCard>
              <p className="text-xs font-medium text-[#A0AAA5]">Average EcoScore</p>
              <p className="mt-2 font-mono text-2xl sm:text-3xl font-bold text-[#00FFAA] tabular-nums">
                {data.averageEcoScore !== null ? data.averageEcoScore.toFixed(1) : '—'}
              </p>
              <p className="mt-1 text-xs text-[#8E9B94]">Out of 100 scale</p>
            </SurfaceCard>

            <SurfaceCard>
              <p className="text-xs font-medium text-[#A0AAA5]">A &amp; B Rated Scans</p>
              <p className="mt-2 font-mono text-2xl sm:text-3xl font-bold text-white tabular-nums">
                {data.abRatedCount}
              </p>
              <p className="mt-1 text-xs text-[#8E9B94]">
                {Math.round((data.abRatedCount / data.totalScans) * 100)}% of scanned items
              </p>
            </SurfaceCard>

            <SurfaceCard>
              <p className="text-xs font-medium text-[#A0AAA5]">Top Scanned Category</p>
              <p className="mt-2 text-lg sm:text-xl font-semibold text-white truncate">
                {topCategory}
              </p>
              <p className="mt-1 text-xs text-[#8E9B94]">
                {data.categoryBreakdown[0]?.count || 0} scans logged
              </p>
            </SurfaceCard>
          </section>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Average EcoScore Trend */}
            <SurfaceCard className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-white">EcoScore Trend Over Time</h2>
                <p className="text-xs text-[#A0AAA5] mt-0.5">
                  Daily average SUvita EcoScore across your scored scans
                </p>
              </div>
              <div className="h-64 w-full">
                {data.scoreTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.scoreTrend}
                      margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="suvitaScoreGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00FFAA" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#00FFAA" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#8E9B94"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="#8E9B94"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#161D1A',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#FFFFFF',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="avgScore"
                        name="Avg EcoScore"
                        stroke="#00FFAA"
                        strokeWidth={2}
                        fill="url(#suvitaScoreGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[#8E9B94]">
                    Scan products with complete scores to plot your trend line.
                  </div>
                )}
              </div>
            </SurfaceCard>

            {/* EcoScore Grade Distribution */}
            <SurfaceCard className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-white">EcoScore Grade Distribution</h2>
                <p className="text-xs text-[#A0AAA5] mt-0.5">
                  Count of scanned products across sustainability grades A through E
                </p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.gradeDistribution}
                    margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="grade"
                      stroke="#8E9B94"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke="#8E9B94"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      contentStyle={{
                        backgroundColor: '#161D1A',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#FFFFFF',
                      }}
                    />
                    <Bar dataKey="count" name="Scans" radius={[6, 6, 0, 0]} maxBarSize={44}>
                      {data.gradeDistribution.map((entry) => (
                        <Cell
                          key={entry.grade}
                          fill={GRADE_COLORS[entry.grade] || '#A0AAA5'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SurfaceCard>
          </div>

          {/* Category Breakdown + Personal Timeline */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <SurfaceCard className="lg:col-span-5 space-y-4">
              <h2 className="text-base font-semibold text-white">Category Breakdown</h2>
              <div className="space-y-4">
                {data.categoryBreakdown.map((item) => {
                  const pct = Math.round((item.count / data.totalScans) * 100);
                  return (
                    <div key={item.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-white">{item.label}</span>
                        <span className="font-mono text-xs text-[#A0AAA5] tabular-nums">
                          {item.count} {item.count === 1 ? 'scan' : 'scans'} ·{' '}
                          {item.avgScore !== null ? `Avg ${item.avgScore}` : 'Unscored'}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#151C19]">
                        <div
                          className="h-full rounded-full bg-[#00FFAA]"
                          style={{ width: `${Math.max(pct, 6)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SurfaceCard>

            <SurfaceCard className="lg:col-span-7 space-y-4">
              <h2 className="text-base font-semibold text-white">Recent Sustainability Timeline</h2>
              <div className="divide-y divide-white/[0.07]">
                {data.timeline.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/product/${event.productId}`}
                        className="block truncate text-sm font-medium text-white hover:text-[#00FFAA]"
                      >
                        {event.productName}
                      </Link>
                      <p className="text-xs text-[#A0AAA5] truncate">
                        {event.brand} · {CATEGORY_LABELS[event.category]} ·{' '}
                        {formatRelativeTime(event.scannedAt)}
                      </p>
                    </div>
                    <GradeDisplay grade={event.grade} score={event.score} size="sm" />
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </div>
        </>
      )}

      {/* Honest Data Integrity Footnote */}
      <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#1C2421] p-4 text-xs text-[#A0AAA5] leading-relaxed">
        <Info className="h-4 w-4 text-[#00FFAA] shrink-0 mt-0.5" aria-hidden="true" />
        <p>{data.methodologyNote}</p>
      </div>
    </div>
  );
};
