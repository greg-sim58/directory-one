import 'server-only';
import { LRUCache } from 'lru-cache';

// Per PLAN.md §6: cross-request LRU caches for geocode results and slug lookups.

const geocodeCache = new LRUCache<string, { lat: number; lon: number; city: string }>({
  max: 5_000,
  ttl: 10 * 60 * 1000, // 10 minutes
});

const slugCache = new LRUCache<string, { id: string; slug: string }>({
  max: 10_000,
  ttl: 60 * 60 * 1000, // 1 hour
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
