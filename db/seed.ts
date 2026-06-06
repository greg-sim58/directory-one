// Seed: 1 city (Austin, TX), 10 categories, 50 businesses, 10 users, 200 reviews.
// Self-validates: counts, FK referential integrity, lat/lon within city bbox.
//
// Usage:
//   1. Create a Neon project; copy the connection string into DATABASE_URL.
//   2. Apply migrations: npm run db:migrate
//   3. Run the seed:     npm run db:seed
//
// Idempotent: uses onConflictDoNothing for domain rows so re-running won't
// duplicate. The seed users are inserted with onConflictDoNothing on email.

import 'dotenv/config';
import { createHash, randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from '../lib/db/client';
import {
  businesses,
  categories,
  cities,
  reviews,
  users,
  type PhotoRef,
  type WeeklyHours,
} from '../lib/db/schema';

// ---------- City ----------

const austin = {
  slug: 'austin-tx',
  name: 'Austin',
  state: 'TX',
  country: 'US',
  lat: 30.2672,
  lon: -97.7431,
  bbox: { minLat: 30.0986, minLon: -97.9363, maxLat: 30.5164, maxLon: -97.5614 },
  timezone: 'America/Chicago',
} as const;

// ---------- Categories ----------

const categorySeeds = [
  { slug: 'plumbers', name: 'Plumbers' },
  { slug: 'electricians', name: 'Electricians' },
  { slug: 'restaurants', name: 'Restaurants' },
  { slug: 'cafes', name: 'Cafés' },
  { slug: 'dentists', name: 'Dentists' },
  { slug: 'auto-repair', name: 'Auto Repair' },
  { slug: 'hair-salons', name: 'Hair Salons' },
  { slug: 'gyms', name: 'Gyms' },
  { slug: 'veterinarians', name: 'Veterinarians' },
  { slug: 'landscaping', name: 'Landscaping' },
];

// ---------- Photo catalog (Unsplash hot-link) ----------
// 20 public Unsplash photo IDs. Each business picks 1 hero + 2 thumbs
// deterministically from its slug (see `pickPhotos` below). `next.config.ts`
// already whitelists `images.unsplash.com` in `images.remotePatterns`.
//
// If a photo is later removed, the Gallery's `onError` swaps in a
// category-tinted placeholder — the seed doesn't need to know.

const PHOTO_IDS = [
  '1556909114-f6e7ad7d3136',
  '1554118811-1e0d58224f24',
  '1517248135467-4c7edcad34c4',
  '1517336714731-489689fd1ca8',
  '1497366216548-37526070297c',
  '1497366811353-6870744d04b2',
  '1556761175-5973dc0f32e7',
  '1521737604893-d14cc237f11d',
  '1581092918056-0c4c3acd3789',
  '1556761175-b413da4baf72',
  '1505740420928-5e560c06d30e',
  '1565299624946-b28f40a0ae38',
  '1555396273-367ea4eb4db5',
  '1556761175-4b46a572b786',
  '1564507592333-c60657eea523',
  '1568992687947-868a62a9f521',
  '1565299507177-b0ac66763828',
  '1546069901-ba9599a7e63c',
  '1525351484163-7529414344d8',
  '1486718448742-163732cd1544',
] as const;

function unsplashUrl(id: string, w: number, h: number): string {
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;
}

function pickPhotos(slug: string): PhotoRef[] {
  const hash = createHash('sha256').update(slug).digest();
  const heroIndex = hash[0]! % PHOTO_IDS.length;
  let thumb1 = hash[1]! % PHOTO_IDS.length;
  if (thumb1 === heroIndex) thumb1 = (thumb1 + 1) % PHOTO_IDS.length;
  let thumb2 = hash[2]! % PHOTO_IDS.length;
  if (thumb2 === heroIndex || thumb2 === thumb1) thumb2 = (thumb2 + 1) % PHOTO_IDS.length;
  return [
    { url: unsplashUrl(PHOTO_IDS[heroIndex]!, 1400, 900), w: 1400, h: 900 },
    { url: unsplashUrl(PHOTO_IDS[thumb1]!, 800, 600), w: 800, h: 600 },
    { url: unsplashUrl(PHOTO_IDS[thumb2]!, 800, 600), w: 800, h: 600 },
  ];
}

// ---------- Business name templates ----------

const neighborhoods = [
  'South Congress',
  'East Austin',
  'Hyde Park',
  'Zilker',
  'Mueller',
  'Bouldin Creek',
  'Travis Heights',
  'Clarksville',
  'Windsor Park',
  'Allandale',
];

const businessTemplates: Record<string, string[]> = {
  plumbers: [
    '{n} Plumbing & Drain',
    '{n} Pipeworks',
    'Reliable Rooter of {n}',
    '{n} Plumbing Co.',
    'All Hours Plumbers — {n}',
  ],
  electricians: [
    '{n} Electric',
    'Bright Spark Electric — {n}',
    '{n} Volt & Wire',
    'Ampere Electric of {n}',
    '{n} Power Pros',
  ],
  restaurants: [
    'The {n} Kitchen',
    '{n} Bistro',
    'Casa {n}',
    '{n} Smokehouse',
    'The {n} Table',
  ],
  cafes: [
    '{n} Coffee Co.',
    'The {n} Bean',
    'Daybreak Café — {n}',
    '{n} Roasters',
    '{n} Espresso Bar',
  ],
  dentists: [
    '{n} Family Dental',
    '{n} Smiles Dentistry',
    'Bright Teeth of {n}',
    '{n} Dental Care',
    '{n} Modern Dentistry',
  ],
  'auto-repair': [
    '{n} Auto Service',
    '{n} Motorworks',
    'The {n} Garage',
    '{n} Tire & Lube',
    '{n} Auto Clinic',
  ],
  'hair-salons': [
    '{n} Hair Studio',
    'The {n} Salon',
    'Cuts of {n}',
    '{n} Barber & Co.',
    '{n} Color Bar',
  ],
  gyms: [
    '{n} Fitness',
    'Iron {n}',
    '{n} Strength Co.',
    'The {n} Gym',
    '{n} Cycle & Strength',
  ],
  veterinarians: [
    '{n} Animal Hospital',
    '{n} Veterinary Clinic',
    'Compassionate Care Vet — {n}',
    '{n} Pet Wellness',
    '{n} Animal Care',
  ],
  landscaping: [
    '{n} Lawn & Garden',
    'Greenleaf of {n}',
    '{n} Landscaping Co.',
    '{n} Yard Pros',
    '{n} Tree Service',
  ],
};

const hoursTemplate: WeeklyHours = {
  monday: ['09:00', '17:00'],
  tuesday: ['09:00', '17:00'],
  wednesday: ['09:00', '17:00'],
  thursday: ['09:00', '17:00'],
  friday: ['09:00', '17:00'],
  saturday: ['10:00', '14:00'],
};

const amenityPool = [
  'Wi-Fi',
  'Wheelchair Accessible',
  'Parking',
  'Outdoor Seating',
  'Pet Friendly',
  'Accepts Credit Cards',
  'Walk-ins Welcome',
  'Free Estimates',
];

// ---------- Helpers ----------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function jitterCoord(center: number, spreadDeg: number): number {
  return center + (Math.random() - 0.5) * spreadDeg;
}

