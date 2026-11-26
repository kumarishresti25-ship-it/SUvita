import { and, asc, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  aiConversations,
  aiMessages,
  collectionProducts,
  collections,
  productComparisons,
  productIngredients,
  productSources,
  products,
  profiles,
  savedComparisons,
  savedProducts,
  scans,
  sustainabilityScores,
  userPreferences,
} from '../db/schema.ts';
import { calculateEcoScore, findGreenerAlternatives } from '../shared/ecoscore.ts';
import type {
  AIChatMessageDTO,
  AIConversationDTO,
  AIStructuredResponseDTO,
  CollectionDTO,
  DashboardSummaryDTO,
  EcoGrade,
  InsightsDataDTO,
  ProductCategory,
  ProductDTO,
  ProductIngredientDTO,
  ProductSourceDTO,
  SavedComparisonDTO,
  SavedProductDTO,
  ScanRecordDTO,
  SustainabilityPriority,
  UserPreferencesDTO,
  UserProfileDTO,
} from '../shared/types.ts';
import { CATEGORY_LABELS } from '../shared/types.ts';
import { DAILY_INSIGHTS, SEED_PRODUCTS } from './catalogSeed.ts';
import {
  buildScoreFromNormalized,
  type NormalizedExternalProduct,
} from './adapters/dataAdapters.ts';

let catalogSeededPromise: Promise<void> | null = null;

export async function ensureCatalogSeeded(): Promise<void> {
  if (!catalogSeededPromise) {
    catalogSeededPromise = (async () => {
      for (const item of SEED_PRODUCTS) {
        const existing = await db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.barcode, item.barcode))
          .limit(1);

        if (existing.length > 0) continue;

        const inserted = await db
          .insert(products)
          .values({
            barcode: item.barcode,
            name: item.name,
            brand: item.brand,
            category: item.category,
            description: item.description,
            imageUrl: item.imageUrl,
            priceCents: item.priceCents,
            currency: 'INR',
            packagingSummary: item.packagingSummary,
            packagingType: item.packagingType,
            originCountry: item.originCountry,
            isSampleData: item.isSampleData,
            sourceLabel: item.sourceLabel,
          })
          .onConflictDoNothing({ target: products.barcode })
          .returning({ id: products.id });

        const productId = inserted[0]?.id;
        if (!productId) continue;

        const computed = calculateEcoScore({
          ingredientSafety: {
            score: item.scores.ingredient,
            explanation: item.scores.ingredientExplanation,
            source: item.scores.ingredientSource,
          },
          packagingType: {
            score: item.scores.packaging,
            explanation: item.scores.packagingExplanation,
            source: item.scores.packagingSource,
          },
          brandEthics: {
            score: item.scores.ethics,
            explanation: item.scores.ethicsExplanation,
            source: item.scores.ethicsSource,
          },
          energyFootprint: {
            score: item.scores.energy,
            explanation: item.scores.energyExplanation,
            source: item.scores.energySource,
          },
        });

        await db
          .insert(sustainabilityScores)
          .values({
            productId,
            overallScore: computed.overallScore,
            grade: computed.grade,
            ingredientScore: computed.ingredientScore,
            packagingScore: computed.packagingScore,
            brandEthicsScore: computed.brandEthicsScore,
            energyScore: computed.energyScore,
            confidencePercent: computed.confidencePercent,
            availableDimensions: computed.availableDimensions,
            ingredientExplanation: item.scores.ingredientExplanation,
            packagingExplanation: item.scores.packagingExplanation,
            brandEthicsExplanation: item.scores.ethicsExplanation,
            energyExplanation: item.scores.energyExplanation,
            ingredientSource: item.scores.ingredientSource,
            packagingSource: item.scores.packagingSource,
            brandEthicsSource: item.scores.ethicsSource,
            energySource: item.scores.energySource,
            strongestFactor: computed.strongestFactor,
            weakestFactor: computed.weakestFactor,
            methodologyVersion: computed.methodologyVersion,
          })
          .onConflictDoNothing({ target: sustainabilityScores.productId });

        if (item.ingredients.length > 0) {
          await db.insert(productIngredients).values(
            item.ingredients.map((ing, idx) => ({
              productId,
              name: ing.name,
              inciName: ing.inciName || null,
              purpose: ing.purpose,
              safetyStatus: ing.safetyStatus,
              regulatoryInfo: ing.regulatoryInfo,
              warningText: ing.warningText || null,
              sourceName: ing.sourceName,
              position: idx,
            }))
          );
        }

        if (item.sources.length > 0) {
          await db.insert(productSources).values(
            item.sources.map((src) => ({
              productId,
              sourceName: src.sourceName,
              sourceType: src.sourceType,
              sourceUrl: src.sourceUrl || null,
              licenseNote: src.licenseNote,
              isVerifiedExternal: src.isVerifiedExternal,
            }))
          );
        }
      }
    })().catch((err) => {
      catalogSeededPromise = null;
      throw err;
    });
  }
  await catalogSeededPromise;
}

