import { z } from "zod";

import { KINDS } from "@/lib/types";
import {
  GARMENT_CARE_CODES,
  GARMENT_CONDITIONS,
  GARMENT_FITS,
  GARMENT_SEASONS,
} from "@/lib/garment-types";

/**
 * Reject Amazon search-result URLs as buy links. A URL like
 * `amazon.in/s?k=colgate+floss` does resolve, but it lands the
 * reader on a search page instead of the specific product I bought,
 * which is misleading. Real product URLs use `/dp/<ASIN>`. This
 * also rejects Walmart / Target search URLs for the same reason.
 *
 * Hooked at parse time via `productUrl()` below so a stray search
 * URL fails the build instead of shipping silently.
 */
// Match any retailer's search-result URL by shape, not host. Real
// product pages have a stable slug or ID in the path; search pages
// always carry the query in either the path (`/s?`) or as a known
// search query parameter. This catches Amazon / Walmart / Target /
// Sephora / Boots / Nykaa / Myntra / Blinkit / Zepto and anything
// else that follows the same conventions.
const SEARCH_URL_PATTERN =
  /^https?:\/\/[^?#]+(?:\/s\?|\/s\/\?|\/search(?:\?|\/result\?)|\/instamart\/search)/i;
const SEARCH_QS_PATTERN =
  /[?&](?:q|k|searchTerm|searchText|keyword|text|query)=/i;

function productUrl() {
  return z
    .string()
    .url()
    // Zod's .url() accepts `javascript:`/`data:` (they ARE valid URLs per
    // the spec). Buy links must be http(s), this stops a dangerous-scheme
    // URL from ever entering the content at the data layer (the render
    // layer also sanitizes, but defense in depth).
    .refine((u) => /^https?:\/\//i.test(u.trim()), {
      message: "Buy links must be http(s) URLs.",
    })
    .refine((u) => !SEARCH_URL_PATTERN.test(u) && !SEARCH_QS_PATTERN.test(u), {
      message:
        "Search-result URLs are not valid buy links. Use a /dp/<ASIN> or specific product page.",
    });
}

