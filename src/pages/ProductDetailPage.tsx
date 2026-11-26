import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Bot,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  GitCompareArrows,
  Info,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import {
  CATEGORY_LABELS,
  formatPriceINR,
  type AlternativeRecommendationDTO,
  type ProductDTO,
} from '../shared/types';
import {
  Button,
  EmptyState,
  GradeDisplay,
  ProductImage,
  SkeletonBlock,
} from '../components/ui/primitives';

type IngredientFilter = 'all' | 'attention' | 'limited_info';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    isProductSaved,
    toggleSaveProduct,
    collections,
    addToCollection,
    setCompareIds,
    setAIContext,
  } = useApp();

  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeRecommendationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedDims, setExpandedDims] = useState<Record<string, boolean>>({});
  const [ingredientFilter, setIngredientFilter] = useState<IngredientFilter>('all');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [brief, setBrief] = useState<{
    summary: string;
    keyTakeaways: string[];
    caveat: string;
    generatedByAi: boolean;
  } | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError(null);
    setBrief(null);
    api
      .getProduct(id)
      .then((res) => {
        if (!active) return;
        setProduct(res.product);
        setAlternatives(res.alternatives);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || 'Unable to load product analysis.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const filteredIngredients = useMemo(() => {
    if (!product) return [];
    if (ingredientFilter === 'all') return product.ingredients;
    return product.ingredients.filter((i) => i.safetyStatus === ingredientFilter);
  }, [product, ingredientFilter]);

  const chartData = useMemo(() => {
    if (!product) return [];
    return product.score.dimensions.map((d) => ({
      name: d.label.replace(' ', '\n'),
      short: d.label,
      score: d.score ?? 0,
      available: d.available,
      weight: d.weightPercent,
    }));
  }, [product]);

  const handleAskAI = (customPrompt?: string) => {
    if (!product) return;
    setAIContext({
      product,
      comparisonProducts: null,
      initialPrompt:
        customPrompt ||
        `Explain ${product.name}'s SUvita Score, strengths, weaknesses, and any missing data.`,
    });
    navigate('/assistant');
  };

  const handleCompareWith = (altId: number) => {
    if (!product) return;
    setCompareIds([product.id, altId]);
    navigate(`/compare?ids=${product.id},${altId}`);
  };

  const handleLoadBrief = async () => {
    if (!product) return;
    setLoadingBrief(true);
    try {
      const res = await api.generateProductBrief(String(product.id));
      setBrief(res);
    } catch (err: any) {
      toast.error(err?.message || 'Could not generate sustainability brief.');
    } finally {
      setLoadingBrief(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-8 w-44" />
        <SkeletonBlock className="h-64 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonBlock className="h-44 w-full" />
          <SkeletonBlock className="h-44 w-full" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-6 w-6" />}
        title="Product analysis unavailable"
        description={error || 'The requested product could not be found.'}
        action={
          <Link to="/explore">
            <Button>Back to Explore Products</Button>
          </Link>
        }
      />
    );
  }

  const saved = isProductSaved(product.id);
  const attentionCount = product.ingredients.filter(
    (i) => i.safetyStatus === 'attention'
  ).length;
  const limitedCount = product.ingredients.filter(
    (i) => i.safetyStatus === 'limited_info'
  ).length;

  return (
    <div className="space-y-8">
      {/* Breadcrumb & Back */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A0AAA5] hover:text-white cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <div className="text-xs text-[#8E9B94] font-mono tabular-nums">
          Barcode {product.barcode} · {product.sourceLabel}
        </div>
      </div>

      {/* Hero Product Identity + EcoScore Card */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-[#202923] p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div className="flex flex-col sm:flex-row gap-5">
            <ProductImage
              src={product.imageUrl}
              alt={product.name}
              className="h-48 sm:h-44 w-full sm:w-44 shrink-0 rounded-xl border border-white/10"
            />

            <div className="flex flex-1 flex-col justify-between min-w-0">
              <div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#A0AAA5]">
                  <span className="font-medium text-white">{product.brand}</span>
                  <span aria-hidden="true">·</span>
                  <span>{CATEGORY_LABELS[product.category]}</span>
                  {product.originCountry && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{product.originCountry}</span>
                    </>
                  )}
                </div>

                <h1 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-white">
                  {product.name}
                </h1>

                <p className="mt-2 text-sm text-[#A0AAA5] leading-relaxed">
                  {product.description}
                </p>

                <div className="mt-3.5 flex flex-wrap items-baseline gap-3 text-sm">
                  <span className="font-mono text-lg font-semibold text-white tabular-nums">
                    {formatPriceINR(product.priceCents, product.currency)}
                  </span>
                  {product.packagingSummary && (
                    <span className="text-xs text-[#8E9B94]">
                      Packaging: {product.packagingSummary}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.07] flex flex-wrap items-center gap-2.5">
            <Button type="button" onClick={() => handleAskAI()}>
              <Bot className="h-4 w-4" />
              Ask SUvita AI
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => void toggleSaveProduct(product)}
            >
              {saved ? (
                <BookmarkCheck className="h-4 w-4 text-[#00FFAA]" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
              {saved ? 'Saved' : 'Save'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCompareIds((prev) =>
                  prev.includes(product.id)
                    ? prev
                    : [...prev.slice(0, 2), product.id]
                );
                navigate('/compare');
              }}
            >
              <GitCompareArrows className="h-4 w-4" />
              Compare
            </Button>

            {collections.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  aria-label="Add product to a collection"
                  value={selectedCollectionId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedCollectionId(val);
                    if (val) {
                      void addToCollection(Number(val), product);
                      setSelectedCollectionId('');
                    }
                  }}
                  className="h-10 rounded-lg border border-white/10 bg-[#161D1A] px-2.5 text-xs text-white focus:border-[#00FFAA]/60 focus:outline-none cursor-pointer"
                >
                  <option value="">+ Add to Collection</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#161D1A]">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Large Transparent EcoScore Card */}
        <div className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#1C2421] p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#00FFAA]">
                SUvita EcoScore
              </span>
              <span className="font-mono text-xs text-[#A0AAA5] tabular-nums">
                {product.score.confidencePercent}% confidence ({product.score.confidenceLevel})
              </span>
            </div>

            <div className="mt-4">
              <GradeDisplay
                grade={product.score.grade}
                score={product.score.overallScore}
                size="lg"
              />
            </div>

            {/* Grade Scale Key */}
            <div className="mt-5 grid grid-cols-5 gap-1.5 text-center font-mono text-[11px] tabular-nums">
              {[
                { g: 'A', label: '80–100', active: product.score.grade === 'A' },
                { g: 'B', label: '65–79', active: product.score.grade === 'B' },
                { g: 'C', label: '50–64', active: product.score.grade === 'C' },
                { g: 'D', label: '35–49', active: product.score.grade === 'D' },
                { g: 'E', label: '0–34', active: product.score.grade === 'E' },
              ].map((tier) => (
                <div
                  key={tier.g}
                  className={`rounded-md py-1.5 border ${
                    tier.active
                      ? 'border-[#00FFAA] bg-[#00FFAA]/15 text-[#00FFAA] font-semibold'
                      : 'border-white/[0.06] bg-[#161D1A] text-[#8E9B94]'
                  }`}
                >
                  <div>{tier.g}</div>
                  <div className="text-[10px] opacity-80">{tier.label}</div>
                </div>
              ))}
            </div>

            {product.score.missingNotice && (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-200 leading-relaxed">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <p>{product.score.missingNotice}</p>
                  {product.score.observedSubscoreAverage !== null && (
                    <p className="mt-1 font-mono text-[11px] text-amber-300/90 tabular-nums">
                      Average across available dimensions only: {product.score.observedSubscoreAverage}/100
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.07] flex items-center justify-between text-[11px] text-[#8E9B94]">
            <span>{product.score.methodologyVersion}</span>
            <span>{product.isSampleData ? 'Demo Reference Record' : 'Verified External API'}</span>
          </div>
        </div>
      </section>

      {/* Why did this product receive this score? */}
      <section className="rounded-xl border border-white/[0.08] bg-[#202923] p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Why did this product receive this score?
            </h2>
            <p className="mt-0.5 text-xs text-[#A0AAA5]">
              Weighted formula: Ingredient Safety (40%) + Packaging Type (30%) + Brand Ethics (20%) + Energy Footprint (10%)
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleLoadBrief}
            disabled={loadingBrief}
          >
            <Sparkles className="h-3.5 w-3.5 text-[#00FFAA]" />
            {loadingBrief ? 'Generating brief...' : 'Generate Plain-Language Brief'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-white/[0.07] bg-[#161D1A] p-4">
            <div className="text-xs font-medium text-[#00FFAA]">Strongest Factor</div>
            <div className="mt-1 text-sm font-semibold text-white">
              {product.score.strongestFactor || 'Insufficient data'}
            </div>
          </div>
          <div className="rounded-lg border border-white/[0.07] bg-[#161D1A] p-4">
            <div className="text-xs font-medium text-amber-400">Weakest Factor</div>
            <div className="mt-1 text-sm font-semibold text-white">
              {product.score.weakestFactor || 'Insufficient data'}
            </div>
          </div>
        </div>

        {brief && (
          <div className="rounded-xl border border-[#00FFAA]/25 bg-[#18211D] p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[#00FFAA] font-medium">
              <span>{brief.generatedByAi ? 'SUvita AI Grounded Brief' : 'Structured Methodology Summary'}</span>
            </div>
            <p className="text-sm text-white leading-relaxed">{brief.summary}</p>
            <ul className="space-y-1 text-xs text-[#C8D3CD]">
              {brief.keyTakeaways.map((t, i) => (
                <li key={i}>• {t}</li>
              ))}
            </ul>
            <p className="text-[11px] text-[#8E9B94] pt-1">{brief.caveat}</p>
          </div>
        )}
      </section>

      {/* Interactive 4-Dimension Sustainability Breakdown + Chart */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Sustainability Breakdown</h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {product.score.dimensions.map((dim) => {
              const isExpanded = Boolean(expandedDims[dim.key]);
              return (
                <div
                  key={dim.key}
                  className="rounded-xl border border-white/[0.08] bg-[#202923] p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white">{dim.label}</h3>
                      <span className="font-mono text-xs text-[#A0AAA5] tabular-nums">
                        {dim.weightPercent}% weight
                      </span>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="font-mono text-2xl font-semibold text-white tabular-nums">
                        {dim.available && dim.score !== null ? Math.round(dim.score) : '—'}
                      </span>
                      <span className="text-xs text-[#8E9B94] font-mono tabular-nums">
                        {dim.available && dim.weightedContribution !== null
                          ? `+${dim.weightedContribution.toFixed(1)} pts`
                          : 'Unavailable'}
                      </span>
                    </div>

                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${
                          !dim.available
                            ? 'bg-white/15'
                            : (dim.score ?? 0) >= 75
                            ? 'bg-[#00FFAA]'
                            : (dim.score ?? 0) >= 50
                            ? 'bg-amber-400'
                            : 'bg-[#E05A5A]'
                        }`}
                        style={{ width: `${dim.available && dim.score !== null ? dim.score : 0}%` }}
                      />
                    </div>

                    <p className="mt-3 text-xs text-[#A0AAA5] leading-relaxed">
                      {dim.explanation}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/[0.07]">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpandedDims((prev) => ({
                          ...prev,
                          [dim.key]: !prev[dim.key],
                        }))
                      }
                      className="flex w-full items-center justify-between text-xs font-medium text-[#C8D3CD] hover:text-[#00FFAA] cursor-pointer"
                    >
                      <span>{dim.available ? 'Data & source details' : 'Why unavailable'}</span>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-1 text-[11px] text-[#8E9B94]">
                        <div>Status: {dim.available ? 'Verified / Disclosed' : 'Missing in source'}</div>
                        <div>Source: {dim.source}</div>
                        <div>
                          Formula share: {dim.weightPercent}% of overall SUvita Score
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-5 rounded-xl border border-white/[0.08] bg-[#202923] p-5">
            <h3 className="text-sm font-semibold text-white">
              Component Score Distribution
            </h3>
            <p className="mt-0.5 text-xs text-[#A0AAA5]">
              0–100 scale per dimension (missing dimensions shown at 0 only visually with label)
            </p>
            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 16 }}>
                  <XAxis type="number" domain={[0, 100]} stroke="#7A8781" fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="short"
                    width={110}
                    stroke="#A0AAA5"
                    fontSize={11}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#161D1A',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#FFFFFF',
                    }}
                    formatter={(value: any, _name: any, props: any) =>
                      props?.payload?.available
                        ? [`${value}/100 (${props.payload.weight}% weight)`, 'Score']
                        : ['Unavailable (missing data)', 'Status']
                    }
                  />
                  <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={20}>
                    {chartData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={
                          !entry.available
                            ? '#33403A'
                            : entry.score >= 75
                            ? '#00FFAA'
                            : entry.score >= 50
                            ? '#F59E0B'
                            : '#E05A5A'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Ingredient Intelligence Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Ingredient Intelligence ({product.ingredients.length})
            </h2>
            <p className="mt-0.5 text-xs text-[#A0AAA5]">
              Regulatory & general reference data only — not medical advice or diagnostic claims.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filter ingredients"
            className="inline-flex rounded-lg border border-white/[0.08] bg-[#1C2421] p-1"
          >
            {[
              { id: 'all' as const, label: `All (${product.ingredients.length})` },
              { id: 'attention' as const, label: `Attention (${attentionCount})` },
              { id: 'limited_info' as const, label: `Limited Info (${limitedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={ingredientFilter === tab.id}
                onClick={() => setIngredientFilter(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  ingredientFilter === tab.id
                    ? 'bg-[#202923] text-[#00FFAA]'
                    : 'text-[#A0AAA5] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredIngredients.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-[#202923] p-6 text-center text-sm text-[#A0AAA5]">
            No ingredients match this filter.
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.08] bg-[#202923] divide-y divide-white/[0.07]">
            {filteredIngredients.map((ing, idx) => (
              <div key={ing.id || idx} className="p-4 sm:p-5 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">{ing.name}</h3>
                      {ing.inciName && ing.inciName.toLowerCase() !== ing.name.toLowerCase() && (
                        <span className="font-mono text-[11px] text-[#8E9B94]">
                          INCI: {ing.inciName}
                        </span>
                      )}
                    </div>
                    {ing.purpose && (
                      <p className="mt-0.5 text-xs text-[#C8D3CD]">
                        Purpose: {ing.purpose}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        ing.safetyStatus === 'verified_safe'
                          ? 'text-[#00FFAA]'
                          : ing.safetyStatus === 'attention'
                          ? 'text-amber-400'
                          : 'text-[#A0AAA5]'
                      }`}
                    >
                      {ing.safetyStatus === 'verified_safe' && (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Verified reference
                        </>
                      )}
                      {ing.safetyStatus === 'attention' && (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Requires attention
                        </>
                      )}
                      {ing.safetyStatus === 'limited_info' && (
                        <>
                          <Info className="h-3.5 w-3.5" />
                          Limited information
                        </>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        handleAskAI(
                          `Explain the ingredient "${ing.name}" in ${product.name}: purpose, safety/regulatory info, environmental considerations, and any data limitations.`
                        )
                      }
                      className="text-xs font-medium text-[#00FFAA] hover:underline cursor-pointer"
                    >
                      Ask AI
                    </button>
                  </div>
                </div>

                {ing.regulatoryInfo && (
                  <p className="text-xs text-[#A0AAA5] leading-relaxed">
                    {ing.regulatoryInfo}
                  </p>
                )}

                {ing.warningText && (
                  <p className="rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs text-amber-200">
                    Note: {ing.warningText}
                  </p>
                )}

                <div className="text-[11px] text-[#7A8781]">
                  Source: {ing.sourceName}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Greener Alternatives Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Greener Alternatives</h2>
          <p className="mt-0.5 text-xs text-[#A0AAA5]">
            Higher-rated alternatives in {CATEGORY_LABELS[product.category]} matched to your preferences
          </p>
        </div>

        {alternatives.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-[#202923] p-6 text-sm text-[#A0AAA5]">
            This product is already among the highest-rated options in {CATEGORY_LABELS[product.category]} in SUvita’s database.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {alternatives.map((alt) => (
              <div
                key={alt.product.id}
                className="rounded-xl border border-white/[0.08] bg-[#202923] overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <ProductImage
                    src={alt.product.imageUrl}
                    alt={alt.product.name}
                    className="h-36 w-full"
                  />
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-[#A0AAA5]">
                      <span className="truncate">{alt.product.brand}</span>
                      <span className="font-mono text-white tabular-nums">
                        {formatPriceINR(alt.product.priceCents, alt.product.currency)}
                      </span>
                    </div>

                    <Link
                      to={`/product/${alt.product.id}`}
                      className="block text-sm font-semibold text-white hover:text-[#00FFAA]"
                    >
                      {alt.product.name}
                    </Link>

                    <div className="rounded-lg border border-white/[0.07] bg-[#161D1A] px-3 py-2 text-xs font-mono tabular-nums flex items-center justify-between">
                      <span className="text-[#A0AAA5]">
                        Your product: <strong className="text-white">{product.score.grade}</strong>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-[#00FFAA]" />
                      <span className="text-[#00FFAA]">
                        Suggested: <strong>{alt.product.score.grade}</strong> (+{alt.scoreDelta})
                      </span>
                    </div>

                    <p className="text-xs text-[#A0AAA5] leading-relaxed">
                      {alt.mainReason}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0 flex items-center gap-2">
                  <Link
                    to={`/product/${alt.product.id}`}
                    className="flex-1 inline-flex h-9 items-center justify-center rounded-lg border border-white/10 bg-[#161D1A] text-xs font-medium text-white hover:border-[#00FFAA]/40"
                  >
                    Inspect
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleCompareWith(alt.product.id)}
                  >
                    <GitCompareArrows className="h-3.5 w-3.5" />
                    Compare
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Data Provenance & Attribution */}
      <section className="rounded-xl border border-white/[0.08] bg-[#1C2421] p-5 space-y-2">
        <h2 className="text-sm font-semibold text-white">Source Attribution & Verification</h2>
        {product.sources.map((src, idx) => (
          <div key={src.id || idx} className="text-xs text-[#A0AAA5]">
            <span className="font-medium text-white">{src.sourceName}</span>
            {src.licenseNote && <span> — {src.licenseNote}</span>}
          </div>
        ))}
      </section>
    </div>
  );
};