function hydrateProductDTO(
  row: typeof products.$inferSelect,
  scoreRow: typeof sustainabilityScores.$inferSelect | undefined,
  ingredientsRows: Array<typeof productIngredients.$inferSelect>,
  sourcesRows: Array<typeof productSources.$inferSelect>
): ProductDTO {
  const score = calculateEcoScore({
    ingredientSafety: {
      score: scoreRow?.ingredientScore ?? null,
      explanation: scoreRow?.ingredientExplanation,
      source: scoreRow?.ingredientSource,
    },
    packagingType: {
      score: scoreRow?.packagingScore ?? null,
      explanation: scoreRow?.packagingExplanation,
      source: scoreRow?.packagingSource,
    },
    brandEthics: {
      score: scoreRow?.brandEthicsScore ?? null,
      explanation: scoreRow?.brandEthicsExplanation,
      source: scoreRow?.brandEthicsSource,
    },
    energyFootprint: {
      score: scoreRow?.energyScore ?? null,
      explanation: scoreRow?.energyExplanation,
      source: scoreRow?.energySource,
    },
  });

  const ingredients: ProductIngredientDTO[] = ingredientsRows
    .sort((a, b) => a.position - b.position)
    .map((ing) => ({
      id: ing.id,
      name: ing.name,
      inciName: ing.inciName,
      purpose: ing.purpose,
      safetyStatus: ing.safetyStatus as ProductIngredientDTO['safetyStatus'],
      regulatoryInfo: ing.regulatoryInfo,
      warningText: ing.warningText,
      sourceName: ing.sourceName,
      position: ing.position,
    }));

  const sources: ProductSourceDTO[] = sourcesRows.map((src) => ({
    id: src.id,
    sourceName: src.sourceName,
    sourceType: src.sourceType,
    sourceUrl: src.sourceUrl,
    licenseNote: src.licenseNote,
    isVerifiedExternal: src.isVerifiedExternal,
    fetchedAt: src.fetchedAt.toISOString(),
  }));

  return {
    id: row.id,
    barcode: row.barcode,
    name: row.name,
    brand: row.brand,
    category: row.category as ProductCategory,
    description: row.description,
    imageUrl: row.imageUrl,
    priceCents: row.priceCents,
    currency: row.currency || 'INR',
    packagingSummary: row.packagingSummary,
    packagingType: row.packagingType,
    originCountry: row.originCountry,
    isSampleData: row.isSampleData,
    sourceLabel: row.sourceLabel,
    createdAt: row.createdAt.toISOString(),
    score,
    ingredients,
    sources,
  };
}

async function hydrateManyProducts(
  productRows: Array<typeof products.$inferSelect>
): Promise<ProductDTO[]> {
  if (productRows.length === 0) return [];
  const ids = productRows.map((p) => p.id);

  const [scoreRows, ingRows, srcRows] = await Promise.all([
    db
      .select()
      .from(sustainabilityScores)
      .where(inArray(sustainabilityScores.productId, ids)),
    db
      .select()
      .from(productIngredients)
      .where(inArray(productIngredients.productId, ids)),
    db
      .select()
      .from(productSources)
      .where(inArray(productSources.productId, ids)),
  ]);

  const scoreMap = new Map(scoreRows.map((s) => [s.productId, s]));
  const ingMap = new Map<number, Array<typeof productIngredients.$inferSelect>>();
  for (const ing of ingRows) {
    const arr = ingMap.get(ing.productId) || [];
    arr.push(ing);
    ingMap.set(ing.productId, arr);
  }
  const srcMap = new Map<number, Array<typeof productSources.$inferSelect>>();
  for (const src of srcRows) {
    const arr = srcMap.get(src.productId) || [];
    arr.push(src);
    srcMap.set(src.productId, arr);
  }

  return productRows.map((p) =>
    hydrateProductDTO(
      p,
      scoreMap.get(p.id),
      ingMap.get(p.id) || [],
      srcMap.get(p.id) || []
    )
  );
}

export async function listProducts(filters?: {
  search?: string;
  category?: string;
  grade?: string;
  sort?: string;
}): Promise<ProductDTO[]> {
  try {
    await ensureCatalogSeeded();
    const conditions = [];

    if (filters?.category && filters.category !== 'all') {
      conditions.push(eq(products.category, filters.category));
    }
    if (filters?.search && filters.search.trim().length > 0) {
      const pattern = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(products.name, pattern),
          ilike(products.brand, pattern),
          ilike(products.barcode, pattern),
          ilike(products.description, pattern)
        )
      );
    }

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(products)
            .where(and(...conditions))
            .orderBy(desc(products.createdAt))
        : await db.select().from(products).orderBy(desc(products.createdAt));

    let hydrated = await hydrateManyProducts(rows);

    if (filters?.grade && filters.grade !== 'all') {
      hydrated = hydrated.filter((p) => p.score.grade === filters.grade);
    }

    switch (filters?.sort) {
      case 'score_asc':
        hydrated.sort(
          (a, b) => (a.score.overallScore ?? -1) - (b.score.overallScore ?? -1)
        );
        break;
      case 'recent':
        hydrated.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'name':
        hydrated.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'score_desc':
      default:
        hydrated.sort(
          (a, b) => (b.score.overallScore ?? -1) - (a.score.overallScore ?? -1)
        );
        break;
    }

    return hydrated;
  } catch (error) {
    console.error('Database query failed (listProducts):', error);
    throw new Error('Failed to load products catalog.', { cause: error });
  }
}

