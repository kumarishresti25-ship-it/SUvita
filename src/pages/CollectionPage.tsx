import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  FolderPlus,
  GitCompareArrows,
  History,
  Layers,
  Plus,
  ScanBarcode,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORY_LABELS, formatPriceINR } from '../shared/types';
import { formatRelativeTime, formatShortDate } from '../lib/utils';
import { ProductCard } from '../components/common/ProductCard';
import {
  Button,
  EmptyState,
  GradeDisplay,
  Input,
  ProductImage,
  SurfaceCard,
} from '../components/ui/primitives';

type CollectionTab = 'saved' | 'collections' | 'history' | 'comparisons';

export const CollectionPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    savedProducts,
    collections,
    scans,
    savedComparisons,
    createCollection,
    deleteCollection,
    addToCollection,
    removeFromCollection,
    deleteSavedComparison,
    setCompareIds,
    addToCompare,
  } = useApp();

  const [activeTab, setActiveTab] = useState<CollectionTab>('saved');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setFormError('Please enter a name for your collection.');
      return;
    }
    setFormError(null);
    setCreating(true);
    try {
      await createCollection(trimmed, newDesc.trim() || undefined);
      setNewName('');
      setNewDesc('');
    } finally {
      setCreating(false);
    }
  };

  const handleReopenComparison = (productIds: number[]) => {
    setCompareIds(productIds.slice(0, 3));
    navigate('/compare');
  };

  const tabs: Array<{ id: CollectionTab; label: string; count: number; icon: React.ReactNode }> = [
    { id: 'saved', label: 'Saved Products', count: savedProducts.length, icon: <Bookmark className="h-4 w-4" /> },
    { id: 'collections', label: 'Collections', count: collections.length, icon: <Layers className="h-4 w-4" /> },
    { id: 'history', label: 'Scan History', count: scans.length, icon: <History className="h-4 w-4" /> },
    {
      id: 'comparisons',
      label: 'Saved Comparisons',
      count: savedComparisons.length,
      icon: <GitCompareArrows className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            My Collection
          </h1>
          <p className="mt-1.5 text-sm text-[#A0AAA5]">
            Organize saved products, manage custom green shopping lists, revisit scanned barcodes,
            and reopen saved comparisons.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/scan"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#00FFAA] px-4 text-sm font-semibold text-[#09130F] hover:bg-[#19FFB3] transition-colors whitespace-nowrap"
          >
            <ScanBarcode className="h-4 w-4" />
            Scan Product
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Collection sections"
        className="flex flex-wrap gap-2 border-b border-white/[0.08] pb-3"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-[#00FFAA]/12 text-[#00FFAA] border border-[#00FFAA]/30'
                  : 'bg-[#1C2421] text-[#A0AAA5] border border-white/[0.07] hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className="font-mono text-xs tabular-nums opacity-80">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Saved Products */}
      {activeTab === 'saved' && (
        <section aria-label="Saved products" className="space-y-5">
          {savedProducts.length === 0 ? (
            <EmptyState
              icon={<Bookmark className="h-6 w-6" />}
              title="No saved products yet"
              description="Bookmark any product from Explore or after scanning a barcode to track greener favorites and build shopping lists."
              action={
                <Link
                  to="/explore"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#00FFAA] px-4 text-sm font-semibold text-[#09130F] hover:bg-[#19FFB3] transition-colors"
                >
                  Explore Products
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {savedProducts.map((item) => (
                <div key={item.id} className="space-y-2">
                  <ProductCard product={item.product} />
                  {collections.length > 0 && (
                    <div className="flex items-center gap-2 px-1">
                      <label htmlFor={`add-col-${item.productId}`} className="sr-only">
                        Add {item.product.name} to a collection
                      </label>
                      <select
                        id={`add-col-${item.productId}`}
                        defaultValue=""
                        onChange={(e) => {
                          const cid = Number(e.target.value);
                          if (cid) {
                            addToCollection(cid, item.product);
                            e.target.value = '';
                          }
                        }}
                        className="h-8 w-full rounded-lg border border-white/10 bg-[#161D1A] px-2.5 text-xs text-[#C8D3CD] focus:border-[#00FFAA]/50 focus:outline-none cursor-pointer"
                      >
                        <option value="" disabled>
                          + Add to a collection…
                        </option>
                        {collections.map((c) => (
                          <option key={c.id} value={c.id} className="bg-[#161D1A]">
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: Custom Collections */}
      {activeTab === 'collections' && (
        <section aria-label="Custom collections" className="space-y-6">
          <SurfaceCard>
            <div className="flex items-center gap-2 mb-3">
              <FolderPlus className="h-4 w-4 text-[#00FFAA]" aria-hidden="true" />
              <h2 className="text-base font-semibold text-white">Create a Collection</h2>
            </div>
            <form onSubmit={handleCreateCollection} className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-4">
                <label htmlFor="collection-name" className="sr-only">
                  Collection name
                </label>
                <Input
                  id="collection-name"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Collection name (e.g. Daily Haircare)"
                  maxLength={80}
                />
              </div>
              <div className="sm:col-span-6">
                <label htmlFor="collection-desc" className="sr-only">
                  Optional description
                </label>
                <Input
                  id="collection-desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Optional note (e.g. Low-plastic options under ₹300)"
                  maxLength={200}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={creating} className="w-full">
                  <Plus className="h-4 w-4" />
                  Create
                </Button>
              </div>
            </form>
            {formError && (
              <p role="alert" className="mt-2 text-xs text-[#F38B8B]">
                {formError}
              </p>
            )}
          </SurfaceCard>

          {collections.length === 0 ? (
            <EmptyState
              icon={<Layers className="h-6 w-6" />}
              title="No custom collections yet"
              description="Group your saved products into lists like Pantry Staples, Plastic-Free Bathroom, or Safe Skincare."
            />
          ) : (
            <div className="space-y-4">
              {collections.map((col) => {
                const availableToAdd = savedProducts.filter(
                  (sp) => !col.productIds.includes(sp.productId)
                );
                return (
                  <SurfaceCard key={col.id} className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-white">{col.name}</h3>
                        <p className="mt-0.5 text-xs text-[#A0AAA5]">
                          {col.description ? `${col.description} · ` : ''}
                          {col.products.length}{' '}
                          {col.products.length === 1 ? 'product' : 'products'} · Created{' '}
                          {formatShortDate(col.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {availableToAdd.length > 0 && (
                          <select
                            aria-label={`Add saved product to ${col.name}`}
                            defaultValue=""
                            onChange={(e) => {
                              const pid = Number(e.target.value);
                              const found = availableToAdd.find((sp) => sp.productId === pid);
                              if (found) {
                                addToCollection(col.id, found.product);
                                e.target.value = '';
                              }
                            }}
                            className="h-9 rounded-lg border border-white/10 bg-[#161D1A] px-2.5 text-xs text-white focus:border-[#00FFAA]/60 focus:outline-none cursor-pointer"
                          >
                            <option value="" disabled>
                              + Add saved product…
                            </option>
                            {availableToAdd.map((sp) => (
                              <option key={sp.productId} value={sp.productId} className="bg-[#161D1A]">
                                {sp.product.name} ({sp.product.score.grade})
                              </option>
                            ))}
                          </select>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => deleteCollection(col.id)}
                          aria-label={`Delete collection ${col.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    {col.products.length === 0 ? (
                      <p className="text-xs text-[#8E9B94] py-2">
                        This collection is empty. Save products first, then add them here from the
                        dropdown above.
                      </p>
                    ) : (
                      <div className="divide-y divide-white/[0.07] border-t border-white/[0.07]">
                        {col.products.map((prod) => (
                          <div
                            key={prod.id}
                            className="flex items-center justify-between gap-3 py-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <ProductImage
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="h-11 w-11 rounded-lg shrink-0"
                              />
                              <div className="min-w-0">
                                <Link
                                  to={`/product/${prod.id}`}
                                  className="block truncate text-sm font-medium text-white hover:text-[#00FFAA]"
                                >
                                  {prod.name}
                                </Link>
                                <div className="text-xs text-[#A0AAA5] truncate">
                                  {prod.brand} · {formatPriceINR(prod.priceCents, prod.currency)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <GradeDisplay
                                grade={prod.score.grade}
                                score={prod.score.overallScore}
                                size="sm"
                              />
                              <button
                                type="button"
                                onClick={() => removeFromCollection(col.id, prod.id)}
                                aria-label={`Remove ${prod.name} from ${col.name}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-[#A0AAA5] hover:text-[#F38B8B] hover:border-[#E05A5A]/40 transition-colors cursor-pointer"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </SurfaceCard>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: Scan History */}
      {activeTab === 'history' && (
        <section aria-label="Scan history">
          {scans.length === 0 ? (
            <EmptyState
              icon={<History className="h-6 w-6" />}
              title="No scan history yet"
              description="Every barcode you scan or look up is recorded here so you can quickly reopen its sustainability breakdown."
              action={
                <Link
                  to="/scan"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#00FFAA] px-4 text-sm font-semibold text-[#09130F] hover:bg-[#19FFB3] transition-colors"
                >
                  Start Scanning
                </Link>
              }
            />
          ) : (
            <SurfaceCard className="p-0 overflow-hidden">
              <div className="divide-y divide-white/[0.07]">
                {scans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <ProductImage
                        src={scan.product.imageUrl}
                        alt={scan.product.name}
                        className="h-12 w-12 rounded-lg shrink-0"
                      />
                      <div className="min-w-0">
                        <Link
                          to={`/product/${scan.product.id}`}
                          className="block truncate text-sm font-semibold text-white hover:text-[#00FFAA]"
                        >
                          {scan.product.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-[#A0AAA5] truncate">
                          {scan.product.brand} · {CATEGORY_LABELS[scan.product.category]} · Scanned{' '}
                          {formatRelativeTime(scan.scannedAt)} ({scan.scanMethod})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <GradeDisplay
                        grade={scan.gradeSnapshot}
                        score={scan.ecoscoreSnapshot}
                        size="sm"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => addToCompare(scan.product.id)}
                        >
                          Compare
                        </Button>
                        <Link
                          to={`/product/${scan.product.id}`}
                          className="inline-flex h-9 items-center justify-center rounded-lg bg-[#161D1A] border border-white/10 px-3 text-xs font-medium text-white hover:border-[#00FFAA]/40 hover:text-[#00FFAA] transition-colors whitespace-nowrap"
                        >
                          Reopen
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          )}
        </section>
      )}

      {/* TAB 4: Saved Comparisons */}
      {activeTab === 'comparisons' && (
        <section aria-label="Saved comparisons">
          {savedComparisons.length === 0 ? (
            <EmptyState
              icon={<GitCompareArrows className="h-6 w-6" />}
              title="No saved comparisons yet"
              description="Compare any two or three products side-by-side and click Save Comparison to keep your decision notes handy."
              action={
                <Link
                  to="/compare"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#00FFAA] px-4 text-sm font-semibold text-[#09130F] hover:bg-[#19FFB3] transition-colors"
                >
                  Compare Products
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {savedComparisons.map((comp) => {
                const ids = [comp.productAId, comp.productBId, comp.productCId].filter(
                  (v): v is number => typeof v === 'number'
                );
                return (
                  <SurfaceCard key={comp.id} className="flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-semibold text-white leading-snug">
                          {comp.title}
                        </h3>
                        <span className="text-xs text-[#8E9B94] whitespace-nowrap">
                          {formatShortDate(comp.createdAt)}
                        </span>
                      </div>
                      {comp.summarySnapshot && (
                        <p className="mt-2 text-xs text-[#A0AAA5] leading-relaxed">
                          {comp.summarySnapshot}
                        </p>
                      )}
                      {comp.products.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 border-t border-white/[0.07]">
                          {comp.products.map((p) => (
                            <div key={p.id} className="flex items-center gap-2 text-xs">
                              <span className="text-[#C8D3CD] font-medium truncate max-w-[140px]">
                                {p.name}
                              </span>
                              <GradeDisplay
                                grade={p.score.grade}
                                score={p.score.overallScore}
                                size="sm"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleReopenComparison(ids)}
                      >
                        <GitCompareArrows className="h-3.5 w-3.5" />
                        Reopen Comparison
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSavedComparison(comp.id)}
                        aria-label={`Delete comparison ${comp.title}`}
                        className="text-[#F38B8B] hover:text-[#F38B8B]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </SurfaceCard>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
