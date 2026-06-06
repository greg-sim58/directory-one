import { z } from 'zod';

export { z };

export const CitySlugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9-]+$/, 'lowercase letters, digits, and dashes only');

export const CategorySlugSchema = CitySlugSchema;

export const BusinessSlugSchema = CitySlugSchema;

export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export type GeoPoint = z.infer<typeof GeoPointSchema>;

// ---------- Phase 4: search ----------

const csv = (max = 64) =>
  z
    .string()
    .max(max * 32)
    .transform((s) =>
      s
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
    );

const sort = z.enum(['relevance', 'newest', 'name', 'distance']).default('relevance');

const near = z
  .string()
  .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)
  .transform((s) => {
    const [a, b] = s.split(',');
    return [Number(a), Number(b)] as [number, number];
  })
  .pipe(z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]))
  .optional();

export const SearchQuerySchema = z.object({
  q: z.string().max(256).optional(),
  city: CitySlugSchema.optional(),
  category: CategorySlugSchema.optional(),
  price: csv(8)
    .pipe(z.array(z.string().regex(/^[1-3]$/)).max(3))
    .default([]),
  amenities: csv(32)
    .pipe(z.array(z.string().min(1).max(64)).max(32))
    .default([]),
  sort,
  near,
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(1000).default(0),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const BusinessDocSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  address: z.string(),
  categorySlug: z.string(),
  citySlug: z.string(),
  lat: z.number(),
  lon: z.number(),
  priceTier: z.number().int().min(1).max(3).nullable().optional(),
  amenities: z.array(z.string()).default([]),
  photoUrl: z.string().nullable().optional(),
  status: z.string(),
  createdAt: z.number().int().optional(),
  // Carried for DTO-shape stability with the original Meilisearch-era
  // design; not currently used by the in-process Postgres search.
  _geo: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
});

export type BusinessDoc = z.infer<typeof BusinessDocSchema>;

export type FacetCounts = {
  priceTier: Record<string, number>;
  amenities: Record<string, number>;
  status: Record<string, number>;
};

export type SearchResponse = {
  hits: BusinessDoc[];
  total: number;
  facets: FacetCounts;
  processingTimeMs: number;
  stub?: boolean;
};