function fakePhone(): string {
  return `+1-512-555-${String(Math.floor(1000 + Math.random() * 9000))}`;
}

// ---------- Main ----------

async function main() {
  console.log('Seeding…');

  // 1. City
  await db
    .insert(cities)
    .values(austin)
    .onConflictDoUpdate({
      target: cities.slug,
      set: { name: austin.name, state: austin.state, lat: austin.lat, lon: austin.lon },
    });

  // 2. Categories
  await db.insert(categories).values(categorySeeds).onConflictDoNothing();

  // 3. Users (10): 1 admin, 3 business_owner, 6 regular
  const userRows = [
    {
      id: randomUUID(),
      name: 'Admin',
      email: 'admin@directory.test',
      role: 'admin' as const,
    },
    {
      id: randomUUID(),
      name: 'Owner One',
      email: 'owner1@directory.test',
      role: 'business_owner' as const,
    },
    {
      id: randomUUID(),
      name: 'Owner Two',
      email: 'owner2@directory.test',
      role: 'business_owner' as const,
    },
    {
      id: randomUUID(),
      name: 'Owner Three',
      email: 'owner3@directory.test',
      role: 'business_owner' as const,
    },
    { id: randomUUID(), name: 'Alex', email: 'alex@example.test', role: 'user' as const },
    {
      id: randomUUID(),
      name: 'Bailey',
      email: 'bailey@example.test',
      role: 'user' as const,
    },
    {
      id: randomUUID(),
      name: 'Casey',
      email: 'casey@example.test',
      role: 'user' as const,
    },
    {
      id: randomUUID(),
      name: 'Dakota',
      email: 'dakota@example.test',
      role: 'user' as const,
    },
    {
      id: randomUUID(),
      name: 'Ellis',
      email: 'ellis@example.test',
      role: 'user' as const,
    },
    {
      id: randomUUID(),
      name: 'Frankie',
      email: 'frankie@example.test',
      role: 'user' as const,
    },
  ];

  await db.insert(users).values(userRows).onConflictDoNothing();

  // Re-read users by email so the reviews below reference the canonical
  // UUIDs that are actually in the DB (the user UUIDs in `userRows` are
  // random per-run; on a re-seed the inserts are no-ops, leaving those
  // UUIDs dangling).
  const seededUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users);
  const userByEmail = new Map(seededUsers.map((u) => [u.email, u.id]));
  const canonicalUserIds = userRows
    .map((r) => userByEmail.get(r.email))
    .filter((id): id is string => !!id);
  if (canonicalUserIds.length === 0) {
    throw new Error('No seeded users found after insert');
  }

  // 4. Businesses: 5 per category, 50 total
  const businessRows: (typeof businesses.$inferInsert)[] = [];
  for (const cat of categorySeeds) {
    const templates = businessTemplates[cat.slug] ?? [];
    for (let i = 0; i < 5; i++) {
      const neighborhood =
        neighborhoods[(categorySeeds.indexOf(cat) * 5 + i) % neighborhoods.length];
      const template = templates[i % templates.length];
      const name = template.replace('{n}', neighborhood);
      const lat = jitterCoord(austin.lat, 0.18);
      const lon = jitterCoord(austin.lon, 0.18);
      businessRows.push({
        slug: slugify(name),
        name,
        description: `${cat.name.replace(/s$/, '')} serving the ${neighborhood} area.`,
        categorySlug: cat.slug,
        citySlug: austin.slug,
        address: `${1000 + Math.floor(Math.random() * 8999)} ${neighborhood.split(' ')[0]} Ave, Austin, TX`,
        lat,
        lon,
        geom: { lat, lon },
        phone: fakePhone(),
        website: `https://example.com/${slugify(name)}`,
        email: null,
        hours: hoursTemplate,
        priceTier: (1 + Math.floor(Math.random() * 3)) as 1 | 2 | 3,
        amenities: pickN(amenityPool, 3 + Math.floor(Math.random() * 3)),
        photos: pickPhotos(slugify(name)),
        status: 'unclaimed',
      });
    }
  }
  await db.insert(businesses).values(businessRows).onConflictDoNothing();

  // 5. Reviews: 4 per business, 200 total
  const allBusinesses = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.citySlug, austin.slug));

  const reviewRows: (typeof reviews.$inferInsert)[] = [];
  const reviewTexts = [
    'Great service, would come back!',
    'Solid experience overall. The staff was friendly and the work was quick.',
    'Decent for the price, but nothing extraordinary.',
    'Highly recommend — went above and beyond.',
    'Took longer than expected, but the result was worth it.',
    'Friendly and professional. Easy to recommend.',
    'Reliable, fair pricing, and easy to schedule.',
    'Mixed feelings — some things were great, others could improve.',
  ];

  for (const biz of allBusinesses) {
    for (let i = 0; i < 4; i++) {
      const userId = canonicalUserIds[Math.floor(Math.random() * canonicalUserIds.length)]!;
      reviewRows.push({
        businessId: biz.id,
        userId,
        rating: (3 + Math.floor(Math.random() * 3)) as 3 | 4 | 5,
        text: reviewTexts[Math.floor(Math.random() * reviewTexts.length)],
        verifiedPurchase: Math.random() > 0.5,
        status: 'published',
      });
    }
  }
  await db.insert(reviews).values(reviewRows);

  // 6. Validate
  await validate();
  console.log('Seed complete.');
}

