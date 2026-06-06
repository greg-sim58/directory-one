import 'server-only';
import { LRUCache } from 'lru-cache';
import type { FacetCounts } from '@/lib/validation';

// Per PLAN.md §6: cross-request LRU caches for geocode results, slug lookups,
// and (Phase 4) search facet counts.

const geocodeCache = new LRUCache<string, { lat: number; lon: number; city: string }>({
  max: 5_000,
  ttl: 10 * 60 * 1000, // 10 minutes
});

const slugCache = new LRUCache<string, { id: string; slug: string }>({
  max: 10_000,
  ttl: 60 * 60 * 1000, // 1 hour
});

const facetsCache = new LRUCache<string, FacetCounts>({
  max: 500,
  ttl: 60 * 1000, // 60 seconds
});

export function getCachedGeocode(query: string) {
  return geocodeCache.get(query.toLowerCase().trim());
}

export function setCachedGeocode(query: string, value: { lat: number; lon: number; city: string }) {
  geocodeCache.set(query.toLowerCase().trim(), value);
}

export function getCachedSlug(key: string) {
  return slugCache.get(key);
}

export function setCachedSlug(key: string, value: { id: string; slug: string }) {
  slugCache.set(key, value);
}

export function getCachedFacets(key: string): FacetCounts | undefined {
  return facetsCache.get(key);
}

export function setCachedFacets(key: string, value: FacetCounts) {
  facetsCache.set(key, value);
}
