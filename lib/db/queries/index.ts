import 'server-only';
import { cache } from 'react';
import { and, eq, desc, sql, asc, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  businesses,
  categories,
  cities,
  reviews,
  type Business,
  type Category,
  type City,
  type Review,
} from '@/lib/db/schema';

// Per PLAN.md §6: per-request dedup via React.cache on the common reads.

export const getCityBySlug = cache(async (slug: string): Promise<City | null> => {
  const rows = await db.select().from(cities).where(eq(cities.slug, slug)).limit(1);
  return rows[0] ?? null;
});

export const getAllCities = cache(async (): Promise<City[]> => {
  return db.select().from(cities).orderBy(asc(cities.name));
});

export const getAllCategories = cache(async (): Promise<Category[]> => {
  return db.select().from(categories).orderBy(asc(categories.name));
});

export const getCategoryCountsByCity = cache(
  async (citySlug: string): Promise<Record<string, number>> => {
    const rows = await db
      .select({
        categorySlug: businesses.categorySlug,
        count: sql<number>`count(*)::int`,
      })
      .from(businesses)
      .where(eq(businesses.citySlug, citySlug))
      .groupBy(businesses.categorySlug);
    return Object.fromEntries(rows.map((r) => [r.categorySlug, r.count]));
  },
);

export const getCategoryBySlug = cache(
  async (slug: string): Promise<Category | null> => {
    const rows = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    return rows[0] ?? null;
  },
);

export const getBusinessBySlug = cache(
  async (
    citySlug: string,
    categorySlug: string,
    slug: string,
  ): Promise<Business | null> => {
    const rows = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.citySlug, citySlug),
          eq(businesses.categorySlug, categorySlug),
          eq(businesses.slug, slug),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },
);

export const getBusinessesByCategory = cache(
  async (citySlug: string, categorySlug: string, limit = 50): Promise<Business[]> => {
    return db
      .select()
      .from(businesses)
      .where(
        and(eq(businesses.citySlug, citySlug), eq(businesses.categorySlug, categorySlug)),
      )
      .orderBy(desc(businesses.createdAt))
      .limit(limit);
  },
);

export const getFeaturedBusinesses = cache(
  async (citySlug: string, limit = 6): Promise<Business[]> => {
    return db
      .select()
      .from(businesses)
      .where(eq(businesses.citySlug, citySlug))
      .orderBy(desc(businesses.createdAt))
      .limit(limit);
  },
);

export const getBusinessesBySlugs = cache(
  async (
    citySlug: string,
    categorySlugs: string[],
    limit = 12,
  ): Promise<Business[]> => {
    if (categorySlugs.length === 0) return [];
    return db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.citySlug, citySlug),
          inArray(businesses.categorySlug, categorySlugs),
        ),
      )
      .orderBy(desc(businesses.createdAt))
      .limit(limit);
  },
);

export const getPublishedReviewsForBusiness = cache(
  async (businessId: string, limit = 20): Promise<Review[]> => {
    return db
      .select()
      .from(reviews)
      .where(and(eq(reviews.businessId, businessId), eq(reviews.status, 'published')))
      .orderBy(desc(reviews.createdAt))
      .limit(limit);
  },
);

// Spatial helper: businesses within `radiusKm` of (lat, lon). Phase 5 (map)
// and Phase 4 (search) call this. The GIST index on `businesses.geom`
// (db/migrations/0000_*.sql) makes `ST_DWithin` fast at MVP volumes.
export async function getBusinessesWithinRadius(
  lat: number,
  lon: number,
  radiusKm: number,
  limit = 50,
): Promise<Business[]> {
  return db
    .select()
    .from(businesses)
    .where(
      sql`ST_DWithin(
        ${businesses.geom},
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
        ${radiusKm * 1000}
      )`,
    )
    .limit(limit);
}

export const countBusinesses = cache(
  async (citySlug: string, categorySlug?: string): Promise<number> => {
    const baseWhere = categorySlug
      ? and(eq(businesses.citySlug, citySlug), eq(businesses.categorySlug, categorySlug))
      : eq(businesses.citySlug, citySlug);
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(businesses)
      .where(baseWhere);
    return rows[0]?.count ?? 0;
  },
);
