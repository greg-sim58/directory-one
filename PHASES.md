# Implementation Phases

> Derived from `PLAN.md` §13. Order is preserved as written; the **Carve-out notes** at the bottom list items dropped or deferred from the plan based on the plan review.

## Pre-flight decisions (block everything — from plan §14)

- [ ] Confirm launch city (default: Austin, TX)
- [ ] Search engine: in-process Postgres (current) vs Meilisearch/Algolia/Typesense (deferred until >5k businesses per city)
- [ ] Auth providers: email magic link + Google?
- [ ] Review moderation policy (auto-publish vs queue first review)
- [ ] Image moderation (none for MVP, rely on reports?)
- [ ] Seed data source (state business filings + OSM — confirm licenses/coverage)
- [ ] Analytics provider
- [ ] Design direction sign-off (Editorial Civic or alternative)

## Phase 1 — Scaffold (1–2d)

- [x] `create-next-app` with Next.js 16 + React 19 + TypeScript (plan said 15; took latest 16.2.7)
- [x] Install + configure Tailwind v4
- [x] Install shadcn/ui primitives (base-nova style)
- [x] ESLint + Prettier setup
- [x] Drizzle config + Neon client + `.env.example`
- [x] Auth.js v5 skeleton (Google + Resend providers, no DrizzleAdapter yet — deferred to Phase 8)
- [ ] Vercel project link + env vars
- [x] `proxy.ts` skeleton (geo headers) — Next 16 renamed `middleware.ts` → `proxy.ts`
- [x] Project directory structure per PLAN.md §4 (drop `lib/ai/`)

## Phase 2 — Data layer (2–3d)

- [x] Drizzle schema per PLAN.md §5 (users, cities, categories, businesses, reviews, photos, saved, claims, reports + auth tables)
- [x] PostGIS extension + `geom geography(Point,4326)` + GIST index + sync trigger
- [x] Initial migration (`0000_*.sql` + hand-written `0001_postgis.sql`)
- [x] Seed script: 1 city (Austin), 50 businesses, 10 categories, 10 users, 200 reviews
- [x] Seed validation: counts, geo bounds within city bbox, referential integrity
- [x] Lazy `db` Proxy so build works without `DATABASE_URL`
- [x] Query helpers (RSC + `React.cache`): `getCityBySlug`, `getAllCities`, `getAllCategories`, `getCategoryCountsByCity`, `getBusinessBySlug`, `getBusinessesByCategory`, `getFeaturedBusinesses`, `getBusinessesBySlugs`, `getPublishedReviewsForBusiness`, `getBusinessesWithinRadius`, `countBusinesses`

## Phase 3 — Marketing + city home (1–2d)

- [x] `app/layout.tsx` — font hoisting, inline theme script
- [x] `app/page.tsx` — marketing home (Editorial Civic hero + how-it-works + category strip)
- [x] `app/(app)/layout.tsx` — header, footer (LocationPicker embedded in Header)
- [x] `app/(app)/[city]/page.tsx` — city home (hero + search + category grid)
- [x] `LocationProvider`, `SWRProvider` placeholders
- [x] `ThemeToggle` (`useSyncExternalStore` + `MutationObserver`)
- [x] `Header` (async RSC, fetches cities + location)
- [x] `LocationPicker` (functional Dialog, geolocation + city list + search, writes `loc` cookie + `router.push`)
- [x] `Footer`
- [x] `lib/location.ts` `readResolvedLocation` (URL > cookie > IP geo > default)
- [x] `lib/category-icons.ts` (lucide map)
- [x] `app/api/geocode` wired to real Mapbox with LRU cache
- [x] `force-dynamic` on `/` and `/[city]` so build doesn't prerender without DB
- [x] `typecheck` + `lint` + `build` pass

## Phase 4 — Search + filters (3–4d)

