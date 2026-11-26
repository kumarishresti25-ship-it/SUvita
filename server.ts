import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { optionalAuth, requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  fetchCosmeticProduct,
  fetchOpenFoodFacts,
  generateGroundedProductBrief,
  sanitizeBarcode,
  searchOpenFoodFactsByName,
} from './src/server/adapters/dataAdapters.ts';
import { DAILY_INSIGHTS } from './src/server/catalogSeed.ts';
import {
  addProductToCollection,
  appendAIMessagePair,
  buildUserDashboard,
  buildUserInsights,
  createUserCollection,
  deleteUserAIConversation,
  deleteUserCollection,
  deleteUserSavedComparison,
  getOrCreateUserProfile,
  getProductByIdOrBarcode,
  getProductWithAlternatives,
  getUserAIConversation,
  getUserCollections,
  getUserSavedComparisons,
  getUserSavedProducts,
  getUserScans,
  listProducts,
  listUserAIConversations,
  recordUserScan,
  removeProductFromCollection,
  saveProductForUser,
  unsaveProductForUser,
  updateUserPreferences,
  updateUserProfile,
  upsertExternalProduct,
} from './src/server/repository.ts';
import {
  fetchComparisonData,
  saveComparison,
  scanFirstProduct,
  scanSecondProduct,
} from './src/server/services/comparisonService.ts';
import {
  askSuvitaAI,
  compareProducts as aiCompareProducts,
  explainIngredient,
  explainProduct,
} from './src/server/services/suvitaAI.ts';
import type { UserPreferencesDTO } from './src/shared/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'SUvita India API',
      region: 'IN',
      currency: 'INR',
      methodology: 'SUvita-EcoScore-v1.0',
    });
  });

  app.get('/api/insights/daily', (_req, res) => {
    const dayIndex = new Date().getDate() % DAILY_INSIGHTS.length;
    res.json(DAILY_INSIGHTS[dayIndex]);
  });

  // ==================== PRODUCTS & BARCODE LOOKUP ====================
  app.get('/api/products', async (req, res) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const grade = typeof req.query.grade === 'string' ? req.query.grade : undefined;
      const sort = typeof req.query.sort === 'string' ? req.query.sort : 'score_desc';

      const items = await listProducts({ search, category, grade, sort });
      res.json({ products: items });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load products' });
    }
  });

  app.get('/api/products/search-external', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (q.length < 2) {
        return res.json({ local: [], external: [] });
      }
      const [local, external] = await Promise.all([
        listProducts({ search: q }),
        searchOpenFoodFactsByName(q),
      ]);
      const localBarcodes = new Set(local.map((p) => p.barcode));
      const dedupedExternal = external.filter((e) => !localBarcodes.has(e.barcode));
      res.json({ local: local.slice(0, 8), external: dedupedExternal });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Search failed' });
    }
  });

  app.get('/api/products/lookup/:barcode', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const barcode = sanitizeBarcode(req.params.barcode);
      if (!barcode) {
        return res.status(400).json({
          error: 'Please enter a valid retail barcode (6 to 18 digits, e.g., EAN-13 starting with 890 or UPC-A).',
        });
      }

      let preferences = null;
      if (req.user?.uid && req.user.email) {
        const userCtx = await getOrCreateUserProfile(
          req.user.uid,
          req.user.email,
          req.user.name,
          req.user.picture
        );
        preferences = userCtx.preferences;
      }

      const existing = await getProductWithAlternatives(barcode, preferences);
      if (existing) {
        return res.json({
          ...existing,
          lookupSource: existing.product.isSampleData ? 'demo_catalog' : 'database_cache',
        });
      }

      const offProduct = await fetchOpenFoodFacts(barcode);
      if (offProduct) {
        const stored = await upsertExternalProduct(offProduct);
        const withAlts = await getProductWithAlternatives(String(stored.id), preferences);
        return res.json({
          ...(withAlts || { product: stored, alternatives: [] }),
          lookupSource: 'open_food_facts',
        });
      }

      const obfProduct = await fetchCosmeticProduct(barcode);
      if (obfProduct) {
        const stored = await upsertExternalProduct(obfProduct);
        const withAlts = await getProductWithAlternatives(String(stored.id), preferences);
        return res.json({
          ...(withAlts || { product: stored, alternatives: [] }),
          lookupSource: 'open_beauty_facts',
        });
      }

      return res.status(404).json({
        error: `No verified product record found for barcode ${barcode}. Try searching by product name or explore the India catalog.`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Barcode lookup failed' });
    }
  });

  app.get('/api/products/:idOrBarcode', optionalAuth, async (req: AuthRequest, res) => {
    try {
      let preferences = null;
      if (req.user?.uid && req.user.email) {
        const userCtx = await getOrCreateUserProfile(
          req.user.uid,
          req.user.email,
          req.user.name,
          req.user.picture
        );
        preferences = userCtx.preferences;
      }

      const result = await getProductWithAlternatives(req.params.idOrBarcode, preferences);
      if (!result) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch product details' });
    }
  });

  app.post('/api/products/:idOrBarcode/ai-brief', async (req, res) => {
    try {
      const product = await getProductByIdOrBarcode(req.params.idOrBarcode);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      const brief = await generateGroundedProductBrief(product);
      res.json(brief);
    } catch (error: any) {
      res.status(500).json({
        error: error.message || 'Unable to generate AI sustainability brief right now.',
      });
    }
  });

  // ==================== TWO-PRODUCT SCAN & SMART COMPARISON ====================
  app.post('/api/compare/scan-first', async (req, res) => {
    try {
      const code = String(req.body?.barcodeOrId || '').trim();
      if (!code) {
        return res.status(400).json({ error: 'Please scan or enter a product barcode or ID.' });
      }
      const product = await scanFirstProduct(code);
      res.json({ product });
    } catch (error: any) {
      res.status(404).json({ error: error.message || 'Product A lookup failed.' });
    }
  });

  app.post('/api/compare/scan-second', async (req, res) => {
    try {
      const code = String(req.body?.barcodeOrId || '').trim();
      const firstProductId = req.body?.firstProductId ? Number(req.body.firstProductId) : undefined;
      if (!code) {
        return res.status(400).json({ error: 'Please scan or enter a second product barcode or ID.' });
      }
      const product = await scanSecondProduct(code, firstProductId);
      res.json({ product });
    } catch (error: any) {
      const status = error.message?.includes('same product') ? 400 : 404;
      res.status(status).json({ error: error.message || 'Product B lookup failed.' });
    }
  });

  app.get('/api/compare/data', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const idsRaw = typeof req.query.ids === 'string' ? req.query.ids : '';
      const productIds = idsRaw
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);

      if (productIds.length < 2) {
        return res.status(400).json({ error: 'Provide at least 2 valid product IDs to compare.' });
      }

      let preferences: UserPreferencesDTO | null = null;
      if (req.user?.uid && req.user.email) {
        const userCtx = await getOrCreateUserProfile(
          req.user.uid,
          req.user.email,
          req.user.name,
          req.user.picture
        );
        preferences = userCtx.preferences;
      }

      const payload = await fetchComparisonData(productIds, preferences);
      res.json(payload);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to compute product comparison.' });
    }
  });

  // ==================== SUVITA AI ASSISTANT ====================
  app.post('/api/ai/chat', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
      if (!message) {
        return res.status(400).json({ error: 'Please enter a message for SUvita AI.' });
      }

      const contextProductId = req.body?.contextProductId
        ? Number(req.body.contextProductId)
        : null;
      const contextComparisonIds = Array.isArray(req.body?.contextComparisonIds)
        ? req.body.contextComparisonIds
            .map(Number)
            .filter((n: number) => Number.isInteger(n) && n > 0)
        : null;
      const conversationId = req.body?.conversationId
        ? Number(req.body.conversationId)
        : null;
      const history = Array.isArray(req.body?.history)
        ? req.body.history
            .filter(
              (h: any) =>
                (h?.role === 'user' || h?.role === 'assistant') &&
                typeof h?.content === 'string'
            )
            .slice(-10)
        : [];

      let preferences: UserPreferencesDTO | null = req.body?.guestPreferences || null;
      let shouldPersist = false;

      if (req.user?.uid && req.user.email) {
        const userCtx = await getOrCreateUserProfile(
          req.user.uid,
          req.user.email,
          req.user.name,
          req.user.picture
        );
        preferences = userCtx.preferences;
        shouldPersist = userCtx.preferences.saveChatHistory;
      }

      let structured;
      const action = typeof req.body?.action === 'string' ? req.body.action : 'chat';
      if (action === 'explain_product' && contextProductId) {
        structured = await explainProduct(contextProductId, message, preferences);
      } else if (action === 'explain_ingredient') {
        const ctxProd = contextProductId
          ? await getProductByIdOrBarcode(String(contextProductId))
          : null;
        structured = await explainIngredient(message, ctxProd, preferences);
      } else if (
        action === 'compare' &&
        contextComparisonIds &&
        contextComparisonIds.length >= 2
      ) {
        structured = await aiCompareProducts(contextComparisonIds, message, preferences);
      } else {
        structured = await askSuvitaAI({
          message,
          history,
          contextProductId,
          contextComparisonIds,
          preferences,
        });
      }

      let savedConversationId: number | null = conversationId;
      if (req.user?.uid && shouldPersist) {
        savedConversationId = await appendAIMessagePair({
          uid: req.user.uid,
          conversationId,
          titleSeed: message,
          contextProductId,
          contextComparisonIds,
          userMessage: message,
          assistantStructured: structured,
        });
      }

      res.json({
        conversationId: savedConversationId,
        response: structured,
      });
    } catch (error: any) {
      console.error('SUvita AI error:', error);
      res.status(503).json({
        error:
          error.message ||
          'SUvita AI could not complete your request right now. Your message has been preserved — please try again.',
      });
    }
  });

  app.get('/api/ai/conversations', requireAuth, async (req: AuthRequest, res) => {
    try {
      const conversations = await listUserAIConversations(req.user!.uid);
      res.json({ conversations });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load AI conversations' });
    }
  });

  app.get('/api/ai/conversations/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid conversation ID' });
      }
      const conversation = await getUserAIConversation(req.user!.uid, id);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      res.json({ conversation });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load conversation' });
    }
  });

  app.delete('/api/ai/conversations/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid conversation ID' });
      }
      await deleteUserAIConversation(req.user!.uid, id);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete conversation' });
    }
  });

  // ==================== AUTHENTICATED USER ROUTES ====================
  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@suvita.local`;
      const data = await getOrCreateUserProfile(
        uid,
        email,
        req.user!.name,
        req.user!.picture
      );
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load profile' });
    }
  });

  app.patch('/api/me/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@suvita.local`;
      await getOrCreateUserProfile(uid, email, req.user!.name, req.user!.picture);
      const { displayName, avatarUrl } = req.body || {};

      let safeAvatar: string | null | undefined = undefined;
      if (avatarUrl === null || avatarUrl === '') {
        safeAvatar = null;
      } else if (typeof avatarUrl === 'string') {
        const trimmed = avatarUrl.trim();
        if (trimmed.startsWith('https://') || trimmed.startsWith('/src/assets/')) {
          safeAvatar = trimmed;
        } else {
          return res.status(400).json({ error: 'Avatar URL must use https://' });
        }
      }

      const updated = await updateUserProfile(uid, {
        displayName: typeof displayName === 'string' ? displayName : undefined,
        avatarUrl: safeAvatar,
      });
      res.json({ profile: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update profile' });
    }
  });

  app.patch('/api/me/preferences', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@suvita.local`;
      await getOrCreateUserProfile(uid, email, req.user!.name, req.user!.picture);
      const updated = await updateUserPreferences(uid, req.body || {});
      res.json({ preferences: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update preferences' });
    }
  });

  app.get('/api/me/dashboard', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@suvita.local`;
      const { preferences } = await getOrCreateUserProfile(
        uid,
        email,
        req.user!.name,
        req.user!.picture
      );
      const dashboard = await buildUserDashboard(uid, preferences);
      res.json(dashboard);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load dashboard' });
    }
  });

  app.get('/api/me/scans', requireAuth, async (req: AuthRequest, res) => {
    try {
      const list = await getUserScans(req.user!.uid);
      res.json({ scans: list });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load scans' });
    }
  });

  app.post('/api/me/scans', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@suvita.local`;
      await getOrCreateUserProfile(uid, email, req.user!.name, req.user!.picture);
      const productId = Number(req.body?.productId);
      const scanMethod =
        req.body?.scanMethod === 'camera' || req.body?.scanMethod === 'search'
          ? req.body.scanMethod
          : 'manual';

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ error: 'Valid productId is required' });
      }
      const record = await recordUserScan(uid, productId, scanMethod);
      res.status(201).json({ scan: record });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to log scan' });
    }
  });

  app.get('/api/me/saved', requireAuth, async (req: AuthRequest, res) => {
    try {
      const saved = await getUserSavedProducts(req.user!.uid);
      res.json({ saved });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load saved products' });
    }
  });

  app.post('/api/me/saved', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@suvita.local`;
      await getOrCreateUserProfile(uid, email, req.user!.name, req.user!.picture);
      const productId = Number(req.body?.productId);
      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ error: 'Valid productId is required' });
      }
      await saveProductForUser(uid, productId, req.body?.notes);
      res.status(201).json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to save product' });
    }
  });

  app.delete('/api/me/saved/:productId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const productId = Number(req.params.productId);
      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ error: 'Valid productId is required' });
      }
      await unsaveProductForUser(req.user!.uid, productId);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to remove saved product' });
    }
  });

  app.get('/api/me/collections', requireAuth, async (req: AuthRequest, res) => {
    try {
      const list = await getUserCollections(req.user!.uid);
      res.json({ collections: list });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load collections' });
    }
  });

  app.post('/api/me/collections', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@suvita.local`;
      await getOrCreateUserProfile(uid, email, req.user!.name, req.user!.picture);
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      if (!name) {
        return res.status(400).json({ error: 'Collection name is required' });
      }
      const created = await createUserCollection(uid, name, req.body?.description);
      res.status(201).json({ collection: created });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create collection' });
    }
  });

  app.delete('/api/me/collections/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Valid collection ID is required' });
      }
      await deleteUserCollection(req.user!.uid, id);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete collection' });
    }
  });

  app.post('/api/me/collections/:id/products', requireAuth, async (req: AuthRequest, res) => {
    try {
      const collectionId = Number(req.params.id);
      const productId = Number(req.body?.productId);
      if (!Number.isInteger(collectionId) || !Number.isInteger(productId)) {
        return res.status(400).json({ error: 'Valid collectionId and productId required' });
      }
      await addProductToCollection(req.user!.uid, collectionId, productId);
      res.status(201).json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to add product to collection' });
    }
  });

  app.delete(
    '/api/me/collections/:id/products/:productId',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const collectionId = Number(req.params.id);
        const productId = Number(req.params.productId);
        if (!Number.isInteger(collectionId) || !Number.isInteger(productId)) {
          return res.status(400).json({ error: 'Valid IDs required' });
        }
        await removeProductFromCollection(req.user!.uid, collectionId, productId);
        res.json({ ok: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to remove product' });
      }
    }
  );

  // Saved Comparisons (dedicated table for Scan & Compare)
  app.get('/api/me/saved-comparisons', requireAuth, async (req: AuthRequest, res) => {
    try {
      const comparisons = await getUserSavedComparisons(req.user!.uid);
      res.json({ comparisons });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load saved comparisons' });
    }
  });

  app.post('/api/me/saved-comparisons', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@suvita.local`;
      await getOrCreateUserProfile(uid, email, req.user!.name, req.user!.picture);
      const productIds = Array.isArray(req.body?.productIds)
        ? req.body.productIds.map(Number).filter((n: number) => Number.isInteger(n) && n > 0)
        : [];
      if (productIds.length < 2) {
        return res.status(400).json({ error: 'Select at least 2 products to save a comparison.' });
      }
      const saved = await saveComparison(uid, productIds, req.body?.title);
      res.status(201).json({ comparison: saved });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to save comparison' });
    }
  });

  app.delete('/api/me/saved-comparisons/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid comparison ID' });
      }
      await deleteUserSavedComparison(req.user!.uid, id);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete saved comparison' });
    }
  });

  app.get('/api/me/insights', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = await buildUserInsights(req.user!.uid);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load insights' });
    }
  });

  // Vite dev middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SUvita India server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SUvita server:', err);
  process.exit(1);
});
