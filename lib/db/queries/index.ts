import 'server-only';
import { cache } from 'react';
import { and, eq, desc, sql, asc, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  businesses,
  categories,
  cities,
  reviews,
  users,
  type Business,
  type Category,
  type City,
  type Review,
} from '@/lib/db/schema';
import type { BusinessDetail, NearbyItem, ReviewWithUser } from '@/lib/profile/schema';

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

// Phase 6 (business profile): full detail + joined city/category. One row
// per request per slug, deduped via React.cache. Uses DTO projection so
// the page doesn't need to import the raw schema types.
export const getBusinessDetail = cache(
  async (
    citySlug: string,
    categorySlug: string,
    slug: string,
  ): Promise<BusinessDetail | null> => {
    const rows = await db
      .select({
        id: businesses.id,
        slug: businesses.slug,
        name: businesses.name,
        description: businesses.description,
        address: businesses.address,
        lat: businesses.lat,
        lon: businesses.lon,
        phone: businesses.phone,
        website: businesses.website,
        email: businesses.email,
        hours: businesses.hours,
        priceTier: businesses.priceTier,
        amenities: businesses.amenities,
        photos: businesses.photos,
        status: businesses.status,
        createdAt: businesses.createdAt,
        updatedAt: businesses.updatedAt,
        city: { slug: cities.slug, name: cities.name, timezone: cities.timezone },
        category: { slug: categories.slug, name: categories.name },
      })
      .from(businesses)
      .innerJoin(cities, eq(cities.slug, businesses.citySlug))
      .innerJoin(categories, eq(categories.slug, businesses.categorySlug))
      .where(
        and(
          eq(businesses.citySlug, citySlug),
          eq(businesses.categorySlug, categorySlug),
          eq(businesses.slug, slug),
        ),
      )
      .limit(1);
    return (rows[0] as BusinessDetail | undefined) ?? null;
  },
);

// Phase 6: published reviews with the author row joined. The reviews
// query is the basis for both the list and the avg-rating summary.
export const getPublishedReviewsForBusinessWithUser = cache(
  async (businessId: string, limit = 20): Promise<ReviewWithUser[]> => {
    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        text: reviews.text,
        ownerResponse: reviews.ownerResponse,
        ownerRespondedAt: reviews.ownerRespondedAt,
        verifiedPurchase: reviews.verifiedPurchase,
        createdAt: reviews.createdAt,
        authorName: users.name,
        authorImage: users.image,
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.userId))
      .where(and(eq(reviews.businessId, businessId), eq(reviews.status, 'published')))
      .orderBy(desc(reviews.createdAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      rating: r.rating as 1 | 2 | 3 | 4 | 5,
      text: r.text,
      ownerResponse: r.ownerResponse,
      ownerRespondedAt: r.ownerRespondedAt,
      verifiedPurchase: r.verifiedPurchase,
      createdAt: r.createdAt,
      author: { name: r.authorName, image: r.authorImage },
    }));
  },
);

// Phase 6: nearest neighbors within `radiusKm` of the given business,
// excluding the business itself. Uses the GIST index on `geom`.
export const getNearbyBusinesses = cache(
  async (
    businessId: string,
    lat: number,
    lon: number,
    radiusKm = 5,
    limit = 8,
  ): Promise<NearbyItem[]> => {
    const rows = await db
      .select({
        id: businesses.id,
        slug: businesses.slug,
        name: businesses.name,
        lat: businesses.lat,
        lon: businesses.lon,
        distanceM: sql<number>`ST_Distance(
          ${businesses.geom},
          ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
        )::int`,
      })
      .from(businesses)
      .where(
        and(
          sql`ST_DWithin(
            ${businesses.geom},
            ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
            ${radiusKm * 1000}
          )`,
          sql`${businesses.id} <> ${businessId}`,
        ),
      )
      .orderBy(sql`ST_Distance(
        ${businesses.geom},
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
      )`)
      .limit(limit);
    return rows as NearbyItem[];
  },
);
