# Plan: Modern Local Services Directory (Next.js) — MVP

## 1. Scope (locked)

**MVP = P0 features only** (per `PROMPT.md`):

- **Discovery:** smart search, faceted filters, split-view map, geolocation + manual override
- **Evaluation:** NAP+W display, verified reviews (with owner responses), media gallery
- **Action:** one-tap Call / Directions / Share / Save
- **Out of scope for MVP:** category icons, AI concierge, menus/pricing tables, trust badges, booking, messaging, deals, gamification, personalization, editorial content. Schema and route placeholders left for later.

**Launch market:** one hyper-local city (e.g., Austin, TX) to solve the cold-start problem.

---

## 2. Tech Stack (locked)

| Layer           | Choice                                                            | Rationale                                               |
| --------------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| Framework       | **Next.js 15 (App Router) + React 19 + TypeScript**               | RSC + streaming + parallel fetching for SEO             |
| Styling         | **Tailwind CSS v4** + **shadcn/ui** primitives                    | Velocity; owns full visual layer                        |
| Hosting         | **Vercel**                                                        | Edge, ISR, image optimization, preview deploys          |
| Database        | **Neon** serverless Postgres + **PostGIS**                        | Geo queries, free tier, serverless-friendly             |
| ORM             | **Drizzle ORM**                                                   | Edge-compatible, type-safe, lightweight                 |
| Auth            | **Auth.js v5 (NextAuth)**                                         | Email + OAuth; roles: `user`, `business_owner`, `admin` |
| Search          | **Meilisearch** (self-hosted on Fly/Railway or Meilisearch Cloud) | Typo-tolerant, fast faceting                            |
| Maps            | **Mapbox GL JS** via `react-map-gl`                               | Vector styling, split-view, cost control                |
| Geocoding       | **Mapbox Geocoding API**                                          | Forward + reverse, with cache                           |
| Image CDN       | **Vercel Blob** + `next/image`                                    | No vendor juggling, on-the-fly resize                   |
| Caching         | `React.cache` (per-request) + `lru-cache` (cross-request)         | Per Vercel best-practices                               |
| Validation      | **Zod**                                                           | Shared client/server schemas                            |
| Analytics       | **Vercel Analytics** + **PostHog** (deferred)                     | Bundle-friendly via `next/dynamic`                      |
| Background jobs | **Inngest** or **Vercel Cron**                                    | Review spam checks, reindex queue                       |
| Email           | **Resend**                                                        | Review notifications, claim flow                        |
| Testing         | **Vitest** + **Playwright**                                       | Unit + E2E                                              |

**Skill files consulted:** `.agents/skills/nextjs-best-practices/SKILL.md`, `.agents/skills/vercel-react-best-practices/AGENTS.md`, `.agents/skills/frontend-design/SKILL.md`. All architectural decisions below align with these.

---

## 3. URL & Routing Strategy

```
/                                        Marketing/landing
/[city]                                  City home (e.g., /austin-tx)
/[city]/[category]                       Category browse (e.g., /austin-tx/plumbers)
/[city]/[category]/[slug]                Business profile
/business/claim/[token]                  Claim portal entry
/business/dashboard/...                  Owner (auth-gated)
/api/search                              Meilisearch proxy
/api/geocode                             Mapbox proxy (rate-limited)
/api/reviews                             POST review (server action preferred)
/api/upload                              Signed upload URLs for Blob
```

**Why slugs not IDs:** SEO + shareable; the `[city]/[category]/[slug]` triple is canonical and must be unique.

**Location strategy (hybrid, per prompt §3):**

- `LocationProvider` (client) tries `navigator.geolocation` → IP fallback (Vercel `x-vercel-ip-*` headers in middleware) → manual city picker.
- Resolved city stored in a cookie `loc=city-slug` + URL segment when possible.
- Server components read location from `params` first, then cookie, then Vercel-IP headers.

---

## 4. Project Structure