async function validate() {
  const countsResult = await db.execute<{
    cities: number;
    categories: number;
    businesses: number;
    users: number;
    reviews: number;
  }>(sql`
    SELECT
      (SELECT count(*)::int FROM cities) AS cities,
      (SELECT count(*)::int FROM categories) AS categories,
      (SELECT count(*)::int FROM businesses) AS businesses,
      (SELECT count(*)::int FROM users) AS users,
      (SELECT count(*)::int FROM reviews) AS reviews
  `);

  const countsRows = (countsResult as unknown as { rows: Array<Record<string, number>> }).rows;
  const row = countsRows[0]!;
  console.log('Counts:', row);
  const expected = { cities: 1, categories: 10, businesses: 50, users: 10, reviews: 200 };
  for (const [k, v] of Object.entries(expected)) {
    const actual = row[k];
    if (actual !== v) {
      throw new Error(`Expected ${k}=${v}, got ${actual}`);
    }
  }

  // All business lat/lon within the city bbox
  const outOfBoundsResult = await db.execute<{ n: number }>(sql`
    SELECT count(*)::int AS n
    FROM businesses
    WHERE NOT (
      lat BETWEEN ${austin.bbox.minLat} AND ${austin.bbox.maxLat}
      AND lon BETWEEN ${austin.bbox.minLon} AND ${austin.bbox.maxLon}
    )
  `);
  const out = (outOfBoundsResult as unknown as { rows: Array<{ n: number }> }).rows[0]!.n;
  if (out !== 0) {
    throw new Error(`${out} businesses are outside the city bbox`);
  }
  console.log('Lat/lon within city bbox: ✓');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
