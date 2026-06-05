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
