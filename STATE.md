# Yashgoel · State

Personal website at https://yashgoel.vercel.app — Next.js 16 App Router on Vercel.

---

## ⚡ Quickstart — read this first, skip the run-through

A new session can get productive in ~60 seconds without re-deriving the
architecture:

1. **Run the gate:** `pnpm test`. It validates every content file +
   cross-reference against the schema in seconds. If it's green, the
   data layer is healthy; if it's red, the failure message names the
   exact file/field — fix that, don't go spelunking.
2. **Content is the product.** Reviews/primers are strict-schema MDX in
   `content/<kind>/*.mdx` and `content/primers/*.mdx`. Bad frontmatter
   fails the test (and the build). See "Data model" below.
3. **Public pages are static (PPR).** `cacheComponents: true`. No DB on
   the read path, no middleware on public routes. The site is
   CDN-fronted and spike-tolerant — see "Scalability" below.
4. **Don't trust old session notes over the code.** This file's history
   section is a log, not current truth. The "Current architecture"
   block below is verified against the tree as of 2026-05-30.

## Current architecture (verified 2026-05-30)

- **Rendering:** Next 16 App Router, `cacheComponents: true` (PPR). No
  `force-dynamic` on any public route; `app/layout.tsx` reads no dynamic
  APIs (no `cookies()`/`headers()`/`auth()`), so the shell prerenders.
  Content is read from the filesystem at build/prerender time and frozen
  into the static output — runtime never touches `fs` or a DB on a
  public GET.
- **CSP:** single **static** CSP header in `next.config.ts` (the
  per-request-nonce experiment is fully gone — it was incompatible with
  cacheComponents prerender). All security headers are static there too.
- **Admin auth is real:** `proxy.ts` (Edge middleware, `/admin/:path*`
  matcher only) gates `/admin` with a device-bound HMAC cookie
  (`lib/device-lock.ts`) **and** an Auth.js session
  (`ALLOWED_ADMIN_EMAIL` allow-list). Invalid device cookie → 404 so the
  surface is invisible to scanners. Public routes get zero middleware.
- **Data:** content MDX → Zod schema (`lib/schema.ts`) → loaders
  (`lib/content.ts`). Author-owned JSON: `content/photos.json`,
  `content/_library.json`, `content/_listening.json` (cron-written).
- **Images:** Next/Image with a locked remote allowlist (Vercel Blob,
  Cloudflare R2 `*.r2.dev`, and our own GitHub Release path only — the
  pathname restriction stops the optimizer being abused as an open
  image proxy). Photos have migrated to R2.
- **Writes/cron:** `/api/subscribe` + `/api/inbox` are POST endpoints
  with Upstash rate-limiting (`lib/rate-limit.ts`, in-memory fallback).
  Crons: `/api/cron/blob-cleanup` (daily 3am), `/api/listening/refresh`
  (daily 4:07am). Cron endpoints gated by `CRON_SECRET`.

## Testing & data integrity (the anti-breakage gate)

`pnpm test` (Vitest) is the fast gate that catches the "stuff breaking
again and again" class of bugs **before** a slow `next build` or a bad
deploy. Run it before every push.

- `tests/data-integrity.test.ts` — the whole-catalog gate. It
  schema-validates **all seven** review kinds + primers (not just the
  three `content.test.ts` smoke-tests), and checks every
  cross-reference: slug uniqueness, `crossList` targets, primer
  `relatedProductSlugs`, `uvFilters` names, glossary↔primer links,
  buy-link retailer-host mapping, per-region availability, ISO date
  formats, and that `photos.json` / `_library.json` parse to shape. A
  failure names the exact file + field.
- `lib/content.test.ts`, `lib/retailers.test.ts`, `lib/affiliate.test.ts`
  — unit/smoke tests for the loaders and link logic.

**Invariant the test enforces (and the rule behind it):** every buy-link
host must be explicitly mapped in `lib/retailers.ts` (`RETAILER_BY_HOST`
+ a region host list). Add the retailer there **before** putting its URL
in an MDX file, or the test fails. This stopped `a.co` rendering as "A",
`direct.playstation.com` as "Direct", and Apple/WHOOP/Nike/Anker links
falling through with no region or affiliate coverage.

## Scalability posture (1k/day baseline → 1M spike-ready)

The architecture absorbs a viral spike because public traffic never
reaches origin compute:

- Public pages are **static/PPR**, served from Vercel's CDN edge. A
  spike is CDN cache hits, not origin renders. No database on the read
  path; content is frozen at build time.
- Zero middleware on public routes (only `/admin`), so no per-request
  Edge compute tax on visitors.
- Image transforms are CDN-cached after first hit; the optimizer
  allowlist is pathname-locked.
- The only stateful calls (Upstash) are on the two POST write endpoints,
  not reads.

**The gating factor is the Vercel plan, not the code.** Before any
campaign that could push toward 1M/day: be on **Pro** (Hobby's
bandwidth + image-optimization + function quotas would throttle first),
confirm all photos serve from **R2** (Blob Hobby ~1GB cap is already
exceeded — see CLAUDE.md split-tier notes), and keep the write-endpoint
rate limits wired (Upstash env vars set in prod). 1000/day is trivially
within even Hobby limits.

