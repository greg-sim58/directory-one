# Implementation Phases

> Derived from `PLAN.md` §13. Order is preserved as written; the **Carve-out notes** at the bottom list items dropped or deferred from the plan based on the plan review.

## Pre-flight decisions (block everything — from plan §14)

- [ ] Confirm launch city (default: Austin, TX)
- [ ] Meilisearch: self-host vs Meilisearch Cloud
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

- [ ] Meilisearch client + index config (`lib/search/`)
- [ ] Index seed data into Meilisearch (geo filter `_geo`)
- [ ] `/api/search` route (Zod validate, `s-maxage` + SWR)
- [ ] `/api/reindex` route (cron)
- [ ] `SearchBar` (client, debounced, optimistic)
- [ ] `FilterPanel` (client, URL sync)
- [ ] `ResultsList` + `ResultCard` (RSC)
- [ ] Suspense skeletons per region
- [ ] LRU cache for facet counts

## Phase 5 — Map split view (2–3d)

- [ ] Mapbox env + style config
- [ ] `Map` component (`next/dynamic({ssr:false})`)
- [ ] `MapPin` (client marker)
- [ ] `SplitView` (list ↔ map pin sync)
- [ ] bbox updates on filter change
- [ ] `/api/geocode` route + LRU cache (10min TTL)
- [ ] Geocoding IP rate limit (10/min/IP)

## Phase 6 — Business profile (3–4d)

- [ ] `app/(app)/[city]/[category]/[slug]/page.tsx`
- [ ] `NAPWHeader` (RSC)
- [ ] `HoursCard` (RSC, from `hours jsonb`)
- [ ] `Gallery` (client carousel, `next/image`, `priority` on first)
- [ ] `ReviewsList` (RSC, `toSorted` by created_at)
- [ ] `OneTapBar` (client, sticky on mobile, tel:/maps:/share: handlers)
- [ ] `NearbyMap` (client, radius from `geom`)
- [ ] LocalBusiness JSON-LD structured data
- [ ] `React.cache(getBusinessBySlug)`, `getCity`, `getUser`

## Phase 7 — Review submission (2d)

- [ ] `submitReview` server action (auth, rate-limit, spam heuristic)
- [ ] Spam heuristic: no URLs, link count ≤ N, profanity, suspicious patterns
- [ ] `ReviewForm` (client, optimistic UI, voiceover-tested)
- [ ] `OwnerResponse` (client, inline edit, business-ownership check)
- [ ] `revalidateTag('business:'+id)` on success
- [ ] First-time-reviewer moderation queue (admin view)

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
- [ ] Vercel usage alerts (Mapbox, Blob, Meilisearch)
- [ ] Smoke test: seed → index → search → profile → submit review → moderate

## Carve-out notes (from the plan review)

- Drop `lib/ai/` directory — YAGNI, P2 out of scope
- Drop "AI Concierge" row from RSC table (PLAN.md §7) — P2
- Defer PostHog, Inngest — not in stack until needed
- Trim PLAN.md §8 perf micro-opts to what profiling actually demands; the 30+ rule list is speculative for an MVP
- Add a tracer-bullet step: build a single city → category → business → review slice end-to-end before phase 2's "data layer first" approach; current PLAN.md §13 builds horizontally
