This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Search (Phase 4)

The category browse page (`/[city]/[category]`) is backed by in-process Drizzle queries against the same Postgres database the rest of the app reads from. There is no separate search service, no index to manage, and no reindex step — the DB is the source of truth and every render queries it directly. The search layer is a single file (`lib/search/queries.ts`) and can be swapped for a dedicated search engine (Meilisearch, Algolia, etc.) at any time by replacing that one file.

### How it works

`searchBusinesses()` runs four parallel Drizzle queries against the `businesses` table for every page render:

1. **Page** — `SELECT … FROM businesses WHERE … ORDER BY … LIMIT $1 OFFSET $2`
2. **Total** — `SELECT count(*)::int FROM businesses WHERE …`
3. **priceTier facet** — `SELECT priceTier, count(*)::int … GROUP BY priceTier` (excluding the price filter, so the user sees what they'd get if they toggled each tier)
4. **amenities facet** — `SELECT unnest(amenities), count(*)::int … GROUP BY 1` (excluding the amenities filter)

The four share the same per-request dedup via `React.cache`, and the facet pair is served from a 60s in-memory LRU keyed on the `(q, city, category, price, amenities)` tuple.

### URL state

The page is a pure URL-state machine. The browser never talks to Postgres directly — it talks to `/api/search`, which validates the query with Zod and runs the same `searchBusinesses()` function the RSC tree uses. Try:

```
/austin-tx/plumbers?q=joe
/austin-tx/plumbers?price=1,2&amenities=delivery,wifi
/austin-tx/plumbers?sort=distance&near=30.27,-97.74
```

### Reindex

None needed. `/api/reindex` is a no-op heartbeat (returns `200 { ok: true, message: 'search engine is in-process; no reindex required' }`). The Vercel cron in `vercel.json` still calls it weekly (`0 4 * * 0`) so any existing monitoring integration keeps working.

### Caching layers

| Layer                     | Where                                                                     | TTL                   |
| ------------------------- | ------------------------------------------------------------------------- | --------------------- |
| Per-request dedup         | `React.cache` on `searchBusinesses()`                                     | one render            |
| Cross-request facet cache | `lib/cache` LRU                                                           | 60s, 500 entries      |
| Edge cache                | `Cache-Control: s-maxage=60, stale-while-revalidate=300` on `/api/search` | 60s fresh, 5min stale |

### When to add `pg_trgm` or a real search engine

At MVP volume (50–500 businesses per city) the in-process Postgres path is fast enough that adding a search service is a net loss of operational complexity. If the dataset grows past ~5k businesses per city, the next step is a hand-written `db/migrations/0002_pg_trgm.sql` (trigram GIN index on `name`/`description`) for fuzzy matching; a dedicated search engine only becomes worth the cost if even that is not fast enough.

### Phase 5 hook

A `<MapSlot>` placeholder is rendered below the results so the split-view layout is reserved. The map will read the same `?q/price/amenities/sort/near` URL state in Phase 5 — no new shared state required.

## Map (Phase 5)

The category browse page renders a Mapbox GL JS split view alongside the result list. The map is fully driven by the same URL state the list reads — when filters change, the page re-renders and the map receives the new pin set as a prop. No client-side data fetching.

### Stack

- **`mapbox-gl`** (vector rendering) + **`react-map-gl/mapbox`** v8 (React wrapper). Both lazy-loaded via `next/dynamic({ ssr: false })` from a Client Component boundary (per Next 16 lazy-loading rules, `ssr: false` is only legal in a Client Component).
- Style: `mapbox://styles/mapbox/light-v11` (default) / `dark-v11` (under `prefers-color-scheme: dark`). `light-v11` is cheaper to render than `streets-v12` and feels editorial.

### Tokens

Add to `.env`:

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...   # public, used in the browser
MAPBOX_SECRET_TOKEN=sk.eyJ...        # server-only, used by /api/geocode
```

If `NEXT_PUBLIC_MAPBOX_TOKEN` is missing, the map area renders a "Map unavailable" message instead of breaking the page.

### Layout

| Breakpoint | Layout |
|---|---|
| `< lg` (< 1024) | Stacked: filter → list → map (full-width, h-72) |
| `lg` (1024–1279) | 2 cols: filter (sticky) \| (list + map stacked) |
| `xl`+ (≥ 1280) | 3 cols: filter (sticky) \| list \| map (sticky, full-height-ish) |

### List ↔ pin sync

A `MapSyncProvider` Context at the `(app)` layout level holds a `selectedId`. `ResultCard` sets it on hover/focus; the matching `MapPin` re-renders larger + accent-colored. Click a pin → navigates to `/{city}/{category}/{slug}` (the Phase 6 business profile). Click anywhere else → deselects.

State stays in Context (not URL) to avoid a server re-render on every hover. A shareable `?focus=` URL param can be added later without changing this seam.

### bbox behavior

- On first load: `fitBounds` to all pins (or the city's `bbox` from `cities.bbox` if no results)
- On filter change: re-fit only if the current view contains zero of the new pins — preserves the user's pan/zoom when possible
- A `NavigationControl` (top-right) lets the user re-zoom; `prefers-reduced-motion` skips the flyTo animation

### Geocoding rate limit (10/min/IP)

`/api/geocode` enforces 10 requests / minute / IP. Over-limit returns `429` with `Retry-After`. The limiter is **in-memory per Vercel instance** (Vercel serverless = fresh memory per cold start). For a 50-business MVP this is fine; before public launch swap the in-memory `Map` in `lib/map/rate-limit.ts` for Upstash or Vercel KV.

### Bundle

mapbox-gl + react-map-gl ≈ 250 KB gzipped. Because they're inside `next/dynamic({ ssr: false })`, the home page and city home don't pay this cost — only the category browse page does.
