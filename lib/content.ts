import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { primerFrontmatter, reviewFrontmatter } from "./schema";
import type {
  Kind,
  Primer,
  PrimerSummary,
  Review,
  ReviewSummary,
} from "./types";

const ROOT = path.join(process.cwd(), "content");

function readReviews(kind: Kind): Review[] {
  const dir = path.join(ROOT, kind);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));
  const out: Review[] = [];
  for (const file of files) {
    // A single malformed MDX file (missing required frontmatter, a bad
    // buy-link URL, etc.) used to throw here and, because feed.xml /
    // sitemap / llms.txt prerender the whole catalog, FAIL THE DEPLOY.
    // Degrade to log-and-skip so one bad file drops a single entry
    // instead of bricking the build. `pnpm test` (the data-integrity
    // gate) is still the place that catches these before push.
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);
      const fm = reviewFrontmatter.parse(data);
      const slug = file.replace(/\.mdx$/, "");
      out.push({ kind, slug, body: content.trim(), ...fm });
    } catch (err) {
      console.error(
        `[content] skipping invalid review ${kind}/${file}:`,
        (err as Error).message,
      );
    }
  }
  return out;
}

function sortByDateDesc<T extends { datePublished: string }>(list: T[]): T[] {
  return [...list].sort((a, b) =>
    b.datePublished.localeCompare(a.datePublished),
  );
}

/**
 * Internal ranking score. Folds every signal that should influence the
 * order of a category listing into a single number. Higher = surfaces
 * sooner. Never rendered to the reader, used only for sort.
 *
 * Weights (chosen so the rules dominate ties):
 *   verdict      recommend +60 · okay +25 · testing 0 · bad −40
 *   routines     present in any routine: +30
 *                (the morning / evening / stack / shower shelves are
 *                what I actually reach for, so anything that earned a
 *                slot there should outrank anything that didn't)
 *   photo        +8 (photographed cards read as portfolio first; the
 *                watermark cards form a quieter tail)
 *   recency      0..15, tapered linearly across the last 365 days off
 *                `datePublished`; older entries bottom out at 0
 *
 * Recency is the smallest term on purpose, it only breaks ties between
 * otherwise-equal items. A photographed recommend from a year ago will
 * still beat a brand-new still-testing entry.
 */
const VERDICT_SCORE: Record<string, number> = {
  recommend: 60,
  okay: 25,
  bad: -40,
};

// Snapshot at module load so prerender doesn't trip Next 16's
// cacheComponents "current time" guard. Sort order is stable within a
// deploy, which is the intended granularity for the recency boost.
const BUILD_NOW_MS = Date.now();

function recencyBoost(datePublished: string): number {
  const t = Date.parse(datePublished);
  if (Number.isNaN(t)) return 0;
  const days = (BUILD_NOW_MS - t) / 86_400_000;
  if (days <= 0) return 15;
  if (days >= 365) return 0;
  return 15 * (1 - days / 365);
}

type Rankable = {
  verdict?: string;
  routines?: string[];
  photo?: string;
  datePublished: string;
};

function getRankingScore(r: Rankable): number {
  let score = 0;
  if (r.verdict && VERDICT_SCORE[r.verdict] !== undefined) {
    score += VERDICT_SCORE[r.verdict];
  }
  if (Array.isArray(r.routines) && r.routines.length > 0) {
    score += 30;
  }
  if (r.photo) score += 8;
  score += recencyBoost(r.datePublished);
  return score;
}

function sortByScore<T extends Rankable>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const diff = getRankingScore(b) - getRankingScore(a);
    if (diff !== 0) return diff;
    return b.datePublished.localeCompare(a.datePublished);
  });
}

/**
 * Public-facing listings exclude any review with `hidden: true` in its
 * frontmatter. The `/admin` dashboard uses `getAllReviewsIncludingHidden()` so
 * the author can still toggle them back on.
 *
 * Cross-listing: a review whose `crossList` array includes `kind` also
 * shows up here, even if its canonical folder is a different section.
 * (Detail-page URL stays at the canonical kind, no duplicate routes.)
 */
export function getReviews(kind: Kind): ReviewSummary[] {
  const native = readReviews(kind);
  const crossKinds: Kind[] = [
    "skincare",
    "supplements",
    "oral-care",
    "hair-care",
    "body-care",
    "essentials",
    "miscellaneous",
  ];
  const guest: Review[] = [];
  for (const k of crossKinds) {
    if (k === kind) continue;
    for (const r of readReviews(k)) {
      if (r.crossList?.includes(kind)) guest.push(r);
    }
  }
  return sortByScore([...native, ...guest])
    .filter((r) => !r.hidden && !r.retired)
    .map(({ body: _body, ...rest }) => rest);
}

