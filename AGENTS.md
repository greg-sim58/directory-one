<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## What this repo is

Modern local-services directory MVP, single launch city (Austin, TX). Per `PHASES.md`, scaffolding + data layer + marketing + city home + search/filter are done; **map, reviews, auth/dashboard, polish, and launch prep are not yet implemented** (placeholders exist). Architectural truth lives in `PLAN.md` and `PHASES.md` — read those before designing changes. Stack: Next.js 16 (App Router) + React 19 + TS, Tailwind v4 + shadcn/ui (`base-nova` style, `components.json`), Drizzle + Neon serverless Postgres + PostGIS, Auth.js v5, Mapbox. Phase 4 search is in-process Drizzle queries on the same Postgres DB (no separate search service; single-file seam in `lib/search/queries.ts`).

## Non-obvious facts

- **`middleware.ts` is now `proxy.ts`** (Next 16 rename). The proxy runtime is Node — edge is not supported. See comment at the top of `proxy.ts`.
- **`images.domains` is deprecated**; use `remotePatterns` (see `next.config.ts`).
- **DB module is a lazy `Proxy`** (`lib/db/client.ts`). Module evaluation does not throw when `DATABASE_URL` is missing, so `next build` doesn't need the DB. Call sites still throw on first use. `force-dynamic` is already set on `app/page.tsx` for the same reason — replicate this on any new RSC route that reads from the DB.
- **Migrations are NOT run by drizzle-kit.** A custom `db/migrate.ts` (uses `pg` + a `_custom_migrations` table) is the only thing that applies SQL. Use `npm run db:generate` to emit SQL, then `npm run db:migrate` to apply. **Never use `db:push` against Neon** — it would skip the hand-written `0001_postgis.sql` (drizzle-kit does not emit `CREATE EXTENSION postgis`).
- **PostGIS is hand-wired.** A DB trigger in `0001_postgis.sql` keeps `geom` in sync with `lat`/`lon`. Geo queries use `ST_DWithin` on the `geom` column with a GIST index (see `getBusinessesWithinRadius` in `lib/db/queries/index.ts`).
- **Auth.js v5 has no Drizzle adapter yet** (deferred to Phase 8). `lib/auth/index.ts` is providers + a `/business/dashboard` gate only. The lazy `db` Proxy exists partly to avoid the adapter's module-time introspection crash.
- **RSC + per-request dedup pattern is established** in `lib/db/queries/index.ts`. New server query helpers should be `cache(async (...): Promise<T> => …)` from `react` and live in this file.
- **Pre-commit secret scanner** runs on every commit (husky → `node scripts/check-secrets.mjs`). It diffs staged content against known token/key regexes and **blocks the commit** on any hit. Be aware when staging generated files. The scanner also ignores `.agents/skills/vercel-react-best-practices/rules` and the script itself.
- **`opencode.json` is gitignored** because it carries a GitHub PAT. The committed `opencode.json.example` is the template — edit the local `opencode.json`, never commit the real token.
- **No tests are configured.** No Vitest, no Playwright, no `test` script in `package.json`. PHASES.md lists them as future stack, not current. Don't try to run a test that doesn't exist.
- **No CI** (no `.github/` directory). The only gating is the local pre-commit hook.
- **Path alias** is `@/*` → repo root (per `tsconfig.json`). Single package, not a monorepo. Lockfile is `package-lock.json`; `packageManager` is not pinned.

## Verification chain (run before finishing a change)

```bash
npm run format:check   # prettier (no --write)
npm run lint           # eslint (flat config in eslint.config.mjs)
npm run typecheck      # tsc --noEmit
```

`npm run build` is the integration check but requires a real `DATABASE_URL` (or it will still pass because of `force-dynamic`, but DB routes will surface real errors at runtime — set up `.env` first if you want full coverage).

There is no `npm test`.

## DB workflow cheat sheet

```bash
# one-time
cp .env.example .env   # then fill in real DATABASE_URL (Neon)
npm run db:migrate     # creates schema + PostGIS extension + trigger
npm run db:seed        # 1 city, 10 categories, 50 businesses, 10 users, 200 reviews
npm run db:check       # sanity: row counts + sample geom + nearby count via ST_DWithin

# iterative
npm run db:reset-schema   # nuclear: drop public schema + PostGIS; rerun migrate + seed
npm run db:reset          # truncate domain tables only; auth tables left intact
npm run db:generate       # emit SQL after editing lib/db/schema.ts
npm run db:studio         # drizzle-kit studio
```