## Where we are

Single-author portfolio and review site. Ship fast, no feature flags, iterate by feel.

## Done in session 2026-04-27 (overnight)

### Tab-switching speed

- Loading.tsx + hover-prefetch wiring: tabs load routes in the background before user taps
- Speculation Rules RouteWarmer: sends hints to the browser for probabilistic prefetch
- PPR / cacheComponents tried but reverted because of 22 conflicting per-route segment configs (mostly OG image runtime declarations); documented for future migration

### Pampered pass (10 items)

- Cursor halo with trailing blur
- Audio cues + footer toggle (no sound by default, user can enable in settings)
- Font preload + swap strategy for web typography
- Smooth scroll enabled globally + slim custom scrollbar
- Time-of-day greeting in masthead (morning/afternoon/evening)
- Reading progress bar on long pages
- Optimistic click feedback (instant visual response)
- Image LQIP blur placeholders on photo galleries
- Empty-state poetry on 8 screens
- Streak-free audit found nothing to change

### Naming consistency

- GitHub repo `arnavgoel` renamed to `yashgoel`
- Local folder + `package.json` `name` field aligned
- Vercel project was already `yashgoel`

### Bun → pnpm

- `bun.lock` dropped, `pnpm-lock.yaml` adopted
- `.npmrc` configured with `shamefully-hoist=true` and `auto-install-peers=true`

### Home page rule

- "On the shelf right now" preview only shows reviews with at least one photo
- Implementation: filter on `collectCardPhotos(r).length > 0` in `app/page.tsx`

## Session 2026-05-18 — Production outage + rollback

### Outage cause
Commits `169334b` (CSP nonce middleware + Upstash rate limit) and `cffca3e`
(theme-init CSP hash) introduced a per-request nonce CSP via `proxy.ts`.
Two compounded bugs:
1. `proxy.ts` referenced `themeInitScriptCspSource` without importing it →
   `ReferenceError` on every request → blank page on the deployed build.
2. Even after wiring the import, per-request CSP nonces are fundamentally
   incompatible with Next 16 `cacheComponents` prerender: the framework
   streams inline scripts from the cached shell that can't carry a
   per-request nonce, so the browser blocked the Next bootstrap and the
   page hung forever on the `app/loading.tsx` skeleton.

### Shipped this session
- **`c583f3c` (pushed to origin/main)** — Added missing import of
  `themeInitScriptCspSource`; switched the hash to a precomputed literal
  in `lib/theme-script.ts` (Edge middleware can't pull `node:crypto`);
  removed `headers()` from `app/layout.tsx` so the shell prerenders;
  consolidated `themeInitScript` to `lib/theme-script.ts`.

### In progress (local edits, NOT yet committed/pushed)
> **RESOLVED — shipped since.** As of 2026-05-30 all of the below is live
> in `next.config.ts` / `proxy.ts` (static CSP, `/admin`-only matcher,
> trimmed RouteWarmer) and `cacheComponents` is back ON. See the
> "Current architecture" block at the top for verified current state.

- `proxy.ts` reduced to `/admin/:path*` matcher only — no middleware on
  public routes, no JWT decode on the home page.
- `next.config.ts` ships a single **static CSP** header (`'unsafe-inline'`
  + `'unsafe-eval'` + host allowlist for Vercel Analytics, SpeedInsights,
  Google Analytics). Per-request nonce path is fully gone.
- `components/route-warmer.tsx` trimmed: 16-route prefetch + Speculation
  Rules inline script removed; now `router.prefetch()` on 6 top routes
  with 80ms stagger.

### What's left next session
- Commit + push the in-progress edits above (the user interrupted before
  the commit landed; check `git status` first to confirm).
- Drop `lib/theme-script.ts` `themeInitScriptCspSource` export (unused
  after the rollback) or leave dead.
- Performance pass on heavy root-layout client components: `CursorHalo`
  (continuous RAF), `RouteWarmer`, `Analytics`/`SpeedInsights`/`GA`
  (dynamic-import + idle).
- Aggressive red-team for remaining flaws (parallel agent fanout was
  requested but not run).

## What's left

- Real product photography for reviews currently watermark-only (so they re-appear in the home shelf preview)
- Future: revisit Next 16 cacheComponents migration once 22 per-route segment configs (mostly OG image runtime declarations) are reworked. Worth ~30% additional speed gain. Not urgent.
- Audio cue audio assets are synthesized (Web Audio API), no work needed there.

## Key file pointers

- `components/route-warmer.tsx` — bulk prefetch + Speculation Rules
- `components/cursor-halo.tsx`, `components/audio-cues.tsx`, `components/reading-progress.tsx`, `components/time-greeting.tsx`, `components/nav-link.tsx`, `lib/haptic-click.ts`
- `app/loading.tsx` + 12 per-route `loading.tsx` files