export async function getProductByIdOrBarcode(
  idOrBarcode: string
): Promise<ProductDTO | null> {
  try {
    await ensureCatalogSeeded();
    const numericId = /^\d{1,7}$/.test(idOrBarcode) ? Number(idOrBarcode) : null;

    const rows =
      numericId !== null
        ? await db
            .select()
            .from(products)
            .where(or(eq(products.id, numericId), eq(products.barcode, idOrBarcode)))
            .limit(1)
        : await db
            .select()
            .from(products)
            .where(eq(products.barcode, idOrBarcode))
            .limit(1);

    if (rows.length === 0) return null;
    const hydrated = await hydrateManyProducts(rows);
    return hydrated[0] || null;
  } catch (error) {
    console.error('Database query failed (getProductByIdOrBarcode):', error);
    throw new Error('Failed to retrieve product details.', { cause: error });
  }
}

export async function upsertExternalProduct(
  item: NormalizedExternalProduct
): Promise<ProductDTO> {
  try {
    await ensureCatalogSeeded();

    const existing = await db
      .select()
      .from(products)
      .where(eq(products.barcode, item.barcode))
      .limit(1);

    if (existing.length > 0) {
      const hydrated = await hydrateManyProducts(existing);
      return hydrated[0];
    }

    const inserted = await db
      .insert(products)
      .values({
        barcode: item.barcode,
        name: item.name,
        brand: item.brand,
        category: item.category,
        description: item.description,
        imageUrl: item.imageUrl,
        priceCents: item.priceCents,
        currency: 'INR',
        packagingSummary: item.packagingSummary,
        packagingType: item.packagingType,
        originCountry: item.originCountry,
        isSampleData: item.isSampleData,
        sourceLabel: item.sourceLabel,
      })
      .returning();

    const productRow = inserted[0];
    const computed = buildScoreFromNormalized(item);

    await db.insert(sustainabilityScores).values({
      productId: productRow.id,
      overallScore: computed.overallScore,
      grade: computed.grade,
      ingredientScore: computed.ingredientScore,
      packagingScore: computed.packagingScore,
      brandEthicsScore: computed.brandEthicsScore,
      energyScore: computed.energyScore,
      confidencePercent: computed.confidencePercent,
      availableDimensions: computed.availableDimensions,
      ingredientExplanation: item.scoreInputs.ingredient.explanation,
      packagingExplanation: item.scoreInputs.packaging.explanation,
      brandEthicsExplanation: item.scoreInputs.ethics.explanation,
      energyExplanation: item.scoreInputs.energy.explanation,
      ingredientSource: item.scoreInputs.ingredient.source,
      packagingSource: item.scoreInputs.packaging.source,
      brandEthicsSource: item.scoreInputs.ethics.source,
      energySource: item.scoreInputs.energy.source,
      strongestFactor: computed.strongestFactor,
      weakestFactor: computed.weakestFactor,
      methodologyVersion: computed.methodologyVersion,
    });

    if (item.ingredients.length > 0) {
      await db.insert(productIngredients).values(
        item.ingredients.map((ing, idx) => ({
          productId: productRow.id,
          name: ing.name,
          inciName: ing.inciName || null,
          purpose: ing.purpose || null,
          safetyStatus: ing.safetyStatus,
          regulatoryInfo: ing.regulatoryInfo || null,
          warningText: ing.warningText || null,
          sourceName: ing.sourceName,
          position: idx,
        }))
      );
    }

    if (item.sources.length > 0) {
      await db.insert(productSources).values(
        item.sources.map((src) => ({
          productId: productRow.id,
          sourceName: src.sourceName,
          sourceType: src.sourceType,
          sourceUrl: src.sourceUrl || null,
          licenseNote: src.licenseNote || null,
          isVerifiedExternal: src.isVerifiedExternal,
        }))
      );
    }

    const hydrated = await hydrateManyProducts([productRow]);
    return hydrated[0];
  } catch (error) {
    console.error('Database query failed (upsertExternalProduct):', error);
    throw new Error('Failed to store external product record.', { cause: error });
  }
}

