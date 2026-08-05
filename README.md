# yashgoel.com

A first-person review site for the skincare, supplements, and oral-care products I actually use. Slow internet. No sponsorships.

The site is editorial content (MDX files committed to git) plus a small dashboard that lets me add or edit reviews and upload photos from any browser.

---

## What's on it

| Route | What it is |
|---|---|
| `/` | Landing page, bio, "just added" reviews, sections, listening, recent notes |
| `/about` | Longer intro, "rules I write by," and a link to my professional site |
| `/now` | What I'm reading / taking / thinking about this month ([/now movement](https://nownownow.com/about)) |
| `/notes` | Long-form writing, one MDX file per note |
| `/photos` | DSLR gallery, entries in `content/photos.json`, originals on Vercel Blob |
| `/skincare` | Product reviews, one MDX file per product, country availability filter |
| `/supplements` | Same as skincare |
| `/oral-care` | Same as skincare |
| `/fashion` | Clothes, same review shape plus a structured `garment` record (fit, blend, care, wear) |
| `/links` | All my socials in one place |
| `/admin` | Private dashboard for adding/editing content (not auth-protected yet, see "Auth" below) |

---

## Stack

- **Next.js 16** (App Router, RSC, Server Actions)
- **Tailwind CSS 4** + a few [base-ui/react](https://base-ui.com) primitives
- **MDX** for prose content via `next-mdx-remote`, validated by Zod (`lib/schema.ts`)
- **Vercel** for hosting (Fluid Compute), **Vercel Blob** for product/photo originals
- **GitHub REST API** for committing new content from the deployed dashboard
- **Inter** (sans) + **Instrument Serif** (serif) + **Fraunces** (display) + **JetBrains Mono** (mono)

---

## Adding a review

### From the dashboard (recommended)

1. Visit `/admin` on the live site (or `localhost:3000/admin`)
2. **Add product** tab → fill in brand, name, category, rating
3. (Optional) Drop a product photo into the upload zone, uploaded to Vercel Blob at original quality
4. (Optional) Add buy links: bought-from URL up top, plus India / USA / UK retailer URLs (one per line)
5. (Optional) Pros, cons, ingredients, summary, full markdown body
6. Save → server action commits the MDX file to GitHub via the REST API → Vercel rebuilds → live in ~30-60s

To **edit** an existing review: same dashboard, **Edit existing** tab, click the review, change fields, save.

### By hand (for bulk imports or offline edits)

Drop an `.mdx` file in the right folder:

- `content/skincare/` for skincare
- `content/supplements/` for supplements
- `content/oral-care/` for oral-care

Frontmatter schema (every field except `name`, `brand`, `category`, `rating`, `datePublished` is optional):

```mdx
---
name: Radiance Cleansing Balm
brand: Beauty of Joseon
category: cleanser
rating: 9.0
price: $20
skinType: [all, dry, normal, combination]    # skincare only
goal: [sleep, recovery]                       # supplements / oral-care
photo: /photos/some-shot.jpg                  # or a Blob URL
boughtFromUrl: "https://www.nykaa.com/..."    # where I personally bought it
indiaLinks:
  - { retailer: "Amazon India", url: "https://www.amazon.in/dp/B09ZV8N75K" }
  - { retailer: "Nykaa", url: "https://www.nykaa.com/..." }
westernLinks:
  - { retailer: "Amazon", url: "https://www.amazon.com/dp/B0B3R661JP" }
ukLinks:
  - { retailer: "Amazon UK", url: "https://www.amazon.co.uk/dp/..." }
ingredients: [Rice Bran Oil, Ginseng Extract]
pros:
  - Melts sunscreen and makeup off in seconds
  - Rinses clean
cons:
  - Jar packaging
repurchase: true
datePublished: "2026-04-23"
summary: One-sentence verdict shown on the listing card.
---

## Why I bought it

Markdown body…
```

Frontmatter is validated by Zod at request time, bad data fails the page render with a clear error.

### Fashion entries (`content/fashion/`)

A garment is the same review shape as everything else, plus one extra
frontmatter object. Clothes have properties a bottle does not: a shape, a
material, a maintenance contract and a life. Those are stored as data so the
detail page can draw them (fit silhouette, blend bar, care symbols, wear
track) instead of describing them in prose.

```mdx
garment:
  fit: tailored            # slim | tailored | regular | relaxed | oversized
  size: "M"                # as labelled; sizes are not universal
  sizeNote: "Runs a half size small in the shoulder."   # optional
  fabric:                  # every fibre off the label, must total 100
    - { material: "Cotton", percent: 98 }
    - { material: "Elastane", percent: 2 }
  care:                    # ISO 3758 / GINETEX codes, drawn as symbols
    - machine-wash-cold
    - do-not-bleach
    - line-dry
  season: [summer, monsoon]        # summer | monsoon | winter | year-round
  firstWorn: "2026-03"             # YYYY-MM or YYYY-MM-DD
  wearsPerMonth: 8                 # honest estimate; gates cost per wear
  condition: broken-in             # as-new | broken-in | worn-in | fading | failing
  aging:
    - { date: "2026-05", note: "First honeycombs behind the knee." }
```

The vocabulary (fits, seasons, care codes, conditions and their labels) lives
once in `lib/garment-types.ts` and is imported by the Zod schema, the admin
form, the renderers and the tests, so none of them can drift apart. It is a
module of its own, not a section of `lib/types.ts`, so the section stays
liftable (see "Spinning `/fashion` out" below).

Months owned, estimated wears and cost per wear are **derived** at build time
in `lib/garment.ts`, never stored, so they cannot go stale. Cost per wear only
renders when both a price and `wearsPerMonth` exist.

### Drafts

Any review with `hidden: true` is excluded from every listing, the feed and
the sitemap, stays reachable at its own URL, is marked `noindex`, and renders
a "Draft, not published" banner at the top of the page. Use it for anything
whose details are not yet confirmed from the product in hand. The three
`content/fashion/draft-*.mdx` files are structural templates, not reviews.

### Notes (essays)

Drop an `.mdx` file in `content/notes/` with frontmatter `{ title, description, datePublished, tags }`. No body schema; write what you want.

### Photos

Use the dashboard's **Add photo** tab. Drop the file in, fill caption / alt / location / date, original is uploaded to Vercel Blob (no recompression) and an entry is appended to `content/photos.json`.

---

## Spinning `/fashion` out into its own site

Not planned, not scheduled, and deliberately not done. Fashion lives here
because it is the same first-person register and the same reader. But clothes
are the one category that could plausibly outgrow a personal review site, so
the section is built as a vertical slice that can be lifted out whole. This is
the plan for that day, written now while the seams are still fresh.

### Why it is liftable (already true, no future work required)

1. **Every fashion-specific file is named `fashion` or `garment`.** There is no
   garment logic hiding in a shared component. `grep -ril garment` returns the
   manifest below plus exactly three shared files.
2. **The dependency runs one way.** The fashion slice imports the shared site
   (layout, cards, price, retailers, content loader). The shared site imports
   from the slice only the `Garment` type on `Review.garment` and the four
   `GARMENT_*` enums used by the zod object in `lib/schema.ts`.
3. **Everything else derives from `KINDS`.** Nav, homepage tiles, sitemap,
   `llms.txt`, search, the feed, the admin section list and the drift test all
   read that tuple, so removing the section from this site is one edit, not a
   sweep.
4. **Content is portable.** MDX plus frontmatter on disk, no database, images
   referenced by URL. `content/fashion/` moves by `git mv`.

### The manifest (what moves)

```
app/fashion/page.tsx                    listing
app/fashion/[slug]/page.tsx             detail
app/fashion/[slug]/opengraph-image.tsx  OG card
components/garment-icons.tsx            fit silhouettes + ISO 3758 care glyphs
components/garment-panel.tsx            shape, blend, wearable window, care
components/garment-longevity.tsx        months owned, wears, cost per wear
components/garment-method.tsx           the symbol legend / how it is judged
lib/garment-types.ts                    the entire vocabulary
lib/garment.ts                          derived figures (nothing stored)
tests/garment.test.ts                   unit tests for the derivations
content/fashion/*.mdx                   the entries
```

### The couplings (the only things the new site must supply)

| Imported from | Used for | Replace with |
|---|---|---|
| `lib/site.ts` | name, canonical URL, OG identity | new site's own identity module |
| `lib/content.ts` | MDX read + zod validate + sort | copy; drop the `kind` argument, one folder |
| `lib/schema.ts` | frontmatter validation | copy; keep only the fields clothes use |
| `lib/types.ts` | `Review`, `RegionalPrice` | copy those two; `Kind` becomes unnecessary |
| `lib/price.ts`, `lib/retailers.ts`, `lib/affiliate.ts` | multi-region prices and buy links | copy as is, they are category-agnostic |
| `components/container.tsx`, section masthead, `product-card.tsx` | page grammar | copy or redesign; this is where a standalone site should actually diverge |
| `app/globals.css` | theme tokens, rose accent, fonts | copy; a separate brand would pick its own |

### The removal path on this site (one edit plus two deletes)

1. Delete `"fashion"` from `KINDS` in `lib/types.ts` and its entry in
   `KIND_LABEL`. Nav, homepage, sitemap, `llms.txt`, feed, search and admin all
   follow automatically.
2. Delete `app/fashion/` and `content/fashion/`.
3. Delete the `garment` object from `reviewFrontmatter` in `lib/schema.ts` and
   the `garment?: Garment` field plus the `garment-types` import from
   `lib/types.ts`.
4. Delete the `garment*` form fields from `app/admin/product-form.tsx` and the
   matching parse block in `app/admin/actions.ts`.
5. Delete `lib/garment*.ts`, `components/garment-*.tsx`, `tests/garment.test.ts`.
6. Add a permanent redirect from `/fashion/:slug*` to the new host so existing
   links and search results survive the move.
7. `pnpm test` is the check. The drift guard in `tests/data-integrity.test.ts`
   fails if a kind is left half-removed.

### What would justify doing it

A separate site is worth the split only when at least one is true: fashion
entries outnumber everything else combined, the audience for clothes stops
overlapping the audience for sunscreen, or the section needs something this
site refuses to carry (sizing databases, a shop, user submissions). Until then
the split costs a second deploy, a second brand and a duplicated content
pipeline while buying nothing.

---

## Buy links and affiliates

Each review has up to four URL fields:

- `boughtFromUrl`, single, prominent "Bought from" button (the truthful one)
- `indiaLinks[]`, Amazon India, Nykaa, Myntra, Flipkart, Naturaltein, Earthful, etc.
- `westernLinks[]`, Amazon US, Target, Walmart, Sephora, Ulta
- `ukLinks[]`, Amazon UK, Boots, LookFantastic, Cult Beauty, Space NK, Holland & Barrett

Each link's button label is auto-derived from the URL host (`amazon.in` → "Amazon India", `nykaa.com` → "Nykaa", etc.) via `lib/retailers.ts`. Buttons get a brand-specific color theme (Amazon amber, Nykaa pink, Target red, etc.).

The `/skincare`, `/supplements`, and `/oral-care` listing pages show an **"Available in: India / USA / UK"** filter that counts and filters reviews by which regions have at least one buy link.

### Affiliate rewriting

`lib/affiliate.ts` rewrites raw URLs into affiliate URLs at render time, based on env vars:

- `AMAZON_US_TAG` → appends `?tag={tag}` to amazon.com URLs
- `AMAZON_IN_TAG` → appends `?tag={tag}` to amazon.in URLs
- `AMAZON_UK_TAG` → appends `?tag={tag}` to amazon.co.uk URLs (when added)
- `INDIA_AFFILIATE_TEMPLATE` → wraps non-Amazon Indian retailer URLs (Nykaa, Myntra, etc.) through Cuelinks/EarnKaro using `{url}` as the placeholder
- `WESTERN_AFFILIATE_TEMPLATE` → same for non-Amazon Western retailers (Sephora, Target, etc.) via Skimlinks/Impact

If an env var is unset, the rewriter passes the URL through unchanged. Affiliate links carry `rel="sponsored nofollow"` per Google guidelines and show a small "affiliate" hint next to the button label.

The footer carries a permanent FTC-style disclosure.

---

## Environment variables

| Var | Required for | What it does |
|---|---|---|
| `GITHUB_TOKEN` | Dashboard writes | Fine-grained PAT with Contents: Read & Write on this repo |
| `GITHUB_OWNER` | Dashboard writes | GitHub username (e.g. `ArnavGoel03`) |
| `GITHUB_REPO` | Dashboard writes | Repo name (e.g. `arnavgoel`) |
| `GITHUB_BRANCH` | Optional | Defaults to `main` |
| `BLOB_READ_WRITE_TOKEN` | Photo uploads | Auto-set when you attach a Vercel Blob store to the project |
| `AMAZON_US_TAG` | Affiliate revenue | Your amazon.com Associates ID (e.g. `arnav-20`) |
| `AMAZON_IN_TAG` | Affiliate revenue | Your amazon.in Associates ID (e.g. `yash04e2-21`) |
| `AMAZON_UK_TAG` | Affiliate revenue | Your amazon.co.uk Associates ID (when applied for) |
| `INDIA_AFFILIATE_TEMPLATE` | Affiliate revenue | Cuelinks/EarnKaro template, e.g. `https://linksredirect.com/?pub_id=XXX&source=linkkit&url={url}` |
| `WESTERN_AFFILIATE_TEMPLATE` | Affiliate revenue | Skimlinks/Impact template with `{url}` placeholder |
| `NEXT_PUBLIC_SITE_URL` | SEO / sitemap | Public canonical URL, e.g. `https://yashgoel.com` |

---

## Auth

`/admin` is currently **not auth-protected**. The page itself shows a yellow warning. Anyone who knows the URL can write to the repo, so keep it private.

A simple password gate is the next thing to add, single env var (`ADMIN_PASSWORD`) + signed cookie. Until then, don't share the URL.

---

## Local development

```bash
npm install
npm run dev
```

If you want the dashboard to commit live (locally), run `vercel env pull` to get the GitHub + Blob env vars locally, then restart `npm run dev`.

## Production

```bash
npm run build
npm start
```

Set `NEXT_PUBLIC_SITE_URL` to your canonical URL so sitemap, robots, and Open Graph tags resolve correctly.

---

## Project structure

```
app/
  (routes)/                 # public pages
  admin/                    # private dashboard
    actions.ts              # server actions (createReview, updateReview, createPhoto, uploadProductImage)
    page.tsx                # dashboard shell
    tabs.tsx                # 3-tab nav (Add product / Add photo / Edit existing)
    product-form.tsx        # the big form
    photo-form.tsx          # photo upload form
    product-photo-upload.tsx
    edit-list.tsx           # list of existing reviews
    edit/[kind]/[slug]/     # edit page for a specific review
  layout.tsx                # root layout, fonts, metadata
  globals.css               # Tailwind + theme tokens

components/
  category-filter.tsx       # listing-page filter (category + sort + region)
  product-card.tsx          # listing card
  review-meta.tsx           # detail-page sidebar with buy links
  spotify-embed.tsx         # responsive Spotify iframe
  ...

content/
  skincare/*.mdx            # one file per review
  supplements/*.mdx
  oral-care/*.mdx
  fashion/*.mdx             # reviews carrying a `garment` block
  notes/*.mdx
  photos.json               # photo gallery metadata

lib/
  affiliate.ts              # URL → affiliate-tagged URL rewriter
  content.ts                # MDX file readers
  garment-types.ts          # garment vocabulary (fits, seasons, care, conditions)
  garment.ts                # derived garment longevity (months owned, cost per wear)
  github.ts                 # tiny GitHub REST client
  photos.ts                 # photo loader
  retailers.ts              # host → retailer name + theme + region maps
  schema.ts                 # Zod schemas for frontmatter
  site.ts                   # site-wide identity (name, bio, etc.)
  socials.ts                # links to my socials
  types.ts                  # TypeScript interfaces
```

---

## SEO

- JSON-LD `Person`, `WebSite`, `BlogPosting`, `Review`, `Product` schema
- `sitemap.xml`, `robots.txt` (excludes `/admin`)
- Per-page canonical URLs + OpenGraph tags
- All public pages prerendered as static HTML; `/admin` is dynamic

---

## License

Code is for my own personal site. Reviews and photos are © Yash Goel. Open an issue if you'd like to discuss reuse.