- [x] `lib/search/queries.ts` — Drizzle/Postgres in-process search (page + total + 2 facet queries in parallel; `React.cache` dedup)
- [x] `/api/search` route (Zod validate, `s-maxage=60`, `stale-while-revalidate=300`)
- [x] `/api/reindex` route (no-op heartbeat; vercel.json cron `0 4 * * 0`)
- [x] LRU cache for facet counts (60s, 500 entries, `lib/cache`)
- [x] `SearchBar` (client, debounced, optimistic URL write via `router.replace` + `startTransition`)
- [x] `FilterPanel` (client, URL sync for sort/price/amenities, facet counts)
- [x] `ResultsList` + `ResultCard` (RSC, DTO projection)
- [x] Suspense skeletons per region (`components/search/skeletons`)

> **Search engine:** in-process Drizzle queries on Postgres. No external service, no index to manage, no reindex step. Single seam (`lib/search/queries.ts`) can be swapped for Meilisearch/Algolia/Typesense later by replacing that one file.

## Phase 5 — Map split view (2–3d)

- [x] Mapbox env + style config (`NEXT_PUBLIC_MAPBOX_TOKEN` + `MAPBOX_STYLE_LIGHT/DARK` in `lib/map/mapbox-style.ts`)
- [x] `MapClient` (Client boundary) → `MapView` (lazy-loaded via `next/dynamic({ ssr: false })` per Next 16 lazy-loading rules)
- [x] `MapPin` (custom client marker, lucide `MapPin`, keyboard-focusable)
- [x] `MapSyncProvider` Context for list ↔ map pin highlight (hover/focus)
- [x] bbox updates on filter change — re-fit only when the current view contains zero of the new pins (preserves user's pan/zoom when possible)
- [x] Responsive layout: 3-col on `xl:`, 2-col on `lg:`, stacked `<lg` (filter | list | map → filter | list+map → all stacked)
- [x] Geocoding rate limit (10/min/IP) in `app/api/geocode/route.ts`; in-memory per-instance (MVP), 429 + `Retry-After`
- [x] Accessibility: `aria-label` on map + pins, `aria-current` on selected card, `prefers-reduced-motion` disables flyTo, dark style under `prefers-color-scheme: dark`
- [x] Lazy bundle: mapbox-gl + react-map-gl + mapbox-gl.css only ship on the category page (≈250KB gz)
- [ ] Geocoding IP rate limit (10/min/IP)

## Phase 6 — Business profile (3–4d)

- [x] `app/(app)/[city]/[category]/[slug]/page.tsx` (RSC, force-dynamic, JSON-LD, grid layout)
- [x] `NAPWHeader` (RSC, breadcrumb, badges, stars, address/phone/website)
- [x] `HoursCard` (RSC, today bold, server-formatted `9:00 AM – 5:00 PM` in city timezone)
- [x] `Gallery` (Client, 1–3 layout, lightbox via shadcn Dialog, arrow/ESC nav, priority on hero)
- [x] `ReviewsList` (RSC, summary header, owner-response blockquote, "Write a review" disabled CTA with tooltip)
- [x] `OneTapBar` (Client, sticky on mobile, IntersectionObserver scroll-hide, Call/Directions/Share/Save; Save disabled)
- [x] `NearbyMap` (RSC + reused `MapClient` lazy-load; 8 nearest neighbors via `ST_Distance` + `ST_DWithin`)
- [x] LocalBusiness JSON-LD (aggregateRating, openingHoursSpecification, priceRange, geo)
- [x] `loading.tsx` + `not-found.tsx` per-route
- [x] `getBusinessDetail` (joined city + category), `getPublishedReviewsForBusinessWithUser` (joined author), `getNearbyBusinesses` (PostGIS distance)
- [x] `lib/profile/{hours,rating,format-distance,format-phone,schema}.ts`
- [x] Seed: 1 hero + 2 thumbnail Unsplash photos per business, deterministic by slug

> **`getUser` is deferred to Phase 7** — Phase 6 has no auth-gated actions, so the only user-facing state is the disabled write-review / save buttons with tooltips.

## Phase 7 — Review submission (2d)

- [x] `submitReview` server action (Zod validate, honeypot, spam heuristic, rate-limit, dedup via unique index, `revalidatePath` on success) — `actions/reviews.ts`
- [x] Spam heuristic: no URLs, no disposable-email domains, no all-caps text, name must contain a letter — `lib/reviews/spam.ts`
- [x] `ReviewForm` (client, `useActionState`, optimistic close on success, live region, honeypot field, char counter, 5-star radiogroup with arrow-key nav) — `components/business/ReviewForm.tsx`
- [x] `ReviewsList` updated to open the form in a `Dialog` (no `canWrite` prop); the seeded `verifiedPurchase` badge stays as a cosmetic signal
- [x] Reviews table: `userId` nullable; new `authorName`, `authorEmail`, `authorEmailHash` columns; unique index `(business_id, author_email_hash)` for server-enforced dedup — `db/migrations/0002_oval_the_liberteens.sql`
- [x] Per-IP (10/hr) + per-email (5/hr) rate limit reusing `lib/map/rate-limit.ts`
- [x] Public display helper `formatAuthorName(name)` → "First L." — `lib/reviews/format-author.ts`
- [x] Email hash helper `hashEmail(email)` — `lib/reviews/hash.ts`
- [x] `getPublishedReviewsForBusinessWithUser` now `LEFT JOIN users`; DTO is `ReviewWithGuest` with pre-computed `author.display`
- [x] Seed: each seeded review now sets `authorName`/`authorEmail`/`authorEmailHash` (deduped per business — 4 distinct authors per business)
- [x] `useTransition` not used (server-action-based; `useActionState` handles pending); `revalidatePath` not `revalidateTag` (page is `force-dynamic`, queries are `React.cache` per-request, so `revalidateTag` would be a no-op)

> **Display name = "First L."** (per Phase 7 decision). Email is stored, never shown publicly; GDPR export + delete in Phase 10 must include `authorEmail` (lookup by hash for the requesting user).
>
> **`OwnerResponse` + moderation queue are deferred to Phase 8** — they need auth and a dashboard, which are not in this phase.

## Phase 8 — Auth + dashboard (3–4d)

- [ ] Sign-in: email magic link + Google
- [ ] `claimBusiness` server action (token validation, expiry)
- [ ] `/business/claim/[token]/page.tsx`
- [ ] `/business/dashboard` layout + page
- [ ] `/business/dashboard/listings/[id]` — edit listing
- [ ] Owner responds to reviews from dashboard
- [ ] `saveBusiness` / `unsaveBusiness` server actions
- [ ] `reportContent` server action
- [ ] Per-user + per-IP rate limits

## Phase 9 — Polish (2–3d)

- [ ] `error.tsx` + `loading.tsx` per route segment
- [ ] Accessibility: skip-link, focus rings, keyboard nav (arrow pan, +/- zoom)
- [ ] `aria-hidden` on decorative SVGs; alt on all images
- [ ] Live regions for "saving…" / "review submitted"
- [ ] Color contrast check (both themes)
- [ ] `prefers-reduced-motion` respected (no stagger, no pin drop)
- [ ] Lighthouse audit: LCP < 2.0s, INP < 200ms, CLS < 0.1, mobile > 90
- [ ] Dark mode parity
- [ ] OG image generation (per city/category/business)
- [ ] `content-visibility: auto` on long result lists
- [ ] `useTransition` for filter changes, `useDeferredValue` for pin count
- [ ] Animate wrapper div, not SVG; explicit ternaries for counts

## Phase 10 — Launch prep (1–2d)

- [ ] SEO: title, description, canonical per route
- [ ] `sitemap.xml` (cities → categories → businesses)
- [ ] `robots.txt`
- [ ] Vercel Analytics wired (`next/dynamic` for PostHog when added)
- [ ] Error tracking (Sentry or equivalent)
- [ ] Cookie consent banner (no third-party trackers pre-consent)
- [ ] GDPR/CCPA: data export + delete endpoints
- [ ] Vercel usage alerts (Mapbox, Blob)
- [ ] Smoke test: seed → index → search → profile → submit review → moderate

## Carve-out notes (from the plan review)

- Drop `lib/ai/` directory — YAGNI, P2 out of scope
- Drop "AI Concierge" row from RSC table (PLAN.md §7) — P2
- Defer PostHog, Inngest — not in stack until needed
- Trim PLAN.md §8 perf micro-opts to what profiling actually demands; the 30+ rule list is speculative for an MVP
- Add a tracer-bullet step: build a single city → category → business → review slice end-to-end before phase 2's "data layer first" approach; current PLAN.md §13 builds horizontally