export async function getOrCreateUserProfile(
  uid: string,
  email: string,
  displayName?: string | null,
  avatarUrl?: string | null
): Promise<{ profile: UserProfileDTO; preferences: UserPreferencesDTO }> {
  try {
    const safeName =
      (displayName && displayName.trim()) || email.split('@')[0] || 'SUvita Member';

    const [profileRow] = await db
      .insert(profiles)
      .values({
        uid,
        email,
        displayName: safeName,
        avatarUrl: avatarUrl || null,
      })
      .onConflictDoUpdate({
        target: profiles.uid,
        set: {
          email,
          updatedAt: new Date(),
        },
      })
      .returning();

    await db
      .insert(userPreferences)
      .values({
        uid,
        mainReason: 'make_healthier_sustainable_choices',
        preferredCategories: ['food_beverages', 'personal_care'],
        priorities: ['ingredient_transparency', 'packaging'],
        onboardingCompleted: false,
        saveChatHistory: true,
      })
      .onConflictDoNothing({ target: userPreferences.uid });

    const [prefRow] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.uid, uid))
      .limit(1);

    return {
      profile: {
        uid: profileRow.uid,
        email: profileRow.email,
        displayName: profileRow.displayName,
        avatarUrl: profileRow.avatarUrl,
      },
      preferences: {
        mainReason: prefRow.mainReason,
        preferredCategories: (prefRow.preferredCategories || []) as ProductCategory[],
        priorities: (prefRow.priorities || []) as SustainabilityPriority[],
        onboardingCompleted: prefRow.onboardingCompleted,
        emailNotifications: prefRow.emailNotifications,
        weeklyDigest: prefRow.weeklyDigest,
        alternativeAlerts: prefRow.alternativeAlerts,
        saveChatHistory: prefRow.saveChatHistory,
      },
    };
  } catch (error) {
    console.error('Database query failed (getOrCreateUserProfile):', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

export async function updateUserProfile(
  uid: string,
  updates: { displayName?: string; avatarUrl?: string | null }
): Promise<UserProfileDTO> {
  try {
    const setObj: Partial<typeof profiles.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (typeof updates.displayName === 'string' && updates.displayName.trim()) {
      setObj.displayName = updates.displayName.trim().slice(0, 80);
    }
    if (updates.avatarUrl !== undefined) {
      setObj.avatarUrl = updates.avatarUrl;
    }

    const [updated] = await db
      .update(profiles)
      .set(setObj)
      .where(eq(profiles.uid, uid))
      .returning();

    return {
      uid: updated.uid,
      email: updated.email,
      displayName: updated.displayName,
      avatarUrl: updated.avatarUrl,
    };
  } catch (error) {
    console.error('Database query failed (updateUserProfile):', error);
    throw new Error('Failed to update profile.', { cause: error });
  }
}

export async function updateUserPreferences(
  uid: string,
  updates: Partial<UserPreferencesDTO>
): Promise<UserPreferencesDTO> {
  try {
    const setObj: Partial<typeof userPreferences.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (typeof updates.mainReason === 'string') setObj.mainReason = updates.mainReason;
    if (Array.isArray(updates.preferredCategories)) {
      setObj.preferredCategories = updates.preferredCategories;
    }
    if (Array.isArray(updates.priorities)) {
      setObj.priorities = updates.priorities;
    }
    if (typeof updates.onboardingCompleted === 'boolean') {
      setObj.onboardingCompleted = updates.onboardingCompleted;
    }
    if (typeof updates.emailNotifications === 'boolean') {
      setObj.emailNotifications = updates.emailNotifications;
    }
    if (typeof updates.weeklyDigest === 'boolean') {
      setObj.weeklyDigest = updates.weeklyDigest;
    }
    if (typeof updates.alternativeAlerts === 'boolean') {
      setObj.alternativeAlerts = updates.alternativeAlerts;
    }
    if (typeof updates.saveChatHistory === 'boolean') {
      setObj.saveChatHistory = updates.saveChatHistory;
    }

    const [row] = await db
      .update(userPreferences)
      .set(setObj)
      .where(eq(userPreferences.uid, uid))
      .returning();

    return {
      mainReason: row.mainReason,
      preferredCategories: (row.preferredCategories || []) as ProductCategory[],
      priorities: (row.priorities || []) as SustainabilityPriority[],
      onboardingCompleted: row.onboardingCompleted,
      emailNotifications: row.emailNotifications,
      weeklyDigest: row.weeklyDigest,
      alternativeAlerts: row.alternativeAlerts,
      saveChatHistory: row.saveChatHistory,
    };
  } catch (error) {
    console.error('Database query failed (updateUserPreferences):', error);
    throw new Error('Failed to update preferences.', { cause: error });
  }
}

export async function recordUserScan(
  uid: string,
  productId: number,
  scanMethod: 'camera' | 'manual' | 'search' = 'manual'
): Promise<ScanRecordDTO> {
  try {
    const product = await getProductByIdOrBarcode(String(productId));
    if (!product) throw new Error('Product not found');

    const [inserted] = await db
      .insert(scans)
      .values({
        userUid: uid,
        productId: product.id,
        barcode: product.barcode,
        scanMethod,
        ecoscoreSnapshot: product.score.overallScore,
        gradeSnapshot: product.score.grade,
      })
      .returning();

    return {
      id: inserted.id,
      productId: inserted.productId,
      barcode: inserted.barcode,
      scanMethod: inserted.scanMethod as ScanRecordDTO['scanMethod'],
      ecoscoreSnapshot: inserted.ecoscoreSnapshot,
      gradeSnapshot: inserted.gradeSnapshot as EcoGrade,
      scannedAt: inserted.scannedAt.toISOString(),
      product,
    };
  } catch (error) {
    console.error('Database query failed (recordUserScan):', error);
    throw new Error('Failed to save scan record.', { cause: error });
  }
}

export async function getUserScans(uid: string, limit = 50): Promise<ScanRecordDTO[]> {
  try {
    const rows = await db
      .select()
      .from(scans)
      .where(eq(scans.userUid, uid))
      .orderBy(desc(scans.scannedAt))
      .limit(limit);

    if (rows.length === 0) return [];
    const productIds = Array.from(new Set(rows.map((r) => r.productId)));
    const prodRows = await db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));
    const hydrated = await hydrateManyProducts(prodRows);
    const prodMap = new Map(hydrated.map((p) => [p.id, p]));

    return rows
      .map((r) => {
        const prod = prodMap.get(r.productId);
        if (!prod) return null;
        return {
          id: r.id,
          productId: r.productId,
          barcode: r.barcode,
          scanMethod: r.scanMethod as ScanRecordDTO['scanMethod'],
          ecoscoreSnapshot: r.ecoscoreSnapshot,
          gradeSnapshot: r.gradeSnapshot as EcoGrade,
          scannedAt: r.scannedAt.toISOString(),
          product: prod,
        };
      })
      .filter((x): x is ScanRecordDTO => x !== null);
  } catch (error) {
    console.error('Database query failed (getUserScans):', error);
    throw new Error('Failed to load scan history.', { cause: error });
  }
}