`db:reset-schema` is destructive. The seed is idempotent (`onConflictDoNothing` on domain rows), so re-running it is safe.

## Structure (what's actually there)

```
app/
  page.tsx                          marketing home (force-dynamic, reads cities + categories)
  layout.tsx                        root layout, font hoisting, inline theme script
  global-error.tsx
  (app)/                            app chrome (Header, Footer, LocationProvider, SWRProvider)
    [city]/page.tsx                 city home
    [city]/[category]/page.tsx      Phase 4 done (Drizzle search + FilterPanel + results); map slot is a Phase 5 placeholder
    [city]/[category]/[slug]/       business profile stub
  business/dashboard/               auth-gated; only the /signin + /business/dashboard gate exists
  api/
    geocode/route.ts                real Mapbox forward + reverse, LRU-cached 10 min
    search/route.ts                 STUB
    reindex/, upload/               placeholders
proxy.ts                            geo header forwarding (renamed from middleware.ts)
lib/db/                             schema.ts, client.ts (lazy Proxy), queries/ (React.cache)
lib/auth/                           providers only; no Drizzle adapter yet
lib/cache/                          LRU helpers used by /api/geocode
components/ui/                      shadcn primitives (button, card, dialog, …)
db/migrations/                      0000 drizzle schema, 0001 hand-written PostGIS
db/{seed,migrate,check,reset,reset-schema}.ts
actions/index.ts                    STUB — server actions arrive Phase 7/8
scripts/check-secrets.mjs           pre-commit scanner
.agents/skills/                     nextjs-best-practices, vercel-react-best-practices, frontend-design, plan-reviewer, git-commit
```

## Conventions worth knowing

- **Server-first.** Add `'use client'` only for state, browser APIs, or event handlers. Map and gallery components are loaded via `next/dynamic({ ssr: false })`.
- **All API routes validate input with Zod** (`safeParse` → 400 with `error.flatten()`).
- **Server actions go in `actions/`**, not co-located. The file is currently empty.
- **shadcn/ui style is `base-nova`**, lucide icons, `cn()` helper in `lib/utils.ts`. Add new primitives with `npx shadcn@latest add <name>`.
- **Tailwind v4**, no `tailwind.config.*` — config is CSS-based (`app/globals.css`). Plugin is `prettier-plugin-tailwindcss` (already wired in `.prettierrc.json`).
- **Prettier**: 2-space, single quotes, trailing commas, `printWidth: 100`. Run `npm run format` to fix.

## Reference docs already in the repo (read these, don't re-derive)

- `PLAN.md` — architecture, URL strategy, schema, caching layers, risk mitigations.
- `PHASES.md` — current progress and what's pending. **Check here first** before assuming a feature exists.
- `node_modules/next/dist/docs/index.md` — has explicit `AI agent hint` notes; always consult the relevant guide under `node_modules/next/dist/docs/01-app/` before writing Next code.
- `.agents/skills/nextjs-best-practices/SKILL.md`, `.agents/skills/vercel-react-best-practices/AGENTS.md`, `.agents/skills/frontend-design/SKILL.md` — performance, React patterns, design direction. These are already loaded by OpenCode; don't duplicate their rules here.
- `CLAUDE.md` is `@AGENTS.md` — edits here propagate.

## Pitfalls (things you will get wrong the first time)

- Putting the `proxy.ts` function name as `middleware` — Next 16 looks for `proxy`.
- Using `images.domains` — deprecated; `remotePatterns` only.
- Adding a Drizzle migration via `db:push` instead of `db:generate` + `db:migrate` — PostGIS will not be installed.
- Importing `db` at module top level in a route that runs at build time — the lazy proxy handles this for `db`, but raw SQL via `pg` (as `db/migrate.ts` does) needs a real `DATABASE_URL`.
- Forgetting `export const dynamic = 'force-dynamic'` on a new RSC route that reads the DB — the build will try to prerender and the lazy proxy won't help because `dynamicParams`/static analysis still fires.
- Staging a real token/key in a new file — the pre-commit scanner will block the commit. Add secrets to `.env` (gitignored) or env vars only.
- Treating `(app)/[city]/[category]/page.tsx` as a working page — it is a Phase 4 stub.
- Editing `opencode.json` to add a token and committing it — it's gitignored for a reason; use the local file only.