export const reviewFrontmatter = z.object({
  name: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().min(1),
  verdict: z.enum(["recommend", "okay", "bad"]).optional(),
  ratings: z
    .object({
      effect: z.number().min(0).max(10).optional(),
      value: z.number().min(0).max(10).optional(),
      tolerance: z.number().min(0).max(10).optional(),
    })
    .optional(),
  price: z
    .union([
      z.string(),
      z.object({
        in: z.string().optional(),
        us: z.string().optional(),
        uk: z.string().optional(),
      }),
    ])
    .optional(),
  servingsPerContainer: z.number().positive().optional(),
  dailyServings: z.number().positive().optional(),
  skinType: z.array(z.string()).optional(),
  goal: z.array(z.string()).optional(),
  routines: z
    .array(z.enum(["morning", "evening", "stack", "shower", "oral"]))
    .default([]),
  /**
   * Optional short caption shown next to the row on /routine pages.
   * Surfaces timing or cadence on the row itself so a reader doesn't
   * have to open the product card to know when each item runs. Used
   * for supplements (e.g. "With a fatty meal", "Evening · before
   * bed") and skincare (e.g. "Once a month · 15-day offset"). Keep
   * it short, sentence-fragment style.
   */
  routineNote: z.string().optional(),
  // Additional category pages this product surfaces on. Detail-page
  // URL stays at the canonical kind (no duplicate routes); listing
  // queries union match. Used for items that genuinely live in two
  // sections (a beard trimmer = hair-care AND body-care).
  crossList: z.array(z.enum(KINDS)).default([]),
  photo: z.string().optional(),
  // Cold-mirror URL for the primary photo. When `photo` is a local
  // /products/... path served from /public/, this points at a copy on
  // R2 under the same key. The detail-page gallery falls back to this
  // automatically if the local image ever 404s (deploy drift, CDN
  // issue, etc.). Auto-populated by the mirror script when the local
  // photo is uploaded to R2.
  photoFallback: z.string().optional(),
  // Additional product shots (alt angles, packaging, in-use). Listing
  // cards cycle through these on hover; the detail-page gallery shows
  // them as slides. Distinct from `photoTimeline` (dated progress).
  photos: z.array(z.string()).default([]),
  // Optional product video (review walkthrough, application demo).
  // Detail page only, never the listing card. Accepts:
  //   - raw file URL (.mp4 / .webm / .mov), rendered with <video>
  //   - YouTube watch / shorts / youtu.be URL, rendered as iframe
  //   - Vimeo URL, rendered as iframe
  video: z.string().url().optional(),
  photoTimeline: z
    .array(
      z.object({
        date: z.string(),
        src: z.string().min(1),
        note: z.string().optional(),
      }),
    )
    .default([]),
  boughtFromUrl: productUrl().optional(),
  // .nullable() before .default() so a frontmatter line like
  // `indiaLinks:` (which YAML parses as null) coerces to [] instead
  // of failing parse with "expected array, received null".
  indiaLinks: z
    .array(z.object({ retailer: z.string().min(1), url: productUrl() }))
    .nullable()
    .default([])
    .transform((v) => v ?? []),
  westernLinks: z
    .array(z.object({ retailer: z.string().min(1), url: productUrl() }))
    .nullable()
    .default([])
    .transform((v) => v ?? []),
  ukLinks: z
    .array(z.object({ retailer: z.string().min(1), url: productUrl() }))
    .nullable()
    .default([])
    .transform((v) => v ?? []),
  ingredients: z.array(z.string()).optional(),
  /**
   * Sunscreen-only: list of UV filter INCI names exactly as they
   * appear on the product label. Rendered as a typed/generation table
   * by the <UVFilters> MDX component, with each name looked up in
   * lib/uv-filters.ts. Leave undefined for non-sunscreen products.
   */
  uvFilters: z.array(z.string()).optional(),
  /**
   * Fashion-only: the properties a garment has that a bottle doesn't.
   * Every field is data, never prose, so the detail page can draw the
   * fit, the blend, the care symbols and the wear timeline instead of
   * describing them. Leave undefined for non-fashion kinds. Enums come
   * from lib/garment-types.ts so the admin form, the renderer and the
   * content files can never disagree about the vocabulary.
   */
  garment: z
    .object({
      fit: z.enum(GARMENT_FITS),
      size: z.string().min(1),
      sizeNote: z.string().optional(),
      fabric: z
        .array(
          z.object({
            material: z.string().min(1),
            percent: z.number().positive().max(100),
          }),
        )
        .default([]),
      care: z.array(z.enum(GARMENT_CARE_CODES)).default([]),
      season: z.array(z.enum(GARMENT_SEASONS)).default([]),
      // YYYY-MM or YYYY-MM-DD, same convention as `changelog`. Format
      // is asserted by tests/data-integrity.test.ts alongside every
      // other date on the site, so there is one date rule, not two.
      firstWorn: z.string().min(1),
      wearsPerMonth: z.number().positive().max(31).optional(),
      condition: z.enum(GARMENT_CONDITIONS),
      aging: z
        .array(z.object({ date: z.string(), note: z.string().min(1) }))
        .default([]),
    })
    .refine(
      (g) =>
        g.fabric.length === 0 ||
        Math.abs(g.fabric.reduce((sum, f) => sum + f.percent, 0) - 100) < 0.01,
      { message: "Fabric percentages must add up to 100." },
    )
    .optional(),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  repurchase: z.boolean().optional(),
  hidden: z.boolean().default(false),
  retired: z.boolean().default(false),
  retiredReason: z.string().optional(),
  datePublished: z.string(),
  lastUpdated: z.string().optional(),
  changelog: z
    .array(
      z.object({
        date: z.string(),
        note: z.string().min(1),
      }),
    )
    .default([]),
  summary: z.string().default(""),
});

/**
 * A Primer is a short, high-signal reference page.
 *   - `kind: "stack"`, a combined-together explainer (bone health, omega-3,
 *     the sleep stack). Usually includes a `stack` list of component parts.
 *   - `kind: "ingredient"`, a single-ingredient primer (niacinamide, retinoids,
 *     ceramides, magnesium forms).
 * `domain` toggles between supplement / skincare context for grouping on
 * the index page.
 */
export const primerFrontmatter = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  kind: z.enum(["stack", "ingredient"]),
  domain: z.enum(["supplement", "skincare", "oral", "meta"]),
  tags: z.array(z.string()).default([]),
  stack: z.array(z.string()).default([]),
  relatedProductSlugs: z.array(z.string()).default([]),
  datePublished: z.string(),
  lastUpdated: z.string().optional(),
});

export type ReviewFrontmatter = z.infer<typeof reviewFrontmatter>;