```
app/
  layout.tsx                              Root layout, font hoisting, theme script
  page.tsx                                Marketing home
  (app)/
    layout.tsx                            App chrome (header, location picker, footer)
    [city]/
      page.tsx                            City home
      [category]/
        page.tsx                          Search results (RSC + Suspense)
        [slug]/
          page.tsx                        Business profile
  business/
    claim/[token]/page.tsx
    dashboard/
      layout.tsx
      page.tsx
      listings/[id]/page.tsx
  api/
    search/route.ts                       Meilisearch proxy
    geocode/route.ts                      Mapbox proxy
    upload/route.ts                       Blob signed URL
    reindex/route.ts                      Meilisearch sync (cron)
components/
  ui/                                     shadcn primitives (button, card, dialog, ...)
  search/                                 SearchBar, FilterPanel, ResultsList, ResultCard
  map/                                    Map (next/dynamic), MapPin, SplitView
  business/                               NAPWHeader, Gallery, ReviewList, ReviewForm, OneTapBar
  layout/                                 Header, LocationPicker, Footer, ThemeToggle
  providers/                              LocationProvider, ThemeProvider, SWRProvider
lib/
  db/
    schema.ts                             Drizzle schema
    client.ts                             Drizzle client
    queries/                              Server query functions (React.cache wrapped)
  search/                                 Meilisearch client + indexer
  geo/                                    Distance, bbox, geohash helpers
  auth/                                   Auth.js config + helpers
  cache/                                  LRU caches for geocode, slug lookups
  validation/                             Shared Zod schemas
  ai/                                     (P2 placeholder) Concierge
hooks/
actions/                                  Server actions (submit review, save business)
db/
  migrations/
public/
  fonts/                                  Self-hosted display + body fonts
  og/                                     Generated OG image defaults
middleware.ts                             Geo headers, auth redirects
drizzle.config.ts
.env.example
```

---

## 5. Database Schema (high-level)

```
users(id, email, name, image, role, created_at)
cities(slug PK, name, state, country, lat, lon, bbox, timezone)
categories(slug PK, name, icon, parent_slug?, filter_schema jsonb)
businesses(
  id, slug, name, description,
  category_slug FK, city_slug FK,
  address, lat, lon, geom geography(Point,4326),
  phone, website, email,
  hours jsonb,           -- weekly schedule
  price_tier smallint,   -- 1..3
  amenities text[],
  photos jsonb,          -- [{url, alt, w, h}]
  status text,           -- 'unclaimed' | 'pending' | 'verified' | 'closed'
  claimed_by_user_id?,
  created_at, updated_at
)
reviews(
  id, business_id FK, user_id FK,
  rating smallint, text,
  owner_response text?, owner_responded_at?,
  verified_purchase bool, status text, -- 'pending' | 'published' | 'rejected'
  created_at
)
photos(id, business_id FK, user_id FK?, url, alt, status, created_at)
saved_businesses(user_id, business_id, created_at) PK(user_id, business_id)
business_claims(id, business_id, user_id, token, status, expires_at)
report_queue(id, entity_type, entity_id, reason, reporter_user_id, status, created_at)
sessions/accounts/verification_tokens  (Auth.js)
```

**Geo strategy:** `geom geography(Point,4326)` + GIST index for radius queries; `lat`/`lon` denormalized for Meilisearch geo filter (`_geo`).

---

## 6. Data Flow & Caching

### Listing page (`/[city]/[category]`)

Per Vercel rule **3.7 (parallel fetching)**, the page is composed of independent async server components:

- `<CategoryHeader />` — name, count, hero
- `<SearchResults />` — Meilisearch hits (Suspense, streams)
- `<MapView />` — initial bbox + pins (suspense; map client component loaded via `next/dynamic({ ssr:false })`)
- `<FacetedFilters />` — counts from Meilisearch facets

All start in parallel; each has its own `<Suspense>` boundary with a skeleton fallback.

### Business profile (`/[city]/[category]/[slug]`)

Parallel async components:

- `<NAPWHeader businessId />`
- `<Gallery businessId />`
- `<HoursCard businessId />`
- `<ReviewsList businessId />`
- `<NearbyMap businessId />`
- `<OneTapBar businessId />` (client; fixed on mobile)

### Cache layers (per Vercel rules 3.4, 3.5, 3.9, 7.5)

- **Per-request dedup:** `React.cache()` on `getBusinessBySlug`, `getUser`, `getCity`.
- **Cross-request LRU:** geocode results (10 min TTL), `getCategoryFacets`.
- **Static I/O hoisted:** font files for OG images, category icon SVGs, Meilisearch index config.
- **Static assets (no `localStorage` server-side):** last-known location cached in cookie + read once at request start.

### Revalidation

- `revalidate = 300` on category + business pages (ISR) with `revalidateTag('business:'+id)` triggered by review/owner-update server actions.

---

## 7. Server Components vs Client Components

