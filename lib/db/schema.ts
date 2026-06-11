// Drizzle schema (PLAN.md §5).
//
// Auth.js tables (users, accounts, sessions, verificationTokens) use the
// column names required by @auth/drizzle-adapter — see
// node_modules/@auth/drizzle-adapter/src/lib/pg.ts. Table names are
// plural + snake_case to match the rest of the domain.
//
// PostGIS: the `geom` column is `geography(Point, 4326)`. The application
// writes both `lat`/`lon` (doubles) and `geom` (WKT) — see customType below.
// A generated column would be cleaner but Drizzle does not yet support them
// in a portable way; trigger or app-level sync is used instead.

import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

const geographyPoint = customType<{
  data: { lat: number; lon: number };
  driverData: string;
}>({
  dataType() {
    return 'geography(Point, 4326)';
  },
  toDriver(value) {
    return `SRID=4326;POINT(${value.lon} ${value.lat})`;
  },
  fromDriver(value) {
    // PostGIS returns hex EWKB for geography columns. The application reads
    // lat/lon directly from the doubles columns, so we just preserve the
    // raw value here and expose a separate read path in lib/db/queries.
    return value as unknown as { lat: number; lon: number };
  },
});

// Enums
export const userRole = pgEnum('user_role', ['user', 'business_owner', 'admin']);
export const businessStatus = pgEnum('business_status', [
  'unclaimed',
  'pending',
  'verified',
  'closed',
]);
export const reviewStatus = pgEnum('review_status', ['pending', 'published', 'rejected']);
export const photoStatus = pgEnum('photo_status', ['pending', 'published', 'rejected']);
export const claimStatus = pgEnum('claim_status', ['pending', 'verified', 'expired', 'revoked']);
export const reportStatus = pgEnum('report_status', ['open', 'resolved', 'dismissed']);

// ---------- Auth.js tables (adapter-required shapes) ----------

export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  role: userRole('role').default('user').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
);

export const sessions = pgTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// ---------- Domain tables ----------

export const cities = pgTable('cities', {
  slug: varchar('slug', { length: 64 }).primaryKey(),
  name: text('name').notNull(),
  state: varchar('state', { length: 64 }),
  country: varchar('country', { length: 64 }).notNull().default('US'),
  lat: doublePrecision('lat').notNull(),
  lon: doublePrecision('lon').notNull(),
  bbox: jsonb('bbox').$type<{ minLat: number; minLon: number; maxLat: number; maxLon: number }>(),
  timezone: text('timezone').notNull().default('America/Chicago'),
});

export const categories = pgTable('categories', {
  slug: varchar('slug', { length: 64 }).primaryKey(),
  name: text('name').notNull(),
  icon: text('icon'),
  parentSlug: varchar('parent_slug', { length: 64 }),
  filterSchema: jsonb('filter_schema'),
});