export async function getUserSavedProducts(uid: string): Promise<SavedProductDTO[]> {
  try {
    const rows = await db
      .select()
      .from(savedProducts)
      .where(eq(savedProducts.userUid, uid))
      .orderBy(desc(savedProducts.savedAt));

    if (rows.length === 0) return [];
    const prodRows = await db
      .select()
      .from(products)
      .where(inArray(products.id, rows.map((r) => r.productId)));
    const hydrated = await hydrateManyProducts(prodRows);
    const prodMap = new Map(hydrated.map((p) => [p.id, p]));

    return rows
      .map((r) => {
        const prod = prodMap.get(r.productId);
        if (!prod) return null;
        return {
          id: r.id,
          productId: r.productId,
          notes: r.notes,
          savedAt: r.savedAt.toISOString(),
          product: prod,
        };
      })
      .filter((x): x is SavedProductDTO => x !== null);
  } catch (error) {
    console.error('Database query failed (getUserSavedProducts):', error);
    throw new Error('Failed to load saved products.', { cause: error });
  }
}

export async function saveProductForUser(
  uid: string,
  productId: number,
  notes?: string
): Promise<void> {
  try {
    await db
      .insert(savedProducts)
      .values({
        userUid: uid,
        productId,
        notes: notes || null,
      })
      .onConflictDoNothing({
        target: [savedProducts.userUid, savedProducts.productId],
      });
  } catch (error) {
    console.error('Database query failed (saveProductForUser):', error);
    throw new Error('Failed to save product.', { cause: error });
  }
}

export async function unsaveProductForUser(
  uid: string,
  productId: number
): Promise<void> {
  try {
    await db
      .delete(savedProducts)
      .where(
        and(eq(savedProducts.userUid, uid), eq(savedProducts.productId, productId))
      );
  } catch (error) {
    console.error('Database query failed (unsaveProductForUser):', error);
    throw new Error('Failed to remove saved product.', { cause: error });
  }
}

export async function getUserCollections(uid: string): Promise<CollectionDTO[]> {
  try {
    const colRows = await db
      .select()
      .from(collections)
      .where(eq(collections.userUid, uid))
      .orderBy(desc(collections.createdAt));

    if (colRows.length === 0) return [];
    const colIds = colRows.map((c) => c.id);
    const joinRows = await db
      .select()
      .from(collectionProducts)
      .where(inArray(collectionProducts.collectionId, colIds));

    const prodIds = Array.from(new Set(joinRows.map((j) => j.productId)));
    const prodRows =
      prodIds.length > 0
        ? await db.select().from(products).where(inArray(products.id, prodIds))
        : [];
    const hydrated = await hydrateManyProducts(prodRows);
    const prodMap = new Map(hydrated.map((p) => [p.id, p]));

    return colRows.map((c) => {
      const itemIds = joinRows
        .filter((j) => j.collectionId === c.id)
        .map((j) => j.productId);
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        createdAt: c.createdAt.toISOString(),
        productIds: itemIds,
        products: itemIds
          .map((id) => prodMap.get(id))
          .filter((p): p is ProductDTO => Boolean(p)),
      };
    });
  } catch (error) {
    console.error('Database query failed (getUserCollections):', error);
    throw new Error('Failed to load collections.', { cause: error });
  }
}