| Component            | RSC | Client                             | Reason                                       |
| -------------------- | --- | ---------------------------------- | -------------------------------------------- |
| Header (logo, links) | ✅  |                                    | Static + server-known user                   |
| LocationPicker       |     | ✅                                 | Geolocation API, click handlers              |
| SearchBar            |     | ✅                                 | Debounced input, autocomplete, optimistic UI |
| FilterPanel          |     | ✅                                 | Multi-select, URL sync                       |
| ResultsList (cards)  | ✅  |                                    | Pure data render                             |
| ResultCard           | ✅  |                                    | Static                                       |
| Map (split view)     |     | ✅ via `next/dynamic({ssr:false})` | Mapbox GL needs window                       |
| MapPin               |     | ✅                                 | Marker interactivity                         |
| BusinessProfile.NAPW | ✅  |                                    | Static data                                  |
| Gallery              |     | ✅                                 | Carousel state                               |
| ReviewsList          | ✅  |                                    | Static list                                  |
| ReviewForm           |     | ✅                                 | Form + optimistic                            |
| OwnerResponse        |     | ✅                                 | Inline edit                                  |
| OneTapBar            |     | ✅                                 | Sticky on mobile                             |
| ThemeToggle          |     | ✅                                 | localStorage, transitions                    |
| AI Concierge (P2)    |     | ✅                                 | Streaming LLM response                       |

**Rule of thumb:** server-first; add `'use client'` only for state, browser APIs, event handlers.

---

## 8. Performance Plan (per skill rules)

- **Waterfalls (CRITICAL):** parallelize via composition (rule 3.7), `Promise.all` for independent reads (1.5), Suspense per region (1.6), `better-all` for partial-dependency chains.
- **Bundle (CRITICAL):** `next/dynamic` for Mapbox, Gallery, ReviewForm, ThemeToggle, Analytics, PostHog (rules 2.3, 2.4). Avoid barrel imports from `lucide-react`, etc. (2.1). Preload Meilisearch client only after first interaction (2.6).
- **RSC payload:** pass only what client needs; trim `businesses.*` to a `BusinessCard` DTO at the boundary (3.6). Derive booleans/strings on server, not arrays (3.2).
- **Re-renders:** subscribe to derived booleans (5.10), narrow effect deps (5.7), put submit logic in handlers (5.8), use `useTransition` for filter changes (5.13), `useDeferredValue` for the live map pin count (5.14), `useRef` for transient map drag values (5.15).
- **Rendering:** `content-visibility: auto` for long result lists (6.2), animate wrapper div not SVG (6.1), inline theme script to prevent dark-mode flash (6.5), `next/script strategy="afterInteractive"` for analytics (6.8), explicit ternaries for counts (6.9).
- **JS micro:** build `Map` indexes for amenity lookups, hoist RegExp, use `toSorted()` for review sort, `flatMap` to filter+map, `requestIdleCallback` to prefetch next page of results.
- **Images:** `next/image` everywhere with `sizes`, blur placeholder, `priority` only for the LCP hero (gallery's first photo, profile's cover).
- **Fonts:** self-host via `next/font/google` to avoid FOIT/CLS; module-level cache.

**Targets:** LCP < 2.0s, INP < 200ms, CLS < 0.1, Lighthouse mobile > 90.

---

## 9. API & Actions

- **`/api/search?q=&city=&filters=`** — Meilisearch proxy. Validates with Zod. Caches common queries via SWR + HTTP cache headers (`s-maxage=60, stale-while-revalidate=300`).
- **`/api/geocode?q=`** — Mapbox proxy, LRU-cached, 10/min/IP.
- **`/api/upload`** — issues Vercel Blob signed URL after auth + business-ownership check.
- **Server actions** (preferred for mutations):
  - `submitReview(input)` — auth + rate-limit + spam check + DB write + `revalidateTag('business:'+id)`.
  - `saveBusiness(id)` / `unsaveBusiness(id)` — auth required.
  - `submitOwnerResponse(reviewId, text)` — auth + business-ownership check.
  - `reportContent(entity, id, reason)` — auth + rate-limit.
  - `claimBusiness(token)` — auth + token validation.

All server actions authenticate **inside** the action (per rule 3.1).

---

## 10. Design Direction

Skill `frontend-design` requires a **bold, intentional aesthetic** with cohesive typography, color, motion, spatial composition.

**Proposed direction (subject to your sign-off):** _Editorial Civic_ — a refined, magazine-style directory that feels local and trustworthy, not generic. Distinct from Yelp's utilitarian blue and Google's sterile white.

