@AGENTS.md

# About this site

A first-person review site, currently deployed at **yashgoel.vercel.app** (the future custom domain is yashgoel.com, not yet pointed). Magazine-editorial aesthetic. Eight product categories, skincare, supplements, oral care, hair care (split into Treatment and Styling chapters), body care, essentials (cornerstone daily devices like the laptop, earbuds, primary charger), miscellaneous (random utility objects, accessories, gadgets), and fashion (clothes, judged on fit, fabric, care and how they age), plus /routine (with subroutine variants like /routine/morning/post-workout), /primers, /photos, a /now page, /subscribe for the email list, and a private /admin dashboard for adding content. The user (Yash on this site, Arnav at arnavgoel.dev) writes every review after using a product for at least a month.

The signature mark across the site is a small rose ❋ glyph; it appears in the header, every page masthead, hover states, and the footer. The accent color is rose only, everything else is stone-neutral. Don't introduce new accent colors.

# Working style

Don't ask for permission. When the user gives a directive, execute it
end-to-end and push. No "want me to start?", no confirmation rounds, no
"should I keep going?" trailers. The only acceptable interrupts are
genuine ambiguities the user could not have predicted, or destructive
operations covered by the "Ask before destructive Vercel/infra ops"
rule. Otherwise: ship, then report what shipped.

# Persist every user directive into this file

Anything the user says about how the site should look, behave, or be
maintained, every preference, every "remove this", every "always do X",
every "never do Y", every product fact (the user actually has the M4
MacBook, not the M2; verdict on Z is `recommend`; etc.), every taste
call (favourite colour, favourite chocolate, favourite playlist) gets
captured here in CLAUDE.md the same turn it is said. The user
explicitly does not want these decisions held only in conversation
state, where they evaporate the moment context compacts.

The right section is whichever one fits:

- **Surfaces the user has explicitly removed**, for "kill /X" or "I
  don't want a Y page".
- **Voice when writing reviews / Verdict words / One product, one card
  / Regional retailer handling**, for content rules.
- A new top-level section with a clear `# Heading` if nothing existing
  fits. Better one extra section than a buried bullet.

Update `~/.claude/projects/-Users-arnavgoel-Documents-skincare-supplement-reviews/memory/`
with a matching memory file at the same time so cross-conversation
recall does not depend on this single file. CLAUDE.md is the canonical
record; the memory directory is the index.

If a directive contradicts something already written here, edit the
existing section rather than appending a second one. The file should
read like a maintained rulebook, not a changelog of corrections.

# Glossary is canonical; primers cover combinations and depth

`/glossary` is the canonical, one-paragraph "what is X" source. Primers
do not redefine a term inline. A primer's job is *combinations*,
*dosing*, *how-to-read-the-label*, *trade-offs over time*, anything
that needs more than a paragraph. Single-ingredient primers
(`/primers/niacinamide`, `/primers/creatine`, etc.) auto-render a
"Quick definition" eyebrow that links to the matching glossary entry,
courtesy of `findGlossaryEntry()` in `lib/glossary.ts`.

When adding a new ingredient or term:

1. Add the canonical short definition to the glossary first.
2. If a deeper write-up is warranted, then add a primer. Make sure the
   primer's title or a `seeAlso` href in the glossary entry matches
   so the primer auto-links.
3. Do not duplicate the definition in product MDX, listing-card copy,
   or anywhere else. Link to `/glossary#<slug>` instead.

# Listening section is inline only

The "what is on repeat" feature lives as `<ListeningSection>` on the
homepage. It reads `content/_listening.json` written by the Vercel
cron at `/api/listening/refresh` (daily, `7 4 * * *` UTC). If the
snapshot is missing or empty, the section gracefully falls back to a
static `<SpotifyEmbed>` of the user's go-to playlist so the surface
never shows an empty state.

To wire the live cron in production, set in Vercel:

- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` from a Spotify
  developer app (https://developer.spotify.com/dashboard).
- `SPOTIFY_REFRESH_TOKEN` from a one-time Authorization Code flow
  with scopes `user-read-recently-played` and `user-top-read`.
- `CRON_SECRET` (any random string), Vercel sends it as
  `Authorization: Bearer <CRON_SECRET>` so unauthenticated traffic
  cannot hit the refresh endpoint.

Without those, the cron 503s, the snapshot stays whatever last
shipped in the repo (or empty), and the homepage falls back. Never
re-introduce a `/listening` route, an `/api/listening` UI surface,
or a "Listening" link in the header.

# `/library` and any data the user authors

`/library` reads from `content/_library.json` (user-owned, edited
either directly or through a future `/admin` form). Books and films are
the user's actual reading and watching, never seeded with AI guesses.
If the file is empty, the page renders an honest empty state, not
filler entries. Same principle applies to any other "what I am
currently doing" surface: real data, or no data, never invented data.

# `/best-of/<year>` releases on January 1 of the following year

A year-end issue ranking products has to wait for the year to actually
end. Until then, `/best-of/2026` (and any future year) is a
coming-soon page that explains why and points at `/subscribe`. Do not
auto-pick winners from the catalog mid-year, the previous AI-picked
listings were the exact mistake the user wants to avoid.

# Surfaces the user has explicitly removed (do not re-add)

The user has, over time, deleted entire surfaces because they read as
filler, AI-generated, or replicable boilerplate. Treat the absence of
these routes as a permanent decision, do not re-create them in any form
(no link in nav, no MDX, no replacement-with-different-name):

- **`/changelog`**, a site-wide "what's new" feed pulled from git log.
  The user does not want a public changelog page. Per-product
  `changelog[]` frontmatter (purchase history) stays. A site-level
  changelog page does not. Never re-add.
- **`/notes`**, short-form blog posts. Removed because they read as
  AI-generated filler. Long-form thinking belongs in `/primers`; product
  takes belong in reviews. Never re-add a third format.
- **`/uses`**, a uses.tech-style hardware/software list. Removed.
- **`/colophon`**, type-and-build meta page. Removed publicly to make
  the site's editorial choices less copy-pasteable. The original copy
  is preserved at `_local/colophon.md` (gitignored) for the user's
  reference. Never re-publish it as a route.
- **`/issue` (the Archive)**, monthly digest of every review/primer
  grouped by month. Removed; the catalog is browsable by category and
  search already, the archive added a layer no one used. Never re-add.
- **`/listening` as a standalone route**, the user does not want a
  separate page for Spotify data. The Spotify cron and snapshot are
  fine, but the surface lives **inline** on the homepage as
  `<ListeningSection>`, never as `/listening`. Do not re-add the
  standalone route.

If a future ask resembles one of these (a "what's new" page, a "tools I
use" list, a stack/typography breakdown), surface the prior decision in
your reply rather than silently building it.

# Voice when writing reviews

- First-person, present-tense for current habits, past for one-offs.
- No marketing language. No "game-changing," "must-have," "transformative." If a product is good, say *what specifically* it does and at *what dose / duration*.
- Always concrete: "Two pumps before bed for six weeks" beats "I love this."
- Always honest: cons must be real, not throwaway. If `repurchase: true` but you mention three serious cons, the review reads dishonest.
- The rules in `/about` are real. A review that sounds like a paid placement breaks the site's whole premise.
- Do not invent the user's experience. When the user says "add this product, I use it" without supplying details, write a plausible review and explicitly disclose in your reply that the specifics (dosing schedule, weeks-to-effect, repurchase decision) are inferred and need their confirmation.

# Verdict words: do NOT auto-assign recommend or okay

`verdict: recommend` and `verdict: okay` are user signals, not author inferences. **Never write them into a new review unless the user has explicitly told you to** (in this turn or a previous one), or unless the user has used qualitative language like "I love it," "it's great," "would buy again," "it's fine," "it's okay." Returns plus the user using "shitty" / "horrible" / "bad" still allow `verdict: bad` (per the existing rule that the no-verdict-from-return rule was explicitly removed).

If you are unsure, leave `verdict` unset so the listing renders as "Still testing" until the user gives a real signal. The same restraint applies to the `ratings.effect/value/tolerance` axes when you would only be guessing the numbers.

The user called this out after several rounds of me autonomously stamping new products as `recommend` based on my own read of the listing. Treat verdicts as the user's voice; treat the body copy as your draft.

# One product, one card

Never create two listings for what is fundamentally the same product. **Same brand + same active compound = one MDX file**, no matter how many flavors, sizes, or pack counts I have bought.

- **Flavor variants** (Cola vs Lemon, Cookies & Cream vs Vanilla) → one listing. Mention both in the body and add separate `changelog` entries with the purchase dates so the rotation is visible.
- **Size / count variants** (60 ct vs 90 ct vs 180 ct, 1 kg vs 2 kg) → one listing. Multiple `indiaLinks` / `westernLinks` entries with the retailer name disambiguating the size, e.g. `{ retailer: "Amazon (90 ct)", url: ... }`. The Nutricost magnesium glycinate review already does this; copy that pattern.
- **Different active stack from the same brand IS a different product** (Carbamide Forte "Calcium-Mag-Zinc + D3 K2" and Carbamide Forte "Calcium + D3 K2 + B12" share Ca/D3/K2 but the rest of the actives are not the same, so they get separate listings). When in doubt, ask before consolidating, splitting later is fine, merging later loses changelog history.

# Regional retailer handling

The site has buy links for three regions: India, USA, UK (`indiaLinks`, `westernLinks`, `ukLinks` in frontmatter, yes, the field is named `westernLinks` for legacy reasons; it means USA).

Some brands are **direct-to-consumer in one region only.** When a brand has no Amazon (or other retailer) presence in another region, mark this clearly:

- **India-only DTC brands** I've used: Naturaltein (`naturaltein.in`), Earthful (`earthful.me`), DistaUSA (`distausa.com`, actually Indian despite the name).
- **US-only brands**: Nutricost (Amazon US only, not on .in or .co.uk for most SKUs), Magtein L-Threonate (US only).
- **UK retailers worth checking**: Boots, LookFantastic, Cult Beauty, Space NK, Holland & Barrett. Often have brands that aren't on amazon.co.uk.

If you're adding a review for an India-only or USA-only brand, do not invent retailer URLs in other regions. Leave the array empty. The site auto-derives an `availabilityLabel()` from buy links and surfaces "Sold in India only" / "USA only" on the listing card *and* a yellow callout on the detail page so readers know up front.

The `lib/retailers.ts` file owns the host → retailer name + region map and the per-brand button color theme. Add new retailers there before you add their URLs to MDX.

## Comprehensive market support is mandatory

If you add support for a market, you support it **everywhere**. A market is not a checkbox you tick by adding a buy link, it is an audience that has to feel the site was built for them. That means, for every supported region (currently India / USA / UK):

- **Buy links** in the right region array (`indiaLinks` / `westernLinks` / `ukLinks`)
- **Local price** in `price.in` / `price.us` / `price.uk` with the correct currency symbol (₹ / $ / £)
- **Retailer name + theme** in `lib/retailers.ts` for any retailer you introduce
- **Region label + region detection** updated in `lib/retailers.ts` (INDIA_HOSTS / USA_HOSTS / UK_HOSTS, REGION_NAME, availabilityLabel)
- **Affiliate template** (`AMAZON_*_TAG`, region affiliate template envs) wired or explicitly noted as pending
- **Admin form** edit page exposes the new fields so the user can fill them in via `/admin`

Half-coverage is worse than no coverage. A page that shows a `£` price next to an Amazon-US-only buy button reads as broken. If the data for a region truly does not exist (the product is genuinely unavailable there), leave the field empty and the existing `availabilityLabel()` callouts surface "USA only" / "India only" honestly. Never paper over a missing region with USD as a stand-in.

The same rule applies to adding a *new* fourth market (Canada, EU, AUS): touch every layer above before shipping the first link.

# Adding a review (precedence order)

1. **Best**: user invokes the dashboard at `/admin` or `/admin/edit/{kind}/{slug}` and the form runs the `createReview` / `updateReview` server action which commits to GitHub.
2. **Acceptable**: write the MDX file directly to `content/{kind}/{slug}.mdx` matching the schema in `lib/schema.ts`. The schema is strict, bad data fails build.
3. Slug is derived from `slugify(brand + " " + name)`. The slug becomes the URL and the file path; treat it as immutable once published.

The only required frontmatter fields: `name`, `brand`, `category`, `rating`, `datePublished`. Everything else is optional. Don't pad with placeholders if you don't have real data.

## Always log the purchase date in `changelog`

Whenever the purchase date is known (Amazon order screenshot, Target receipt, in-store note, anything), record it as a `changelog` entry, e.g. `{ date: "2025-12-09", note: "Bought" }`. For consolidated listings with multiple flavors / sizes / re-buys, add one entry per purchase so the rotation history is visible.

- `datePublished` is when the *listing* went up; `changelog[].date` is when the *user actually bought* it. Don't conflate them.
- Use ISO `YYYY-MM-DD` when you have the day; `YYYY-MM` is acceptable when only the month is known.
- For a consolidated listing, append a new changelog entry on every re-buy rather than overwriting the existing one.

Why this matters: the changelog is the audit trail that proves the user has actually been on a product long enough to review it (per the "one month minimum" rule on `/about`). Skipping the date makes the listing read like a placeholder.

# Affiliate setup (current state)

- `AMAZON_IN_TAG=yash04e2-21` (signup pending Amazon's approval, this is the tag the user picked)
- `AMAZON_US_TAG`, `AMAZON_UK_TAG`: not yet applied for
- `INDIA_AFFILIATE_TEMPLATE`, `WESTERN_AFFILIATE_TEMPLATE`: aggregator templates (Cuelinks/EarnKaro etc.), not yet configured

The `lib/affiliate.ts` rewriter is already wired. Once env vars are set in Vercel, every Amazon link on the site auto-tags. Do **not** put affiliate tags in MDX directly.

# `/admin` is unprotected

There's a yellow warning banner on the page. The URL is private (excluded from sitemap and robots). Adding password auth was explicitly deferred by the user. Don't sneak it in unprompted; if asked, the design is `ADMIN_PASSWORD` env var + signed cookie middleware.

# Data model, invariants & tests (run these before every push)

This is a content-first site: the data IS the product, and almost every
"the site is breaking again" report traces back to content data drifting
out of its schema or a cross-reference going dangling. There is a fast
gate for exactly this, **use it.**

**`pnpm test` is the gate. Run it before every push and after any content
or `lib/` change.** It runs in seconds; `next build` takes minutes and a
bad deploy takes the site down, so catch it here.

The data layer, top to bottom:

- **Schema:** `lib/schema.ts`, Zod `reviewFrontmatter` + `primerFrontmatter`.
  Strict. Required review fields: `name`, `brand`, `category`, `rating`
  (→ `datePublished` too). Bad data fails parse, which fails the test
  and the build.
- **Loaders:** `lib/content.ts` reads `content/<kind>/*.mdx` (8 kinds:
  skincare, supplements, oral-care, hair-care, body-care, essentials,
  miscellaneous, fashion) and `content/primers/*.mdx`, validates, sorts,
  filters hidden/retired.
- **Author-owned JSON:** `content/photos.json`, `content/_library.json`,
  `content/_listening.json` (cron-written). Real data or honest empty
  state, never invented.
- **The gate test:** `tests/data-integrity.test.ts` validates **all
  eight kinds + primers** (the older `lib/content.test.ts` only smoke-
  tests three) and every cross-reference: slug uniqueness, `crossList`
  targets, primer `relatedProductSlugs`, `uvFilters` names, glossary↔
  primer `seeAlso` links, **buy-link retailer-host mapping**, per-region
  availability, ISO dates, and JSON shape. When it fails it names the
  file and field, fix that, don't go spelunking.

**Hard invariant, retailers before URLs:** every buy-link host must be
explicitly mapped in `lib/retailers.ts` (`RETAILER_BY_HOST` **and** the
matching region host list `INDIA_HOSTS`/`USA_HOSTS`/`UK_HOSTS`). Add the
retailer there *before* you put its URL in an MDX file. The test enforces
this via `isKnownRetailerHost()`. (This is what caught `a.co` rendering
as "A", `direct.playstation.com` as "Direct", and Apple/WHOOP/Nike/Anker
brand-direct links falling through with no region or affiliate coverage.)
When you add a brand-direct host that path-localizes per region
(`apple.com/in`, `whoop.com/uk`), file it under one region host list for
affiliate routing; per-region availability still comes from which
`*Links` array the URL sits in.

# Scalability posture (built for a spike)

`cacheComponents: true` (PPR) + no DB on the read path + no middleware on
public routes means public traffic is served from the CDN edge, not
origin compute. A viral spike is cache hits, not renders. **The gating
factor for a 1M/day spike is the Vercel plan, not the code**, be on Pro
(Hobby quotas throttle first), confirm photos serve from R2, keep the
write-endpoint rate limits wired. Don't add per-request work to a public
route (no `cookies()`/`headers()`/`auth()`/`fetch` without `use cache`
in `app/layout.tsx` or any public page), it silently forces dynamic
rendering and dismantles the static shell. See STATE.md for the verified
current architecture and a session quickstart.

# Paid and managed resources are production-only (cost optimization)

Cost optimization is a project objective: keep this site on free tiers and
off the $20 Vercel Pro plan. Two rules follow.

1. **Paid or quota-metered managed stores are wired to the Production
   environment ONLY.** Upstash Redis (rate limiting) and any future managed
   DB get their env vars (`KV_REST_API_URL` / `KV_REST_API_TOKEN`, etc.)
   scoped to **Production** in Vercel, never Preview or Development.
2. **Preview and dev use a free fallback, not the paid store.** The rate
   limiter (`lib/rate-limit.ts`) already falls back to a per-instance
   in-memory limiter when the Upstash env vars are absent, so prod-scoping
   those vars automatically gives preview/dev the free path with zero
   config. Detect true production with `process.env.VERCEL_ENV ===
   "production"` (NOT `NODE_ENV`, which is `"production"` on preview builds
   too).

When adding any new managed/paid service, follow the same shape: prod gets
the real resource, preview/dev get a free in-memory or local stub. A
throwaway preview deploy must never spend paid quota.

# Build / deploy notes

- Push to `main` triggers a Vercel rebuild (~30-60s).
- Local dev: `just dev` (Turbopack). The dashboard's GitHub commit flow needs `vercel env pull` (`just build-preview` does this in one shot) to get `GITHUB_TOKEN` etc. into the local environment.
- Don't write build/deploy meta on user-visible surfaces (the user explicitly removed all "Built quietly, shipped slowly"-style language). Internal commit messages can mention build/CI freely.

# Local toolchain (2026-05-16)

This project is canonically pnpm-based, `pnpm-lock.yaml` is the source of truth. If you ever see a `package-lock.json` appear, delete it; it's a local accident from a stray `npm install`.

- `justfile` at repo root holds the canonical dev recipes. Prefer `just dev`, `just build`, `just deploy`, etc. over typing the raw commands. `just` (no args) lists recipes.
- `mise.toml` pins Node 26 + pnpm latest. Run `mise install` once after cloning.
- `.envrc` auto-loads `.env.local` / `.env.development` via direnv. Run `direnv allow` once after editing it.

# Hardware the user actually owns (for review accuracy)

Never put a device in the user's hands that they do not own. When writing about something they shoot, type, or carry, cross-check against this list first; if a device is not on this list, ask before claiming they use it.

- **Phone**: iPhone 14 Pro Max. The user does **not** have any iPhone 13 series device. Any iPhone 13 / 13 Pro / 13 Pro Max / iPhone 12 / iPhone 13 photos on the One Touch drive are AirDrop / Messages imports from other people, not the user's own captures.
- **Cameras**: Canon EOS R7 (paired with RF-S 18-150mm F3.5-6.3 IS STM) and Canon EOS RP (paired with RF 24-105mm F4-7.1 IS STM). Older Canon EOS 7D appears in 3 archive frames but is not in active use. Full specs and usage stats live in `/Volumes/One Touch/DSLR/CAMERA_INFO.md`.

When adding a new device review (e.g. an essentials category laptop, earbuds, charger), update this section the same turn so future sessions trust the list.

# Source photo library lives on the One Touch external drive

All DSLR source frames live at `/Volumes/One Touch/DSLR/` (Seagate One Touch, mounts when plugged in). Filenames are camera-numbered (`C17A####`, `IMG_####`); same base name across formats means the same frame.

## Drive layout (as of 2026-05-13)

The DSLR folder is split by format so the Finder grid is readable, not three thumbnails per frame:

- **Root**: only `.jpg` / `.JPG` files (the visible-thumbnail layer). All currently-active archive candidates live here.
- **`_raws/`**: every `.CR3` raw file. Develop from here when re-export is needed.
- **`_masters/`**: every Lightroom-developed `.tif` keeper. These are the lossless edited masters; pair name-for-name with a JPG in the root.
- **`_dedup-trash_2026-05-12/`**: 287 byte-identical duplicates moved off-root.
- **`_gingko-on-water-variants_2026-05-13/`**: 56 sub-par gingko/asphalt cluster takes (drive subfolder = banished from cloud, see memory rule).
- Future `_*` subfolders follow the same convention: anything moved into one is downgraded out of the active candidate pool.

The CR3 ↔ JPG ↔ TIF triplet is preserved by shared base name. To find a CR3 from a JPG, swap the directory: `<base>.JPG` (root) → `_raws/<base>.CR3`.

Format priority when picking a source for upload (best to worst):

1. **TIF** in `_masters/`, the Lightroom-developed keepers (40 files). Always prefer when present.
2. **JPG** at root, full-quality camera or Lightroom exports (~373 files). Use as the fallback when no TIF exists for that frame.
3. **CR3** in `_raws/` (183 files). Archive only. Develop in Lightroom before uploading.
4. **PNG / JPEG / MOV**, case-by-case; typically not product shots.

If the drive is not mounted, fail loudly and tell the user. Do not silently substitute a lower-priority source from elsewhere (Photos library, Downloads).

**Never discard the TIF or CR3 originals from the One Touch.** They are the lossless masters. Lens-cap-on / fully-black test exposures are an explicit exception (user-approved hard delete only). For real photographs, generate web exports from `/tmp/` scratch and upload those derivatives; the masters stay.

## /photos surface, current architecture (2026-05-13)

- **Photo schema** in `lib/types.ts` carries `hero`, `featured`, `hidden`, `tier`, `rawSource` fields. Editorial keepers default tier; bulk archive imports get `tier: "archive"`.
- **`/photos` page** renders editorial keepers (~31) in chaptered magazine layout (cover spread → anchor → diptych / side-caption / offset rhythm → ❋ closer) and archive frames in a paginated contact-sheet grid below (60 visible, "load more" button to expand).
- **Navigation** stack: sticky `ChapterNav` chip-bar (active-on-scroll), `JumpToFrame` widget in masthead, click-to-lightbox with arrow-key prev/next + Escape, hover-preload + idle warm-up for cold-start speed.
- **Image delivery**: Next/Image proxies all Blob + GitHub Release sources, transcodes to AVIF/WebP, caches CDN-side. Lightbox uses `/_next/image?w=2400&q=88`; tiles q=70-90; archive grid q=70; chapter cover backgrounds q=65 w=1920 (8% opacity, doesn't need fidelity).
- **Preconnect** hints to `*.public.blob.vercel-storage.com` and `objects.githubusercontent.com` at the top of the page so first-paint isn't blocked on DNS+TLS.
- **`content/_rejected.md`** is the human-readable record of every `hidden:true` frame plus the rationale. Update it when you flip a `hidden` flag.

## Cloud storage (split-tier)

Vercel Blob Hobby plan caps at ~1 GB; we crossed that mid-session. Two-tier strategy:

1. **Vercel Blob** (`dslr/` for the 31 editorial keepers at q100+4:4:4; `dslr-archive/` for the ~217 archive frames at camera-JPG quality). Store: `yashgoel-products`. ~2.7 GB used.
2. **GitHub Release `dslr-archive-v1`** (overflow: ~159 archive frames at camera-JPG quality, hosted as release assets). No practical storage cap. URLs follow `https://github.com/ArnavGoel03/yashgoel/releases/download/dslr-archive-v1/<filename>`.

`next.config.ts` allowlists both Blob hosts and GitHub asset hosts in `images.remotePatterns`. Once a Vercel Pro upgrade is acquired (or the GH release approach is fine permanently), this split can collapse.

# Memory conventions for this project

The user keeps a memory file at `~/.claude/projects/-Users-arnavgoel-Documents-skincare-supplement-reviews/memory/`. Notable entries:
- `amazon-associates-ids.md`, tracking IDs per marketplace
- `MEMORY.md`, index of memory files