export async function createUserCollection(
  uid: string,
  name: string,
  description?: string
): Promise<CollectionDTO> {
  try {
    const [created] = await db
      .insert(collections)
      .values({
        userUid: uid,
        name: name.trim().slice(0, 80),
        description: description?.trim().slice(0, 240) || null,
      })
      .returning();

    return {
      id: created.id,
      name: created.name,
      description: created.description,
      createdAt: created.createdAt.toISOString(),
      productIds: [],
      products: [],
    };
  } catch (error) {
    console.error('Database query failed (createUserCollection):', error);
    throw new Error('Failed to create collection.', { cause: error });
  }
}

export async function deleteUserCollection(uid: string, collectionId: number): Promise<void> {
  try {
    await db
      .delete(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.userUid, uid)));
  } catch (error) {
    console.error('Database query failed (deleteUserCollection):', error);
    throw new Error('Failed to delete collection.', { cause: error });
  }
}

export async function addProductToCollection(
  uid: string,
  collectionId: number,
  productId: number
): Promise<void> {
  try {
    const owned = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.userUid, uid)))
      .limit(1);

    if (owned.length === 0) {
      throw new Error('Collection not found or unauthorized');
    }

    await db
      .insert(collectionProducts)
      .values({ collectionId, productId })
      .onConflictDoNothing({
        target: [collectionProducts.collectionId, collectionProducts.productId],
      });
  } catch (error) {
    console.error('Database query failed (addProductToCollection):', error);
    throw new Error('Failed to add product to collection.', { cause: error });
  }
}

export async function removeProductFromCollection(
  uid: string,
  collectionId: number,
  productId: number
): Promise<void> {
  try {
    const owned = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.userUid, uid)))
      .limit(1);

    if (owned.length === 0) {
      throw new Error('Collection not found or unauthorized');
    }

    await db
      .delete(collectionProducts)
      .where(
        and(
          eq(collectionProducts.collectionId, collectionId),
          eq(collectionProducts.productId, productId)
        )
      );
  } catch (error) {
    console.error('Database query failed (removeProductFromCollection):', error);
    throw new Error('Failed to remove product from collection.', { cause: error });
  }
}

// ==================== SAVED COMPARISONS ====================
export async function createSavedComparisonRecord(
  uid: string,
  productAId: number,
  productBId: number,
  productCId: number | null,
  title: string,
  summarySnapshot: string | null
): Promise<SavedComparisonDTO> {
  try {
    const [row] = await db
      .insert(savedComparisons)
      .values({
        userUid: uid,
        productAId,
        productBId,
        productCId,
        title: title.slice(0, 140),
        summarySnapshot,
      })
      .returning();

    // Also record in product_comparisons for backwards compatibility
    const ids = [productAId, productBId, ...(productCId ? [productCId] : [])];
    await db.insert(productComparisons).values({
      userUid: uid,
      productIds: ids,
      title: title.slice(0, 140),
    });

    const prodRows = await db.select().from(products).where(inArray(products.id, ids));
    const hydrated = await hydrateManyProducts(prodRows);
    const prodMap = new Map(hydrated.map((p) => [p.id, p]));

    return {
      id: row.id,
      productAId: row.productAId,
      productBId: row.productBId,
      productCId: row.productCId,
      title: row.title,
      summarySnapshot: row.summarySnapshot,
      createdAt: row.createdAt.toISOString(),
      products: ids.map((id) => prodMap.get(id)).filter((p): p is ProductDTO => Boolean(p)),
    };
  } catch (error) {
    console.error('Database query failed (createSavedComparisonRecord):', error);
    throw new Error('Failed to save comparison.', { cause: error });
  }
}

export async function getUserSavedComparisons(uid: string): Promise<SavedComparisonDTO[]> {
  try {
    const rows = await db
      .select()
      .from(savedComparisons)
      .where(eq(savedComparisons.userUid, uid))
      .orderBy(desc(savedComparisons.createdAt))
      .limit(30);

    if (rows.length === 0) return [];
    const allIds = Array.from(
      new Set(
        rows.flatMap((r) => [
          r.productAId,
          r.productBId,
          ...(r.productCId ? [r.productCId] : []),
        ])
      )
    );
    const prodRows = await db.select().from(products).where(inArray(products.id, allIds));
    const hydrated = await hydrateManyProducts(prodRows);
    const prodMap = new Map(hydrated.map((p) => [p.id, p]));

    return rows.map((r) => {
      const ids = [r.productAId, r.productBId, ...(r.productCId ? [r.productCId] : [])];
      return {
        id: r.id,
        productAId: r.productAId,
        productBId: r.productBId,
        productCId: r.productCId,
        title: r.title,
        summarySnapshot: r.summarySnapshot,
        createdAt: r.createdAt.toISOString(),
        products: ids.map((id) => prodMap.get(id)).filter((p): p is ProductDTO => Boolean(p)),
      };
    });
  } catch (error) {
    console.error('Database query failed (getUserSavedComparisons):', error);
    throw new Error('Failed to load saved comparisons.', { cause: error });
  }
}

