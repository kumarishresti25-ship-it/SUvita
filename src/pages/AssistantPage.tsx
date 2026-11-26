import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  Bot,
  GitCompareArrows,
  History,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import {
  formatPriceINR,
  type AIChatMessageDTO,
  type AIConversationDTO,
  type ProductDTO,
} from '../shared/types';
import { Button, GradeDisplay, Input, ProductImage } from '../components/ui/primitives';

const WELCOME_MESSAGE =
  "Hi! I'm SUvita AI. Let's make your shopping choices smarter and greener.";

const DEFAULT_SUGGESTIONS = [
  'Is this product sustainable?',
  'I need a sustainable shampoo under ₹300.',
  'Suggest a better alternative to Milk Choco-Crisp Bar.',
  'Explain the ingredients in Botanical Squalane Serum.',
  'Show me products with an A or B SUvita Score.',
  'Compare two products for low-waste packaging.',
];

export const AssistantPage: React.FC = () => {
  const {
    isAuthenticated,
    preferences,
    aiContext,
    setAIContext,
    isProductSaved,
    toggleSaveProduct,
    setCompareIds,
  } = useApp();
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState<ProductDTO[]>([]);
  const [contextProduct, setContextProduct] = useState<ProductDTO | null>(
    aiContext.product || null
  );
  const [contextComparison, setContextComparison] = useState<ProductDTO[]>(
    aiContext.comparisonProducts || []
  );

  const [conversations, setConversations] = useState<AIConversationDTO[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AIChatMessageDTO[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const consumedInitialPromptRef = useRef(false);

  // Load catalog & private AI conversation history
  useEffect(() => {
    api
      .getProducts({ sort: 'score_desc' })
      .then(({ products }) => setCatalog(products))
      .catch(() => {});

    if (isAuthenticated) {
      api
        .getAIConversations()
        .then(({ conversations: list }) => setConversations(list))
        .catch(() => {});
    }
  }, [isAuthenticated]);

  // Sync incoming product/comparison context from other pages
  useEffect(() => {
    if (aiContext.product) {
      setContextProduct(aiContext.product);
      setContextComparison([]);
    } else if (aiContext.comparisonProducts && aiContext.comparisonProducts.length >= 2) {
      setContextComparison(aiContext.comparisonProducts);
      setContextProduct(null);
    }

    if (aiContext.initialPrompt && !consumedInitialPromptRef.current) {
      consumedInitialPromptRef.current = true;
      const promptToSend = aiContext.initialPrompt;
      setAIContext({});
      void sendMessage(
        promptToSend,
        aiContext.product || null,
        aiContext.comparisonProducts || []
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiContext]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = async (
    textOverride?: string,
    overrideProd?: ProductDTO | null,
    overrideComp?: ProductDTO[]
  ) => {
    const raw = (textOverride ?? input).trim();
    if (!raw || sending) return;

    const prodCtx = overrideProd !== undefined ? overrideProd : contextProduct;
    const compCtx = overrideComp !== undefined ? overrideComp : contextComparison;

    setErrorMsg(null);
    setSending(true);

    // Optimistic user bubble
    const tempUserMsg: AIChatMessageDTO = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: raw,
      createdAt: new Date().toISOString(),
    };
    const nextHistory = [...messages, tempUserMsg];
    setMessages(nextHistory);
    if (!textOverride) setInput('');

    try {
      const { conversationId, response } = await api.chatWithAI({
        message: raw,
        history: nextHistory.slice(-8).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        contextProductId: prodCtx?.id ?? null,
        contextComparisonIds:
          compCtx.length >= 2 ? compCtx.map((p) => p.id) : null,
        conversationId: activeConversationId,
        guestPreferences: preferences,
      });

      const assistantMsg: AIChatMessageDTO = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: response.explanation,
        structured: response,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (conversationId) {
        setActiveConversationId(conversationId);
        if (isAuthenticated) {
          api
            .getAIConversations()
            .then(({ conversations: list }) => setConversations(list))
            .catch(() => {});
        }
      }
    } catch (err: any) {
      // Preserve user's input on error and show friendly error message
      setMessages(messages);
      setInput(raw);
      setErrorMsg(
        err?.message ||
          'SUvita AI is temporarily unavailable. Your message has been preserved — please try again.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleLoadConversation = async (id: number) => {
    try {
      const { conversation } = await api.getAIConversation(id);
      setActiveConversationId(conversation.id);
      setMessages(conversation.messages || []);
      setErrorMsg(null);
    } catch (err: any) {
      toast.error(err?.message || 'Could not load conversation.');
    }
  };

  const handleDeleteConversation = async (id: number) => {
    try {
      await api.deleteAIConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
      toast.success('Conversation deleted');
    } catch (err: any) {
      toast.error(err?.message || 'Could not delete conversation.');
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setActiveConversationId(null);
    setErrorMsg(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Sidebar: Context Selector & Conversation History */}
      <aside className="lg:col-span-4 space-y-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#202923] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#C8D3CD]">
              Product Context
            </h2>
            {(contextProduct || contextComparison.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setContextProduct(null);
                  setContextComparison([]);
                }}
                className="text-[11px] text-[#A0AAA5] hover:text-white cursor-pointer"
              >
                Clear context
              </button>
            )}
          </div>

          <select
            aria-label="Attach a product for SUvita AI context"
            value={contextProduct?.id || ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              const found = catalog.find((p) => p.id === id) || null;
              setContextProduct(found);
              setContextComparison([]);
            }}
            className="w-full h-9 rounded-lg border border-white/10 bg-[#161D1A] px-2.5 text-xs text-white focus:border-[#00FFAA]/60 focus:outline-none"
          >
            <option value="">All India Catalog (Smart Shopping Mode)</option>
            {catalog.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({formatPriceINR(p.priceCents, p.currency)} · Grade {p.score.grade})
              </option>
            ))}
          </select>

          {contextProduct && (
            <div className="rounded-lg border border-[#00FFAA]/25 bg-[#161D1A] p-3 flex items-center gap-3">
              <ProductImage
                src={contextProduct.imageUrl}
                alt={contextProduct.name}
                className="h-11 w-11 rounded-md shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-white">
                  {contextProduct.name}
                </div>
                <div className="text-[11px] text-[#00FFAA] font-mono tabular-nums">
                  Grade {contextProduct.score.grade} ·{' '}
                  {contextProduct.score.overallScore !== null
                    ? `${contextProduct.score.overallScore.toFixed(1)}/100`
                    : 'Insufficient data'}
                </div>
              </div>
            </div>
          )}

          {contextComparison.length >= 2 && (
            <div className="rounded-lg border border-[#00FFAA]/25 bg-[#161D1A] p-3 space-y-1">
              <div className="text-[11px] font-medium text-[#00FFAA]">
                Active Comparison Context ({contextComparison.length} products)
              </div>
              {contextComparison.map((p) => (
                <div key={p.id} className="truncate text-xs text-white">
                  • {p.name} (Grade {p.score.grade})
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saved Private Conversations */}
        <div className="rounded-xl border border-white/[0.08] bg-[#202923] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#C8D3CD]">
              <History className="h-3.5 w-3.5 text-[#00FFAA]" />
              Conversation History
            </div>
            <button
              type="button"
              onClick={handleClearChat}
              className="text-[11px] font-medium text-[#00FFAA] hover:underline cursor-pointer"
            >
              New chat
            </button>
          </div>

          {!isAuthenticated ? (
            <p className="text-xs text-[#8E9B94] leading-relaxed">
              Sign in to save private SUvita AI conversation threads across sessions. Current session memory remains active while browsing.
            </p>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-[#8E9B94]">
              {preferences.saveChatHistory
                ? 'Your saved SUvita AI conversations will appear here.'
                : 'Chat history saving is paused in Settings.'}
            </p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                    activeConversationId === conv.id
                      ? 'bg-[#00FFAA]/12 text-[#00FFAA]'
                      : 'bg-[#161D1A] text-[#C8D3CD] hover:text-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void handleLoadConversation(conv.id)}
                    className="truncate flex-1 text-left cursor-pointer"
                  >
                    {conv.title}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete conversation ${conv.title}`}
                    onClick={() => void handleDeleteConversation(conv.id)}
                    className="text-[#7A8781] hover:text-[#F38B8B] cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Conversational Interface */}
      <section className="lg:col-span-8 flex flex-col rounded-2xl border border-white/[0.08] bg-[#1C2421] overflow-hidden min-h-[640px]">
        {/* Chat Header */}
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] bg-[#202923] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00FFAA]/15 text-[#00FFAA]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">
                SUvita AI · Personal Green Shopping Assistant
              </h1>
              <p className="text-xs text-[#A0AAA5]">
                Grounded in SUvita’s product database, EcoScore v1.0 engine, and Indian INR pricing
              </p>
            </div>
          </div>

          {messages.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
            >
              <X className="h-3.5 w-3.5" />
              Clear Chat
            </Button>
          )}
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 max-h-[520px]">
          {/* Welcoming Intro Bubble */}
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#00FFAA]/15 text-[#00FFAA]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#202923] p-4 max-w-2xl space-y-3">
              <p className="text-sm font-medium text-white leading-relaxed">
                {WELCOME_MESSAGE}
              </p>
              <p className="text-xs text-[#A0AAA5] leading-relaxed">
                Ask me to analyze a scanned product, decode INCI or FSSAI ingredients, compare two items side by side, or recommend greener products in India within your budget in ₹.
              </p>
            </div>
          </div>

          {/* Suggested Prompt Cards when chat is fresh */}
          {messages.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {DEFAULT_SUGGESTIONS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  className="rounded-xl border border-white/[0.08] bg-[#161D1A] px-4 py-3 text-left text-xs font-medium text-[#DCE5E0] hover:border-[#00FFAA]/45 hover:text-[#00FFAA] transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Conversation Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start items-start gap-3'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#00FFAA]/15 text-[#00FFAA]">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              {msg.role === 'user' ? (
                <div className="max-w-lg rounded-xl bg-[#00FFAA] px-4 py-2.5 text-sm font-medium text-[#09130F]">
                  {msg.content}
                </div>
              ) : (
                <div className="flex-1 max-w-2xl rounded-xl border border-white/[0.08] bg-[#202923] p-4 sm:p-5 space-y-4">
                  <p className="text-sm text-white leading-relaxed">
                    {msg.structured?.explanation || msg.content}
                  </p>

                  {msg.structured?.keyFindings &&
                    msg.structured.keyFindings.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-[#00FFAA]">
                          Key Findings
                        </div>
                        <ul className="space-y-1 text-xs text-[#DCE5E0]">
                          {msg.structured.keyFindings.map((item, idx) => (
                            <li key={idx} className="leading-relaxed">
                              • {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {msg.structured?.comparisonHighlights &&
                    msg.structured.comparisonHighlights.length > 0 && (
                      <div className="rounded-lg border border-white/[0.07] bg-[#161D1A] divide-y divide-white/[0.06]">
                        {msg.structured.comparisonHighlights.map((row, idx) => (
                          <div
                            key={idx}
                            className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                          >
                            <span className="font-medium text-white">
                              {row.dimension}
                            </span>
                            <span className="text-[#00FFAA] font-medium">
                              {row.leader}
                            </span>
                            <span className="text-[#A0AAA5]">{row.note}</span>
                          </div>
                        ))}
                      </div>
                    )}

                  {/* Embedded Context-Aware Product Cards */}
                  {msg.structured?.recommendedProducts &&
                    msg.structured.recommendedProducts.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="text-xs font-semibold text-[#C8D3CD]">
                          Matched Products from SUvita Database
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {msg.structured.recommendedProducts.map(({ product, reason }) => {
                            const saved = isProductSaved(product.id);
                            return (
                              <div
                                key={product.id}
                                className="rounded-xl border border-white/[0.08] bg-[#161D1A] p-3.5 flex flex-col justify-between gap-3"
                              >
                                <div className="flex items-start gap-3">
                                  <ProductImage
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="h-14 w-14 rounded-lg shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-xs font-semibold text-white">
                                      {product.name}
                                    </div>
                                    <div className="text-[11px] text-[#A0AAA5] truncate">
                                      {product.brand} ·{' '}
                                      {formatPriceINR(product.priceCents, product.currency)}
                                    </div>
                                    <div className="mt-1.5">
                                      <GradeDisplay
                                        grade={product.score.grade}
                                        score={product.score.overallScore}
                                        size="sm"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <p className="text-[11px] text-[#A0AAA5] leading-relaxed">
                                  {reason}
                                </p>

                                <div className="flex items-center gap-1.5">
                                  <Link
                                    to={`/product/${product.id}`}
                                    className="flex-1 inline-flex h-8 items-center justify-center rounded-lg border border-white/10 bg-[#202923] px-2.5 text-[11px] font-medium text-white hover:border-[#00FFAA]/45"
                                  >
                                    View Details
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const ids = contextProduct
                                        ? [contextProduct.id, product.id]
                                        : [product.id];
                                      setCompareIds(Array.from(new Set(ids)));
                                      navigate(
                                        ids.length >= 2
                                          ? `/compare?ids=${ids.join(',')}`
                                          : '/compare'
                                      );
                                    }}
                                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-[#202923] px-2.5 text-[11px] font-medium text-[#C8D3CD] hover:text-[#00FFAA] cursor-pointer"
                                  >
                                    <GitCompareArrows className="h-3 w-3" />
                                    Compare
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void toggleSaveProduct(product)}
                                    aria-label={`Save ${product.name}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#202923] text-[#C8D3CD] hover:text-[#00FFAA] cursor-pointer"
                                  >
                                    {saved ? (
                                      <BookmarkCheck className="h-3.5 w-3.5 text-[#00FFAA]" />
                                    ) : (
                                      <Bookmark className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {msg.structured?.dataLimitations && (
                    <p className="rounded-lg border border-white/[0.06] bg-[#161D1A] px-3 py-2 text-[11px] text-[#A0AAA5] leading-relaxed">
                      <strong className="text-[#C8D3CD]">Transparency note: </strong>
                      {msg.structured.dataLimitations}
                    </p>
                  )}

                  {msg.structured?.sources && msg.structured.sources.length > 0 && (
                    <div className="text-[11px] text-[#7A8781]">
                      Sources: {msg.structured.sources.join(' · ')}
                    </div>
                  )}

                  {msg.structured?.followUpSuggestions &&
                    msg.structured.followUpSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {msg.structured.followUpSuggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => void sendMessage(s)}
                            className="rounded-lg border border-white/10 bg-[#161D1A] px-2.5 py-1.5 text-[11px] font-medium text-[#C8D3CD] hover:border-[#00FFAA]/45 hover:text-[#00FFAA] transition-colors cursor-pointer"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {sending && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#00FFAA]/15 text-[#00FFAA]">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#202923] px-4 py-3 text-xs text-[#A0AAA5]">
                SUvita AI is analyzing verified product records...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Error banner preserving input */}
        {errorMsg && (
          <div
            role="alert"
            className="mx-5 mb-2 flex items-start gap-2.5 rounded-lg border border-[#E05A5A]/30 bg-[#E05A5A]/10 px-3.5 py-2.5 text-xs text-[#F38B8B]"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Message Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage();
          }}
          className="border-t border-white/[0.08] bg-[#202923] p-4 flex items-center gap-2.5"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask SUvita AI about products, ingredients, comparisons, or greener swaps in ₹..."
            aria-label="Message SUvita AI"
            disabled={sending}
            className="flex-1 h-11"
          />
          <Button
            type="submit"
            disabled={sending || !input.trim()}
            className="h-11 px-5"
          >
            <Send className="h-4 w-4" />
            Send
          </Button>
        </form>
      </section>
    </div>
  );
};