// Anonymous visitor location preference (home-page Town/City field). There
// is no user/session yet (auth adapter is Phase 8), so the row is keyed by
// an anonymous `vid` cookie instead of a user id. `citySlug` is the matched
// catalog slug when the typed town maps to a directory city, or null for
// off-catalog towns (no FK so off-catalog towns persist cleanly).
export const locationPreferences = pgTable(
  'location_preferences',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    visitorId: text('visitor_id').notNull(),
    townName: text('town_name').notNull(),
    region: varchar('region', { length: 64 }),
    country: varchar('country', { length: 64 }),
    citySlug: varchar('city_slug', { length: 64 }),
    lat: doublePrecision('lat'),
    lon: doublePrecision('lon'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (lp) => [uniqueIndex('location_preferences_visitor_idx').on(lp.visitorId)],
);

export type WeeklyHours = Partial<{
  monday: [string, string];
  tuesday: [string, string];
  wednesday: [string, string];
  thursday: [string, string];
  friday: [string, string];
  saturday: [string, string];
  sunday: [string, string];
}>;

export type PhotoRef = {
  url: string;
  alt?: string;
  w?: number;
  h?: number;
};

export const businesses = pgTable(
  'businesses',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: varchar('slug', { length: 128 }).notNull(),
    name: text('name').notNull(),
    description: text('description'),
    categorySlug: varchar('category_slug', { length: 64 })
      .notNull()
      .references(() => categories.slug),
    citySlug: varchar('city_slug', { length: 64 })
      .notNull()
      .references(() => cities.slug),
    address: text('address').notNull(),
    lat: doublePrecision('lat').notNull(),
    lon: doublePrecision('lon').notNull(),
    geom: geographyPoint('geom'),
    phone: text('phone'),
    website: text('website'),
    email: text('email'),
    hours: jsonb('hours').$type<WeeklyHours>(),
    priceTier: smallint('price_tier'),
    amenities: text('amenities')
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    photos: jsonb('photos')
      .$type<PhotoRef[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    status: businessStatus('status').default('unclaimed').notNull(),
    claimedByUserId: text('claimed_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (b) => [
    uniqueIndex('businesses_city_category_slug_unique').on(b.citySlug, b.categorySlug, b.slug),
    index('businesses_category_idx').on(b.categorySlug),
    index('businesses_geom_idx').using('gist', b.geom),
  ],
);

export const reviews = pgTable(
  'reviews',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    // Phase 7: userId is now nullable. Guest reviews identify the author
    // via authorEmailHash instead. Existing seeded reviews keep their
    // userId so the FK remains valid; new guest reviews pass null.
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    authorName: text('author_name').notNull(),
    authorEmail: text('author_email').notNull(),
    authorEmailHash: text('author_email_hash').notNull(),
    rating: smallint('rating').notNull(),
    text: text('text').notNull(),
    ownerResponse: text('owner_response'),
    ownerRespondedAt: timestamp('owner_responded_at', { mode: 'date' }),
    verifiedPurchase: boolean('verified_purchase').default(false).notNull(),
    status: reviewStatus('status').default('pending').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (r) => [
    index('reviews_business_created_idx').on(r.businessId, r.createdAt),
    index('reviews_user_idx').on(r.userId),
    // Server-enforced dedup: one review per email per business.
    uniqueIndex('reviews_business_email_idx').on(r.businessId, r.authorEmailHash),
    // Rate-limit / future "my reviews" lookups.
    index('reviews_email_hash_idx').on(r.authorEmailHash),
  ],
);

export const photos = pgTable(
  'photos',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id),
    url: text('url').notNull(),
    alt: text('alt'),
    status: photoStatus('status').default('published').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (p) => [index('photos_business_idx').on(p.businessId)],
);

export const savedBusinesses = pgTable(
  'saved_businesses',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (s) => [primaryKey({ columns: [s.userId, s.businessId] })],
);

export const businessClaims = pgTable(
  'business_claims',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    status: claimStatus('status').default('pending').notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  },
  (c) => [index('business_claims_business_idx').on(c.businessId)],
);

export const reportQueue = pgTable(
  'report_queue',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    reason: text('reason').notNull(),
    reporterUserId: text('reporter_user_id').references(() => users.id),
    status: reportStatus('status').default('open').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (r) => [index('report_queue_entity_idx').on(r.entityType, r.entityId)],
);

// ---------- Relations ----------

export const citiesRelations = relations(cities, ({ many }) => ({
  businesses: many(businesses),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  businesses: many(businesses),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  city: one(cities, { fields: [businesses.citySlug], references: [cities.slug] }),
  category: one(categories, {
    fields: [businesses.categorySlug],
    references: [categories.slug],
  }),
  reviews: many(reviews),
  photos: many(photos),
  savedBy: many(savedBusinesses),
  claims: many(businessClaims),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  business: one(businesses, { fields: [reviews.businessId], references: [businesses.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}));

// ---------- Inferred types ----------

export type City = typeof cities.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type LocationPreference = typeof locationPreferences.$inferSelect;
export type NewLocationPreference = typeof locationPreferences.$inferInsert;
export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type User = typeof users.$inferSelect;
export type BusinessClaim = typeof businessClaims.$inferSelect;
export type Report = typeof reportQueue.$inferSelect;
