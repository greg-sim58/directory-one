import 'server-only';
import { cache } from 'react';
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { businesses, type Business } from '@/lib/db/schema';
import { getCachedFacets, setCachedFacets } from '@/lib/cache';
import {
  SearchQuerySchema,
  type BusinessDoc,
  type SearchResponse,
  type FacetCounts,
} from '@/lib/validation';

// Phase 4 search: in-process Postgres implementation. The DB is the
// source of truth — every render of the category page runs four parallel
// Drizzle queries (results + total + 2 facet counts) against the same
// table, so adding rows via Phase 7/8 is automatically reflected without
// any indexing job.
//
// Per PLAN.md §6 / Vercel rule 3.9: per-request dedup with React.cache so
// the same (city, category, q, filters) tuple in one render is computed
// once. Combined with the LRU facet cache (rule 3.4) for cross-request
// hot counts.
//
// To swap in a dedicated search engine later (Meilisearch, Algolia, etc.)
// the only thing that needs to change is this file + the deletion of the
// in-DB facet query pair. The DTO (BusinessDoc) and call sites stay
// identical.

export const searchBusinesses = cache(
  async (rawQuery: Record<string, string | string[] | undefined>): Promise<SearchResponse> => {
    const parsed = SearchQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return { hits: [], total: 0, facets: emptyFacets(), processingTimeMs: 0 };
    }

    const { q, city, category, price, amenities, sort, near, limit, offset } = parsed.data;

    const cityFilter: SQL | null = city ? eq(businesses.citySlug, city) : null;
    const categoryFilter: SQL | null = category ? eq(businesses.categorySlug, category) : null;

    const like = q ? `%${q}%` : null;
    const textFilter: SQL | null = like
      ? (or(
          ilike(businesses.name, like),
          ilike(businesses.description, like),
          ilike(businesses.address, like),
        ) ?? null)
      : null;

    const priceFilter: SQL | null =
      price.length > 0 ? inArray(businesses.priceTier, price.map(Number)) : null;

    const amenityFilter: SQL | null =
      amenities.length > 0
        ? sql`${businesses.amenities} && ARRAY[${sql.join(
            amenities.map((a) => sql`${a}`),
            sql.raw(', '),
          )}]::text[]`
        : null;

    // The four (optionally null) filters are kept as separate variables
    // so each facet query can drop its own filter when computing counts
    // (so the user sees what they'd get if they switched the filter off).
    const all = [cityFilter, categoryFilter, textFilter, priceFilter, amenityFilter].filter(
      (f): f is SQL => f !== null,
    );
    const baseWhere = all.length > 0 ? and(...all) : undefined;

    // ORDER BY
    let orderBy: SQL;
    if (sort === 'name') {
      orderBy = asc(businesses.name);
    } else if (sort === 'distance' && near) {
      const [lat, lon] = near;
      orderBy = sql`ST_Distance(${businesses.geom}, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography) ASC`;
    } else if (sort === 'newest' || !q) {
      orderBy = desc(businesses.createdAt);
    } else {
      // relevance with q: prefer name-prefix matches, then newest
      orderBy = sql`CASE WHEN ${businesses.name} ILIKE ${`${q}%`} THEN 0 ELSE 1 END, ${desc(businesses.createdAt)}`;
    }

    const facetKey = makeFacetKey({ q, city, category, price, amenities });
    const cachedFacets = getCachedFacets(facetKey);

    const start = performance.now();
    try {
      const whereExcluding = (drop: SQL | null): SQL | undefined => {
        const remaining = all.filter((f) => f !== drop);
        return remaining.length > 0 ? and(...remaining) : undefined;
      };

      const [rows, totalRows, priceFacet, amenityFacet] = await Promise.all([
        db.select().from(businesses).where(baseWhere).orderBy(orderBy).limit(limit).offset(offset),

        db
          .select({ count: sql<number>`count(*)::int` })
          .from(businesses)
          .where(baseWhere),

        // priceTier facet: drop the price filter so the user sees counts
        // for tiers they do NOT currently have selected.
        db
          .select({
            priceTier: businesses.priceTier,
            count: sql<number>`count(*)::int`,
          })
          .from(businesses)
          .where(whereExcluding(priceFilter))
          .groupBy(businesses.priceTier),

        // amenities facet: unnest the array, then group by the unnest.
        // Drop the amenities filter for the same reason as above.
        db
          .select({
            amenity: sql<string>`unnest(${businesses.amenities})`,
            count: sql<number>`count(*)::int`,
          })
          .from(businesses)
          .where(whereExcluding(amenityFilter))
          .groupBy(sql`unnest(${businesses.amenities})`),
      ]);

      const hits: BusinessDoc[] = rows.map(toDoc);
      const total = totalRows[0]?.count ?? 0;

      const facets: FacetCounts = {
        priceTier: Object.fromEntries(
          priceFacet.filter((r) => r.priceTier !== null).map((r) => [String(r.priceTier), r.count]),
        ),
        amenities: Object.fromEntries(amenityFacet.map((r) => [r.amenity, r.count])),
        // Status filter is intentionally not applied in Phase 4 (the
        // seed populates a mix of unclaimed/pending/verified). Phase 8
        // will add an auth-gated status filter.
        status: {},
      };
      setCachedFacets(facetKey, facets);

      return {
        hits,
        total,
        facets,
        processingTimeMs: Math.round(performance.now() - start),
      };
    } catch {
      return {
        hits: [],
        total: 0,
        facets: cachedFacets ?? emptyFacets(),
        processingTimeMs: Math.round(performance.now() - start),
      };
    }
  },
);

function toDoc(b: Business): BusinessDoc {
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    description: b.description ?? null,
    address: b.address,
    categorySlug: b.categorySlug,
    citySlug: b.citySlug,
    lat: b.lat,
    lon: b.lon,
    // Kept for the DTO shape so a future search-engine swap doesn't
    // need to change ResultCard. Postgres's geographyPoint is the
    // source of truth for the geo column; we mirror it to {lat,lng}
    // here for the consumer.
    _geo: { lat: b.lat, lng: b.lon },
    priceTier: b.priceTier ?? null,
    amenities: b.amenities ?? [],
    photoUrl: b.photos?.[0]?.url ?? null,
    status: b.status,
    createdAt: Math.floor(new Date(b.createdAt).getTime() / 1000),
  };
}

function emptyFacets(): FacetCounts {
  return { priceTier: {}, amenities: {}, status: {} };
}

function makeFacetKey({
  q,
  city,
  category,
  price,
  amenities,
}: {
  q: string | undefined;
  city: string | undefined;
  category: string | undefined;
  price: string[];
  amenities: string[];
}): string {
  return [q ?? '', city ?? '', category ?? '', ...price, ...amenities].join('|');
}