- **Type pairing:** a distinctive editorial serif (e.g., _Fraunces_ or _GT Sectra_) for display + a sharp humanist sans (e.g., _Söhne_ / _Geist_ / _Manrope_) for body. No Inter, no Roboto.
- **Color:** warm off-white base (`#FAF7F2`), deep ink for text, single accent (e.g., terracotta or oxblood). Dark mode = warm charcoal (`#1A1816`), same accent.
- **Layout:** asymmetric grid, generous whitespace, oversize numerals for ratings, large editorial hero images per category, sticky bottom action bar on mobile.
- **Motion:** orchestrated page-load stagger (animation-delay), subtle marquee for "Best of", refined hover scale on cards, map pin drop-in.
- **Texture:** grain overlay, paper-like section dividers, large pull-quotes in editorial copy.

If you want a different direction (brutalist, maximalist, retro-futuristic, etc.) say the word before implementation.

---

## 11. Accessibility (WCAG 2.1 AA)

- Skip-to-content link, focus-visible rings, keyboard nav for map (arrow keys pan, +/- zoom).
- All images have `alt`; decorative SVGs `aria-hidden`.
- Live regions for "saving…" / "review submitted".
- Color contrast verified for both themes.
- Reduced motion: respect `prefers-reduced-motion` (skip stagger, disable pin drop).
- VoiceOver-tested review composer.

---

## 12. Risk Mitigations (per prompt §9)

| Risk               | Mitigation                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cold start         | Launch in one city; pre-seed with public-records data; outreach to local businesses via claim portal.                                                                     |
| Review spam        | Auth-gated submissions, per-user rate limit, IP rate limit, simple heuristic (no URLs, link counts, profanity), moderation queue for `<3` reviews or suspicious patterns. |
| Geolocation denied | IP geocoding via Vercel headers in middleware → city cookie; prominent manual picker in header.                                                                           |
| Mapbox cost        | Server-side geocoding cache (LRU), tile prefetch on idle, configurable map style (cheaper style in dev), Vercel usage alerts.                                             |
| GDPR/CCPA          | Cookie consent banner, location data opt-in, no third-party trackers before consent, data export + delete endpoints.                                                      |
| SEO duplication    | Canonical to `/[city]/[category]/[slug]`; city selector in URL for distinct landing pages.                                                                                |

---

## 13. Phased Build Order (MVP)

1. **Scaffold (1–2 days):** Next.js 15, Tailwind, shadcn, ESLint, Prettier, Drizzle, Auth.js, Vercel project, Neon DB, env setup.
2. **Data layer (2–3 days):** schema, migrations, seed script with 1 city + 50 businesses + 200 reviews.
3. **Marketing + city home (1–2 days):** landing, `/[city]` page.
4. **Search + filters (3–4 days):** Meilisearch indexer, `/api/search`, SearchBar, FilterPanel, ResultsList, URL-state sync.
5. **Map split view (2–3 days):** Mapbox setup, `Map` dynamic component, pin sync with list, bbox updates on filter.
6. **Business profile (3–4 days):** NAPW, gallery, hours, reviews list, OneTapBar, structured data (LocalBusiness JSON-LD).
7. **Review submission (2 days):** server action, optimistic UI, owner response.
8. **Auth + dashboard (3–4 days):** sign-in, claim portal, owner dashboard (basic edit, respond to reviews).
9. **Polish (2–3 days):** accessibility pass, perf audit, dark mode, OG images, error/loading states.
10. **Launch prep (1–2 days):** SEO meta, sitemap, robots, analytics, error tracking.

Total: **~3–4 weeks** for one developer.

---

## 14. Open Questions (resolve before/during build)

- **Specific city for launch.** Default: Austin, TX.
- **Self-host Meilisearch or Meilisearch Cloud.** Default: Meilisearch Cloud (free tier covers MVP).
- **Auth providers.** Default: email magic link + Google.
- **Review moderation policy.** Auto-publish vs hold first review from new users? Default: auto-publish, but first review from any new user goes to moderation queue.
- **Image moderation.** Default: no ML moderation in MVP; rely on reports queue.
- **Initial seed data source.** Public-records (state business filings) + OpenStreetMap for categories without NAICS codes.
- **Analytics provider.** Default: Vercel Analytics (zero-config) + PostHog deferred.
- **Brand & design direction.** Confirm _Editorial Civic_ or pick a different aesthetic from the skill's options.

---

### Next step

Confirm the plan (or call out changes), pick a launch city, and confirm the design direction. Once approved, scaffold the project, set up the DB + auth + search, and start with the marketing + city home pages.
