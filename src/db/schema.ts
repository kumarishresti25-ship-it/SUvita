import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// 1. User profiles linked directly by Firebase Auth UID
export const profiles = pgTable('profiles', {
  uid: text('uid').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Persistent user onboarding & sustainability preferences
export const userPreferences = pgTable('user_preferences', {
  uid: text('uid')
    .primaryKey()
    .references(() => profiles.uid, { onDelete: 'cascade' }),
  mainReason: text('main_reason').default('make_healthier_sustainable_choices').notNull(),
  preferredCategories: jsonb('preferred_categories').$type<string[]>().default([]).notNull(),
  priorities: jsonb('priorities').$type<string[]>().default([]).notNull(),
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  emailNotifications: boolean('email_notifications').default(true).notNull(),
  weeklyDigest: boolean('weekly_digest').default(true).notNull(),
  alternativeAlerts: boolean('alternative_alerts').default(true).notNull(),
  saveChatHistory: boolean('save_chat_history').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Products catalog (real fetched + clearly labelled India demo/curated records)
export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    barcode: text('barcode').notNull().unique(),
    name: text('name').notNull(),
    brand: text('brand').notNull(),
    category: text('category').notNull(), // food_beverages | beauty_cosmetics | personal_care | household
    description: text('description').notNull(),
    imageUrl: text('image_url'),
    priceCents: integer('price_cents'), // stored in minor units (paise for INR: 24900 = ₹249)
    currency: text('currency').default('INR').notNull(),
    packagingSummary: text('packaging_summary'),
    packagingType: text('packaging_type'),
    originCountry: text('origin_country'),
    isSampleData: boolean('is_sample_data').default(false).notNull(),
    sourceLabel: text('source_label').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('products_category_idx').on(table.category),
    index('products_barcode_idx').on(table.barcode),
  ]
);

// 4. Product ingredients with transparent safety & regulatory attribution
export const productIngredients = pgTable(
  'product_ingredients',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    inciName: text('inci_name'),
    purpose: text('purpose'),
    safetyStatus: text('safety_status').notNull(), // verified_safe | attention | limited_info
    regulatoryInfo: text('regulatory_info'),
    warningText: text('warning_text'),
    sourceName: text('source_name').notNull(),
    position: integer('position').default(0).notNull(),
  },
  (table) => [index('product_ingredients_product_idx').on(table.productId)]
);

// 5. Transparent EcoScore breakdown (40% Ingredient, 30% Packaging, 20% Brand Ethics, 10% Energy)
export const sustainabilityScores = pgTable('sustainability_scores', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  overallScore: doublePrecision('overall_score'),
  grade: text('grade').notNull(), // A | B | C | D | E | INSUFFICIENT_DATA
  ingredientScore: doublePrecision('ingredient_score'),
  packagingScore: doublePrecision('packaging_score'),
  brandEthicsScore: doublePrecision('brand_ethics_score'),
  energyScore: doublePrecision('energy_score'),
  confidencePercent: integer('confidence_percent').notNull(),
  availableDimensions: integer('available_dimensions').notNull(),
  ingredientExplanation: text('ingredient_explanation').notNull(),
  packagingExplanation: text('packaging_explanation').notNull(),
  brandEthicsExplanation: text('brand_ethics_explanation').notNull(),
  energyExplanation: text('energy_explanation').notNull(),
  ingredientSource: text('ingredient_source').notNull(),
  packagingSource: text('packaging_source').notNull(),
  brandEthicsSource: text('brand_ethics_source').notNull(),
  energySource: text('energy_source').notNull(),
  strongestFactor: text('strongest_factor'),
  weakestFactor: text('weakest_factor'),
  methodologyVersion: text('methodology_version').default('SUvita-EcoScore-v1.0').notNull(),
  calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
});

// 6. Data provenance / source attribution per product
export const productSources = pgTable(
  'product_sources',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    sourceName: text('source_name').notNull(),
    sourceType: text('source_type').notNull(),
    sourceUrl: text('source_url'),
    licenseNote: text('license_note'),
    isVerifiedExternal: boolean('is_verified_external').default(false).notNull(),
    fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
  },
  (table) => [index('product_sources_product_idx').on(table.productId)]
);

