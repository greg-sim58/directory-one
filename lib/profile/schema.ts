import type { WeeklyHours, PhotoRef } from '@/lib/db/schema';

export type { WeeklyHours, PhotoRef };

export type BusinessDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string;
  city: { slug: string; name: string; timezone: string };
  category: { slug: string; name: string };
  lat: number;
  lon: number;
  phone: string | null;
  website: string | null;
  email: string | null;
  hours: WeeklyHours | null;
  priceTier: 1 | 2 | 3 | null;
  amenities: string[];
  photos: PhotoRef[];
  status: 'unclaimed' | 'pending' | 'verified' | 'closed';
  createdAt: Date;
  updatedAt: Date;
};

export type ReviewWithGuest = {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  ownerResponse: string | null;
  ownerRespondedAt: Date | null;
  verifiedPurchase: boolean;
  createdAt: Date;
  author: { name: string; display: string; image: string | null };
};

export type NearbyItem = {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lon: number;
  distanceM: number;
};

export const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type DayKey = (typeof DAY_KEYS)[number];