export async function deleteUserSavedComparison(uid: string, id: number): Promise<void> {
  try {
    await db
      .delete(savedComparisons)
      .where(and(eq(savedComparisons.id, id), eq(savedComparisons.userUid, uid)));
  } catch (error) {
    console.error('Database query failed (deleteUserSavedComparison):', error);
    throw new Error('Failed to delete saved comparison.', { cause: error });
  }
}

// ==================== PRIVATE AI CONVERSATION HISTORY ====================
export async function listUserAIConversations(uid: string): Promise<AIConversationDTO[]> {
  try {
    const rows = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userUid, uid))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(30);

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      contextProductId: r.contextProductId,
      contextComparisonIds: r.contextComparisonIds,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  } catch (error) {
    console.error('Database query failed (listUserAIConversations):', error);
    throw new Error('Failed to load conversation history.', { cause: error });
  }
}

export async function getUserAIConversation(
  uid: string,
  conversationId: number
): Promise<AIConversationDTO | null> {
  try {
    const [conv] = await db
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userUid, uid)))
      .limit(1);

    if (!conv) return null;

    const msgRows = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conv.id))
      .orderBy(asc(aiMessages.createdAt));

    const messages: AIChatMessageDTO[] = msgRows.map((m) => ({
      id: String(m.id),
      role: m.role as 'user' | 'assistant',
      content: m.content,
      structured: (m.structuredPayload as AIStructuredResponseDTO | null) ?? null,
      createdAt: m.createdAt.toISOString(),
    }));

    return {
      id: conv.id,
      title: conv.title,
      contextProductId: conv.contextProductId,
      contextComparisonIds: conv.contextComparisonIds,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      messages,
    };
  } catch (error) {
    console.error('Database query failed (getUserAIConversation):', error);
    throw new Error('Failed to load conversation messages.', { cause: error });
  }
}

export async function appendAIMessagePair(params: {
  uid: string;
  conversationId?: number | null;
  titleSeed: string;
  contextProductId?: number | null;
  contextComparisonIds?: number[] | null;
  userMessage: string;
  assistantStructured: AIStructuredResponseDTO;
}): Promise<number> {
  try {
    let convId = params.conversationId ?? null;

    if (convId) {
      const owned = await db
        .select({ id: aiConversations.id })
        .from(aiConversations)
        .where(and(eq(aiConversations.id, convId), eq(aiConversations.userUid, params.uid)))
        .limit(1);
      if (owned.length === 0) convId = null;
    }

    if (!convId) {
      const [created] = await db
        .insert(aiConversations)
        .values({
          userUid: params.uid,
          title: params.titleSeed.trim().slice(0, 80) || 'SUvita AI Session',
          contextProductId: params.contextProductId ?? null,
          contextComparisonIds: params.contextComparisonIds ?? null,
        })
        .returning({ id: aiConversations.id });
      convId = created.id;
    } else {
      await db
        .update(aiConversations)
        .set({ updatedAt: new Date() })
        .where(eq(aiConversations.id, convId));
    }

    await db.insert(aiMessages).values([
      {
        conversationId: convId,
        role: 'user',
        content: params.userMessage,
        structuredPayload: null,
      },
      {
        conversationId: convId,
        role: 'assistant',
        content: params.assistantStructured.explanation,
        structuredPayload: params.assistantStructured as unknown as Record<string, unknown>,
      },
    ]);

    return convId;
  } catch (error) {
    console.error('Database query failed (appendAIMessagePair):', error);
    throw new Error('Failed to persist conversation messages.', { cause: error });
  }
}

export async function deleteUserAIConversation(
  uid: string,
  conversationId: number
): Promise<void> {
  try {
    await db
      .delete(aiConversations)
      .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userUid, uid)));
  } catch (error) {
    console.error('Database query failed (deleteUserAIConversation):', error);
    throw new Error('Failed to delete conversation.', { cause: error });
  }
}