// 7. User scan history
export const scans = pgTable(
  'scans',
  {
    id: serial('id').primaryKey(),
    userUid: text('user_uid')
      .references(() => profiles.uid, { onDelete: 'cascade' })
      .notNull(),
    productId: integer('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    barcode: text('barcode').notNull(),
    scanMethod: text('scan_method').default('manual').notNull(),
    ecoscoreSnapshot: doublePrecision('ecoscore_snapshot'),
    gradeSnapshot: text('grade_snapshot').notNull(),
    scannedAt: timestamp('scanned_at').defaultNow().notNull(),
  },
  (table) => [
    index('scans_user_idx').on(table.userUid),
    index('scans_scanned_at_idx').on(table.scannedAt),
  ]
);

// 8. Saved products
export const savedProducts = pgTable(
  'saved_products',
  {
    id: serial('id').primaryKey(),
    userUid: text('user_uid')
      .references(() => profiles.uid, { onDelete: 'cascade' })
      .notNull(),
    productId: integer('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    notes: text('notes'),
    savedAt: timestamp('saved_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('saved_products_user_product_uidx').on(table.userUid, table.productId),
    index('saved_products_user_idx').on(table.userUid),
  ]
);

// 9. User custom collections
export const collections = pgTable(
  'collections',
  {
    id: serial('id').primaryKey(),
    userUid: text('user_uid')
      .references(() => profiles.uid, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('collections_user_idx').on(table.userUid)]
);

// 10. Many-to-many join between collections and products
export const collectionProducts = pgTable(
  'collection_products',
  {
    id: serial('id').primaryKey(),
    collectionId: integer('collection_id')
      .references(() => collections.id, { onDelete: 'cascade' })
      .notNull(),
    productId: integer('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    addedAt: timestamp('added_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('collection_products_uidx').on(table.collectionId, table.productId),
  ]
);

// 11. Legacy/multi product comparisons
export const productComparisons = pgTable(
  'product_comparisons',
  {
    id: serial('id').primaryKey(),
    userUid: text('user_uid')
      .references(() => profiles.uid, { onDelete: 'cascade' })
      .notNull(),
    productIds: jsonb('product_ids').$type<number[]>().notNull(),
    title: text('title').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('product_comparisons_user_idx').on(table.userUid)]
);

// 12. Dedicated saved_comparisons table for Scan & Compare pairs
export const savedComparisons = pgTable(
  'saved_comparisons',
  {
    id: serial('id').primaryKey(),
    userUid: text('user_uid')
      .references(() => profiles.uid, { onDelete: 'cascade' })
      .notNull(),
    productAId: integer('product_a_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    productBId: integer('product_b_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    productCId: integer('product_c_id').references(() => products.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    summarySnapshot: text('summary_snapshot'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('saved_comparisons_user_idx').on(table.userUid)]
);

// 13. SUvita AI private user conversations
export const aiConversations = pgTable(
  'ai_conversations',
  {
    id: serial('id').primaryKey(),
    userUid: text('user_uid')
      .references(() => profiles.uid, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    contextProductId: integer('context_product_id').references(() => products.id, {
      onDelete: 'set null',
    }),
    contextComparisonIds: jsonb('context_comparison_ids').$type<number[]>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('ai_conversations_user_idx').on(table.userUid)]
);

// 14. SUvita AI messages inside private conversations
export const aiMessages = pgTable(
  'ai_messages',
  {
    id: serial('id').primaryKey(),
    conversationId: integer('conversation_id')
      .references(() => aiConversations.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role').notNull(), // user | assistant
    content: text('content').notNull(),
    structuredPayload: jsonb('structured_payload').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('ai_messages_conversation_idx').on(table.conversationId)]
);

// Drizzle ORM Relations
export const profilesRelations = relations(profiles, ({ one, many }) => ({
  preferences: one(userPreferences, {
    fields: [profiles.uid],
    references: [userPreferences.uid],
  }),
  scans: many(scans),
  savedProducts: many(savedProducts),
  collections: many(collections),
  comparisons: many(productComparisons),
  savedComparisons: many(savedComparisons),
  aiConversations: many(aiConversations),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  score: one(sustainabilityScores, {
    fields: [products.id],
    references: [sustainabilityScores.productId],
  }),
  ingredients: many(productIngredients),
  sources: many(productSources),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  owner: one(profiles, {
    fields: [collections.userUid],
    references: [profiles.uid],
  }),
  items: many(collectionProducts),
}));

export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
  owner: one(profiles, {
    fields: [aiConversations.userUid],
    references: [profiles.uid],
  }),
  messages: many(aiMessages),
}));