export function getRetiredReviews(): ReviewSummary[] {
  return sortByDateDesc([
    ...readReviews("skincare"),
    ...readReviews("supplements"),
    ...readReviews("oral-care"),
    ...readReviews("hair-care"),
    ...readReviews("body-care"),
    ...readReviews("essentials"),
    ...readReviews("miscellaneous"),
  ])
    .filter((r) => r.retired && !r.hidden)
    .map(({ body: _body, ...rest }) => rest);
}

export function getReview(kind: Kind, slug: string): Review | null {
  return readReviews(kind).find((r) => r.slug === slug) ?? null;
}

export function getAllReviews(): ReviewSummary[] {
  // Use the raw `readReviews` (not `getReviews`) so cross-listed items
  // appear once in the global union, by their canonical kind, where
  // they actually live on disk, instead of once per surfaced section.
  return sortByDateDesc([
    ...readReviews("skincare"),
    ...readReviews("supplements"),
    ...readReviews("oral-care"),
    ...readReviews("hair-care"),
    ...readReviews("body-care"),
    ...readReviews("essentials"),
    ...readReviews("miscellaneous"),
  ])
    .filter((r) => !r.hidden && !r.retired)
    .map(({ body: _body, ...rest }) => rest);
}

/**
 * Like `getAllReviews()` but keeps the `body` field. Used by the
 * search-index builder so snippet generation has the full prose to
 * match against. Build-time only, never ship the full bodies into a
 * client payload.
 */
export function getAllReviewsWithBody(): Review[] {
  return sortByDateDesc([
    ...readReviews("skincare"),
    ...readReviews("supplements"),
    ...readReviews("oral-care"),
    ...readReviews("hair-care"),
    ...readReviews("body-care"),
    ...readReviews("essentials"),
    ...readReviews("miscellaneous"),
  ]).filter((r) => !r.hidden && !r.retired);
}

export function getAllReviewsIncludingHidden(kind: Kind): ReviewSummary[] {
  return sortByDateDesc(readReviews(kind)).map(
    ({ body: _body, ...rest }) => rest,
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Primers, short, high-signal reference pages on ingredients and stacks.
// ────────────────────────────────────────────────────────────────────────────

function readPrimers(): Primer[] {
  const dir = path.join(ROOT, "primers");
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));
  const out: Primer[] = [];
  for (const file of files) {
    // Same resilience as readReviews: a single bad primer must not fail
    // the whole prerender/deploy.
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);
      const fm = primerFrontmatter.parse(data);
      const slug = file.replace(/\.mdx$/, "");
      out.push({ slug, body: content.trim(), ...fm });
    } catch (err) {
      console.error(
        `[content] skipping invalid primer ${file}:`,
        (err as Error).message,
      );
    }
  }
  return out;
}

export function getPrimers(): PrimerSummary[] {
  return sortByDateDesc(readPrimers()).map(({ body: _body, ...rest }) => rest);
}

/** Build-time only: primers with their full body. Used by the search index. */
export function getPrimersWithBody(): Primer[] {
  return sortByDateDesc(readPrimers());
}

export function getPrimer(slug: string): Primer | null {
  return readPrimers().find((p) => p.slug === slug) ?? null;
}

/** Primers that explicitly reference this product slug via relatedProductSlugs. */
export function getPrimersForProduct(productSlug: string): PrimerSummary[] {
  return getPrimers().filter((p) =>
    p.relatedProductSlugs.includes(productSlug),
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Prev/next navigation helpers. All lists are sorted newest-first by
// datePublished already (sortByDateDesc), so "prev" means older and
// "next" means newer within a content type.
// ────────────────────────────────────────────────────────────────────────────

type Adjacent<T> = { prev: T | null; next: T | null };

function findAdjacent<T extends { slug: string }>(
  list: T[],
  slug: string,
): Adjacent<T> {
  const i = list.findIndex((x) => x.slug === slug);
  if (i === -1) return { prev: null, next: null };
  // list is newest-first; "next" (newer) sits at a lower index, "prev"
  // (older) at a higher one. Present to the reader as prev=older since
  // that's the more natural "keep reading back" direction.
  return {
    next: i > 0 ? list[i - 1] : null,
    prev: i < list.length - 1 ? list[i + 1] : null,
  };
}

export function getAdjacentReviews(
  kind: Kind,
  slug: string,
): Adjacent<ReviewSummary> {
  return findAdjacent(getReviews(kind), slug);
}

export function getAdjacentPrimers(slug: string): Adjacent<PrimerSummary> {
  return findAdjacent(getPrimers(), slug);
}