// ==================== DASHBOARD & INSIGHTS ====================
export async function buildUserDashboard(
  uid: string,
  preferences: UserPreferencesDTO
): Promise<DashboardSummaryDTO> {
  const [userScans, userSaved, catalog] = await Promise.all([
    getUserScans(uid, 50),
    getUserSavedProducts(uid),
    listProducts({ sort: 'score_desc' }),
  ]);

  const scoredScans = userScans.filter((s) => s.ecoscoreSnapshot !== null);
  const avgScore =
    scoredScans.length > 0
      ? Math.round(
          (scoredScans.reduce((acc, s) => acc + (s.ecoscoreSnapshot as number), 0) /
            scoredScans.length) *
            10
        ) / 10
      : null;

  const sustainableUnique = new Set<number>();
  for (const s of userScans) {
    if (s.gradeSnapshot === 'A' || s.gradeSnapshot === 'B') {
      sustainableUnique.add(s.productId);
    }
  }
  for (const saved of userSaved) {
    if (saved.product.score.grade === 'A' || saved.product.score.grade === 'B') {
      sustainableUnique.add(saved.productId);
    }
  }

  const prefCats = preferences.preferredCategories;
  const topGreen = catalog
    .filter((p) => p.score.grade === 'A' || p.score.grade === 'B')
    .sort((a, b) => {
      const aMatch = prefCats.includes(a.category) ? 12 : 0;
      const bMatch = prefCats.includes(b.category) ? 12 : 0;
      return (
        (b.score.overallScore ?? 0) + bMatch - ((a.score.overallScore ?? 0) + aMatch)
      );
    })
    .slice(0, 4);

  const dayIndex = new Date().getDate() % DAILY_INSIGHTS.length;

  return {
    totalScans: userScans.length,
    averageEcoScore: avgScore,
    sustainableDiscoveredCount: sustainableUnique.size,
    savedCount: userSaved.length,
    recentScans: userScans.slice(0, 5),
    recommendedAlternatives: topGreen,
    insightOfTheDay: DAILY_INSIGHTS[dayIndex],
  };
}

export async function buildUserInsights(uid: string): Promise<InsightsDataDTO> {
  const userScans = await getUserScans(uid, 200);

  const scored = userScans.filter((s) => s.ecoscoreSnapshot !== null);
  const averageEcoScore =
    scored.length > 0
      ? Math.round(
          (scored.reduce((acc, s) => acc + (s.ecoscoreSnapshot as number), 0) /
            scored.length) *
            10
        ) / 10
      : null;

  const abRatedCount = userScans.filter(
    (s) => s.gradeSnapshot === 'A' || s.gradeSnapshot === 'B'
  ).length;

  const grades = ['A', 'B', 'C', 'D', 'E', 'INSUFFICIENT_DATA'];
  const gradeCounts = new Map<string, number>();
  for (const g of grades) gradeCounts.set(g, 0);
  for (const s of userScans) {
    gradeCounts.set(s.gradeSnapshot, (gradeCounts.get(s.gradeSnapshot) || 0) + 1);
  }
  const gradeDistribution = ['A', 'B', 'C', 'D', 'E'].map((g) => ({
    grade: g,
    count: gradeCounts.get(g) || 0,
  }));

  const cats: ProductCategory[] = [
    'food_beverages',
    'beauty_cosmetics',
    'personal_care',
    'household',
  ];
  const categoryBreakdown = cats.map((cat) => {
    const items = userScans.filter((s) => s.product.category === cat);
    const itemsWithScore = items.filter((s) => s.ecoscoreSnapshot !== null);
    const avg =
      itemsWithScore.length > 0
        ? Math.round(
            (itemsWithScore.reduce((acc, i) => acc + (i.ecoscoreSnapshot as number), 0) /
              itemsWithScore.length) *
              10
          ) / 10
        : null;
    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      count: items.length,
      avgScore: avg,
    };
  });

  const byDay = new Map<string, { sum: number; count: number }>();
  for (const s of [...scored].reverse()) {
    const day = s.scannedAt.slice(0, 10);
    const cur = byDay.get(day) || { sum: 0, count: 0 };
    cur.sum += s.ecoscoreSnapshot as number;
    cur.count += 1;
    byDay.set(day, cur);
  }

  const scoreTrend = Array.from(byDay.entries()).map(([date, stats]) => ({
    date,
    avgScore: Math.round((stats.sum / stats.count) * 10) / 10,
    scans: stats.count,
  }));

  return {
    totalScans: userScans.length,
    averageEcoScore,
    abRatedCount,
    gradeDistribution,
    categoryBreakdown,
    scoreTrend,
    timeline: userScans.slice(0, 20).map((s) => ({
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
      'All metrics reflect your verified scanning activity only. SUvita does not fabricate carbon or water reduction estimates when standardized product lifecycle baselines are unavailable.',
  };
}

export async function getProductWithAlternatives(
  idOrBarcode: string,
  preferences?: UserPreferencesDTO | null
) {
  const product = await getProductByIdOrBarcode(idOrBarcode);
  if (!product) return null;
  const catalog = await listProducts({ category: product.category });
  const alternatives = findGreenerAlternatives(product, catalog, preferences, 3);
  return { product, alternatives };
}
