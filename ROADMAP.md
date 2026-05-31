# Roadmap

Running list of deferred work. Ordered loosely by priority.

## Shipped 2026-05-31

- **`/today` daily habit tracker (PWA).** Offline-first, localStorage-only
  tracker wired into `/routine`. Windows mirror the site's routine
  vocabulary (morning / evening / shower / oral / anytime). Has streaks, a
  3-month GitHub-style heatmap, weekly completion %, a full manage panel
  (add / rename / delete / reorder / per-weekday / emoji), and JSON backup
  export/import. Installable: manifest shortcut + SW (`yashgoel-shell-v4`)
  precaches `/today`. Default seed: brush AM/PM, floss, skincare AM/PM,
  sunscreen, supplements, shower. Version-stamped (`TODAY_VERSION` 1.0.0,
  data schema v1) on the page and in every backup.
  - Follow-up: optional cross-device cloud sync (today it is per-device;
    backup export/import is the portability story).

## Security / red-team pass

A second hard red-team pass landed 2026-05-31 (parallel-agent audit of
auth, write endpoints, image optimizer, CSP, feed/llms, MDX, secrets).
Most of the prior "still open" list is now closed in the working tree.

Done (earlier):

- ~~**Server action auth.**~~ `requireAdmin()` guard on every action in
  `app/admin/actions.ts`, cross-checks the Auth.js session against
  `ALLOWED_ADMIN_EMAIL` (case-insensitive).
- ~~**Upload content-type whitelist.**~~ `uploadProductImage` and
  `createPhoto` reject anything other than jpeg/png/webp/avif/gif, cap at
  8 MiB. SVG explicitly excluded.
- ~~**Content Security Policy.**~~ Site-wide CSP in `next.config.ts`, plus
  HSTS (2 years, preload).
- ~~**Admin is gated.**~~ `proxy.ts` gates `/admin/*` with a device-bound
  HMAC cookie (404 to scanners) + Auth.js session + allow-list. (Note:
  the CLAUDE.md "`/admin` is unprotected" line is stale, fix it.)

Done (2026-05-31 red-team pass, in working tree):

- ~~**Rate limiting.**~~ `createLimiter` (Upstash-backed) now gates
  subscribe, inbox, subscribe/confirm, and admin/setup-device. It degrades
  to a per-instance in-memory throttle on Upstash error (was failing fully
  open) and warns loudly in prod when Upstash is missing.
- ~~**javascript:/data: URL backstop.**~~ `lib/safe-url.ts` sanitizes every
  content-derived href/src: buy links (`review-meta`), MDX `a`/`img`, and
  the stack/routine-builder share-link payloads. Enforced at the schema +
  admin write path too. (CSP keeps `'unsafe-inline'`, so it is not a
  backstop; this is.)
- ~~**Build-amplification DoS.**~~ `vercel.json` `ignoreCommand` stops the
  unauthenticated subscribe/inbox commits to `content/_*.json` from
  triggering production rebuilds (was a free-tier deploy-quota kill).
- ~~**GitHub-token exhaustion.**~~ subscribe/confirm is throttled before its
  GitHub read; `commitRepoFile` retries on 409/422 so concurrent writers no
  longer silently drop a write.
- ~~**Feed/llms robustness.**~~ `feed.xml` strips XML-illegal control chars;
  `llms.txt` escapes markdown; one malformed MDX file now log-and-skips in
  `lib/content.ts` instead of failing the whole deploy.
- ~~**PII.**~~ inbox no longer commits visitor IP/UA to git history.
- ~~**CSP tightened.**~~ dropped `'unsafe-eval'`; narrowed `connect-src` from
  wildcard `https:` to the actual analytics + weather host allow-list.
- ~~**Image optimizer locked down.**~~ `remotePatterns` pinned to our exact
  R2 bucket and Blob store (was wildcard `*.r2.dev` / `*.public.blob...`,
  an open laundering / transform-quota sink).
- ~~**Env-var exposure review.**~~ Audited: only `NEXT_PUBLIC_SITE_URL` and
  `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` are public; no secret leaks.

Still open:

- **Provision Upstash Redis (prod). TOP ITEM.** Confirmed NOT set in Vercel
  prod env on 2026-05-31, so the rate limits above run on the weak
  in-memory fallback. Provision from Vercel Marketplace (free tier), which
  auto-injects `KV_REST_API_URL` / `KV_REST_API_TOKEN`, then redeploy.
- **Dependency audit.** `next-auth@beta` is still pre-release. Pin an exact
  version and track for the stable release.
- **Stale `ADMIN_PASSWORD` env var.** Delete from Vercel if present; the
  device-cookie + OAuth gate replaced it.
- **OAuth consent status.** Decide publish vs testing mode.
- **Secrets hygiene.** Historical scan (`git log -p | grep AUTH_`) to
  confirm no past leak.

## Affiliate program applications

- Apply for Amazon US Associates (`AMAZON_US_TAG`).
- Apply for Amazon UK Associates (`AMAZON_UK_TAG`).
- Configure `INDIA_AFFILIATE_TEMPLATE`, `WESTERN_AFFILIATE_TEMPLATE`
  (Cuelinks / EarnKaro aggregators) once selected.

## Content

- Take real product photos for each review (placeholder watermark falls back
  today). Upload via `/admin`, which now writes to Vercel Blob (connected
  2026-04-24).
- Migrate any hot-linked product imagery (Amazon, retailer URLs) into Blob
  for reliability, privacy, and eventually a stricter CSP img-src directive.

## Infrastructure

- Buy `yashgoel.com` or `yashgoel.bio` and point the Vercel domain.
- Upgrade Vercel CLI locally (`npm i -g vercel@latest`).
- Decide on Australia / Canada regional link support (would introduce a
  `regionalLinks` map on the schema instead of the current three fixed
  arrays).

## Product ideas (nice-to-haves)

- Per-review TOC (like primers already have) for long bodies.
- Drop `'unsafe-inline'` from script-src (the last CSP weakness;
  `'unsafe-eval'` is already gone). Blocked by cacheComponents: a
  per-request nonce can't ride the prerendered shell, so this needs a
  hash-based or `strict-dynamic` approach. `lib/theme-script.ts` already
  exports the theme script's sha256 for exactly this.
- A "Last updated" ribbon on review detail pages when `lastUpdated`
  postdates `datePublished` meaningfully.
- Search URL state sync, so `/search?q=creatine` deep-links into results.
