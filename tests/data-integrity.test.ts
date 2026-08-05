import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";

import { primerFrontmatter, reviewFrontmatter } from "@/lib/schema";
import {
  getAllReviewsIncludingHidden,
  getPrimer,
  getPrimers,
  getReviews,
} from "@/lib/content";
import {
  availableRegions,
  isKnownRetailerHost,
} from "@/lib/retailers";
import { findUVFilter } from "@/lib/uv-filters";
import { GLOSSARY, findGlossaryEntry } from "@/lib/glossary";
import { getLibrary } from "@/lib/library";
import { KINDS, KIND_LABEL } from "@/lib/types";
import {
  GARMENT_CARE_CODES,
  GARMENT_CONDITIONS,
  GARMENT_FITS,
  GARMENT_SEASONS,
} from "@/lib/garment-types";
import type { Kind, ReviewSummary } from "@/lib/types";

/**
 * Whole-catalog data-integrity gate.
 *
 * Why this exists: the site is content-first: every review and primer
 * is a strict-schema MDX file, and the cross-references between them
 * (cross-listing, related primers, glossary ↔ primer links, retailer
 * hosts, regional buy links) are all data the build trusts. When that
 * data drifts, pages render blank cards, "A"-labelled buy buttons, or
 * the whole build throws. `content.test.ts` only smoke-tests three of
 * the seven kinds; this file is the exhaustive gate that runs against
 * the real content/ tree so a bad file fails `pnpm test` (seconds)
 * instead of `next build` (minutes) or production.
 *
 * It reads the filesystem directly for schema validation (so a single
 * broken file is named, not the whole batch) and uses the real loaders
 * for the referential checks.
 */

// Derived, never re-spelled: lib/types.ts owns the list, so a new kind
// is covered by every check below the moment it is declared there.
const ALL_KINDS: Kind[] = [...KINDS];

const CONTENT_ROOT = path.join(process.cwd(), "content");

function mdxFiles(dir: string): string[] {
  const full = path.join(CONTENT_ROOT, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => path.join(full, f));
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DAY_OR_MONTH = /^\d{4}-\d{2}(-\d{2})?$/;

// Every review file, loaded once including hidden + retired so the
// integrity checks cover the entire on-disk catalog, not just the
// public listing.
const ALL_REVIEWS: ReviewSummary[] = ALL_KINDS.flatMap((k) =>
  getAllReviewsIncludingHidden(k),
);
const SLUGS_BY_NAME = new Set(ALL_REVIEWS.map((r) => r.slug));

// ────────────────────────────────────────────────────────────────────
// 1. Schema validation, every file in every kind + primers parses.
// ────────────────────────────────────────────────────────────────────

describe("review frontmatter parses for every kind", () => {
  for (const kind of ALL_KINDS) {
    it(`all ${kind} MDX files satisfy the schema`, () => {
      const failures: string[] = [];
      for (const file of mdxFiles(kind)) {
        const raw = fs.readFileSync(file, "utf8");
        let data: unknown;
        try {
          data = matter(raw).data;
        } catch (e) {
          failures.push(`${path.basename(file)}: YAML parse error, ${e}`);
          continue;
        }
        const parsed = reviewFrontmatter.safeParse(data);
        if (!parsed.success) {
          failures.push(
            `${path.basename(file)}: ${parsed.error.issues
              .map((i) => `${i.path.join(".")} ${i.message}`)
              .join("; ")}`,
          );
        }
      }
      expect(failures, failures.join("\n")).toEqual([]);
    });
  }
});

describe("primer frontmatter parses", () => {
  it("all primer MDX files satisfy the schema", () => {
    const failures: string[] = [];
    for (const file of mdxFiles("primers")) {
      const raw = fs.readFileSync(file, "utf8");
      let data: unknown;
      try {
        data = matter(raw).data;
      } catch (e) {
        failures.push(`${path.basename(file)}: YAML parse error, ${e}`);
        continue;
      }
      const parsed = primerFrontmatter.safeParse(data);
      if (!parsed.success) {
        failures.push(
          `${path.basename(file)}: ${parsed.error.issues
            .map((i) => `${i.path.join(".")} ${i.message}`)
            .join("; ")}`,
        );
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────
// 2. Slug + filename hygiene.
// ────────────────────────────────────────────────────────────────────

describe("slug hygiene", () => {
  it("no duplicate slugs within a kind", () => {
    for (const kind of ALL_KINDS) {
      const slugs = getAllReviewsIncludingHidden(kind).map((r) => r.slug);
      const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
      expect(dupes, `${kind} duplicate slugs: ${dupes.join(", ")}`).toEqual([]);
    }
  });

  it("every slug is URL-safe (lowercase, digits, hyphens)", () => {
    const bad = ALL_REVIEWS.filter((r) => !/^[a-z0-9-]+$/.test(r.slug));
    expect(
      bad.map((r) => `${r.kind}/${r.slug}`),
      "non-URL-safe slugs",
    ).toEqual([]);
  });

  it("no duplicate primer slugs", () => {
    const slugs = getPrimers().map((p) => p.slug);
    const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    expect(dupes, `duplicate primer slugs: ${dupes.join(", ")}`).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────
// 3. Cross-listing integrity.
// ────────────────────────────────────────────────────────────────────

describe("crossList references", () => {
  it("every crossList value is a real kind and not the file's own kind", () => {
    const bad: string[] = [];
    for (const r of ALL_REVIEWS) {
      for (const target of r.crossList ?? []) {
        if (!ALL_KINDS.includes(target)) {
          bad.push(`${r.kind}/${r.slug} → unknown kind "${target}"`);
        }
        if (target === r.kind) {
          bad.push(`${r.kind}/${r.slug} → cross-lists its own kind`);
        }
      }
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────
// 4. Buy links: retailer host mapping + regional availability.
// ────────────────────────────────────────────────────────────────────

function reviewBuyUrls(r: ReviewSummary): string[] {
  return [
    ...(r.indiaLinks ?? []).map((l) => l.url),
    ...(r.westernLinks ?? []).map((l) => l.url),
    ...(r.ukLinks ?? []).map((l) => l.url),
    ...(r.boughtFromUrl ? [r.boughtFromUrl] : []),
  ];
}

describe("buy-link retailer hosts", () => {
  it("every buy-link host is explicitly mapped in lib/retailers.ts", () => {
    const unmapped: string[] = [];
    for (const r of ALL_REVIEWS) {
      for (const url of reviewBuyUrls(r)) {
        if (!isKnownRetailerHost(url)) {
          unmapped.push(`${r.kind}/${r.slug}: ${url}`);
        }
      }
    }
    expect(
      unmapped,
      `Unmapped retailer hosts (add them to RETAILER_BY_HOST first):\n${unmapped.join("\n")}`,
    ).toEqual([]);
  });

  it("a review with any buy link is available in at least one region", () => {
    const stranded: string[] = [];
    for (const r of ALL_REVIEWS) {
      const hasLinks = reviewBuyUrls(r).length > 0;
      if (hasLinks && availableRegions(r).length === 0) {
        stranded.push(`${r.kind}/${r.slug}`);
      }
    }
    expect(
      stranded,
      `Reviews with buy links but no detectable region:\n${stranded.join("\n")}`,
    ).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────
// 5. UV-filter references resolve (sunscreen tables).
// ────────────────────────────────────────────────────────────────────

describe("uvFilters references", () => {
  it("every uvFilter name resolves in lib/uv-filters.ts", () => {
    const unknown: string[] = [];
    for (const r of ALL_REVIEWS) {
      for (const f of r.uvFilters ?? []) {
        if (!findUVFilter(f)) unknown.push(`${r.kind}/${r.slug}: "${f}"`);
      }
    }
    expect(unknown, `Unknown UV filters:\n${unknown.join("\n")}`).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────
// 6. Primer ↔ product references.
// ────────────────────────────────────────────────────────────────────

describe("primer relatedProductSlugs", () => {
  it("every relatedProductSlug resolves to a real product", () => {
    const dangling: string[] = [];
    for (const p of getPrimers()) {
      for (const slug of p.relatedProductSlugs ?? []) {
        if (!SLUGS_BY_NAME.has(slug)) {
          dangling.push(`primers/${p.slug} → "${slug}"`);
        }
      }
    }
    expect(dangling, `Dangling related product slugs:\n${dangling.join("\n")}`).toEqual(
      [],
    );
  });
});

// ────────────────────────────────────────────────────────────────────
// 7. Glossary ↔ primer integrity.
// ────────────────────────────────────────────────────────────────────

describe("glossary integrity", () => {
  it("no duplicate glossary slugs", () => {
    const slugs = GLOSSARY.map((e) => e.slug);
    const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    expect(dupes, `duplicate glossary slugs: ${dupes.join(", ")}`).toEqual([]);
  });

  it("every seeAlso /primers/<slug> link points at a real primer", () => {
    const dangling: string[] = [];
    for (const e of GLOSSARY) {
      for (const s of e.seeAlso ?? []) {
        const m = s.href.match(/^\/primers\/([a-z0-9-]+)$/);
        if (m && !getPrimer(m[1])) {
          dangling.push(`glossary "${e.term}" → ${s.href}`);
        }
      }
    }
    expect(dangling, `Dangling glossary→primer links:\n${dangling.join("\n")}`).toEqual(
      [],
    );
  });

  it("findGlossaryEntry round-trips every glossary slug", () => {
    for (const e of GLOSSARY) {
      expect(findGlossaryEntry(e.slug)?.slug).toBe(e.slug);
    }
  });
});

// ────────────────────────────────────────────────────────────────────
// 8. Date formats.
// ────────────────────────────────────────────────────────────────────

describe("date formats", () => {
  it("datePublished is YYYY-MM-DD for every review", () => {
    const bad = ALL_REVIEWS.filter((r) => !ISO_DAY.test(r.datePublished));
    expect(
      bad.map((r) => `${r.kind}/${r.slug}: "${r.datePublished}"`),
      "bad datePublished",
    ).toEqual([]);
  });

  it("changelog and lastUpdated dates are valid ISO", () => {
    const bad: string[] = [];
    for (const r of ALL_REVIEWS) {
      if (r.lastUpdated && !ISO_DAY.test(r.lastUpdated)) {
        bad.push(`${r.kind}/${r.slug}: lastUpdated "${r.lastUpdated}"`);
      }
      for (const c of r.changelog ?? []) {
        if (!ISO_DAY_OR_MONTH.test(c.date)) {
          bad.push(`${r.kind}/${r.slug}: changelog "${c.date}"`);
        }
      }
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────
// 9. Public-listing invariants (a layer above content.test.ts).
// ────────────────────────────────────────────────────────────────────

describe("public listings", () => {
  it("never surface hidden or retired reviews in any kind", () => {
    for (const kind of ALL_KINDS) {
      const pub = getReviews(kind);
      expect(pub.every((r) => r.hidden !== true && r.retired !== true)).toBe(
        true,
      );
    }
  });
});

// ────────────────────────────────────────────────────────────────────
// 10. Author-owned JSON data files parse and match their shape.
// ────────────────────────────────────────────────────────────────────

describe("content JSON data files", () => {
  it("photos.json is a valid array of well-formed photos", () => {
    const raw = fs.readFileSync(
      path.join(CONTENT_ROOT, "photos.json"),
      "utf8",
    );
    const photos = JSON.parse(raw);
    expect(Array.isArray(photos)).toBe(true);
    const bad: string[] = [];
    for (const [i, p] of photos.entries()) {
      if (typeof p.src !== "string" || p.src.length === 0)
        bad.push(`photo[${i}]: missing src`);
      if (typeof p.alt !== "string" || p.alt.length === 0)
        bad.push(`photo[${i}] (${p.src}): missing alt`);
      if (typeof p.date !== "string" || !ISO_DAY.test(p.date))
        bad.push(`photo[${i}] (${p.src}): bad date "${p.date}"`);
      if (typeof p.width !== "number" || typeof p.height !== "number")
        bad.push(`photo[${i}] (${p.src}): missing width/height`);
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });

  it("no gallery photo serves its PRIMARY src from the rate-limited r2.dev domain", () => {
    // Cloudflare's `pub-*.r2.dev` public *development* URL is
    // rate-limited and gets disabled (returns 401) without warning,
    // this is what blanked the homepage hero + /photos. Primary `src`
    // must point at a reliable host (GitHub Releases /
    // objects.githubusercontent.com, a custom R2 domain, or Vercel
    // Blob). r2.dev is only acceptable as a passive `srcFallback`.
    const raw = fs.readFileSync(
      path.join(CONTENT_ROOT, "photos.json"),
      "utf8",
    );
    const photos = JSON.parse(raw);
    const offenders = photos
      .filter((p: { src?: string }) => /\bpub-[^/]*\.r2\.dev/.test(p.src ?? ""))
      .map((p: { src: string }) => p.src);
    expect(
      offenders,
      `These photos use the rate-limited r2.dev dev URL as their primary src, move it to srcFallback:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("_library.json parses into the expected shape", () => {
    const lib = getLibrary();
    expect(Array.isArray(lib.reading)).toBe(true);
    expect(Array.isArray(lib.watching)).toBe(true);
    for (const item of [...lib.reading, ...lib.watching]) {
      expect(typeof item.title).toBe("string");
      expect(["current", "finished", "abandoned"]).toContain(item.status);
    }
  });
});

// ────────────────────────────────────────────────────────────────────
// 11. Kind wiring. A kind declared in lib/types.ts must have both of
//     its routes on disk, or the nav/sitemap/homepage link to a 404.
// ────────────────────────────────────────────────────────────────────

describe("every kind is fully wired", () => {
  it("has a listing route and a detail route", () => {
    const missing: string[] = [];
    for (const kind of ALL_KINDS) {
      const listing = path.join(process.cwd(), "app", kind, "page.tsx");
      const detail = path.join(process.cwd(), "app", kind, "[slug]", "page.tsx");
      if (!fs.existsSync(listing)) missing.push(`app/${kind}/page.tsx`);
      if (!fs.existsSync(detail)) missing.push(`app/${kind}/[slug]/page.tsx`);
    }
    expect(missing, missing.join("\n")).toEqual([]);
  });

  it("has a display label", () => {
    for (const kind of ALL_KINDS) {
      expect(KIND_LABEL[kind]?.length, `no label for ${kind}`).toBeGreaterThan(0);
    }
  });
});

// ────────────────────────────────────────────────────────────────────
// 12. Garment data. Fashion entries carry structured wear data that
//     the detail page draws rather than describes, so a missing or
//     self-contradicting field is a rendering bug, not a typo.
// ────────────────────────────────────────────────────────────────────

describe("garment data", () => {
  const fashion = ALL_REVIEWS.filter((r) => r.kind === "fashion");

  it("every fashion entry carries a garment block", () => {
    const bad = fashion.filter((r) => !r.garment).map((r) => r.slug);
    expect(bad, `fashion entries missing garment: ${bad.join(", ")}`).toEqual(
      [],
    );
  });

  it("no non-fashion entry carries a garment block", () => {
    const bad = ALL_REVIEWS.filter(
      (r) => r.kind !== "fashion" && r.garment,
    ).map((r) => `${r.kind}/${r.slug}`);
    expect(bad, bad.join(", ")).toEqual([]);
  });

  it("uses only the canonical fit, condition, care and season values", () => {
    const bad: string[] = [];
    for (const r of fashion) {
      const g = r.garment;
      if (!g) continue;
      const id = `fashion/${r.slug}`;
      if (!GARMENT_FITS.includes(g.fit)) bad.push(`${id}: fit ${g.fit}`);
      if (!GARMENT_CONDITIONS.includes(g.condition)) {
        bad.push(`${id}: condition ${g.condition}`);
      }
      for (const c of g.care) {
        if (!GARMENT_CARE_CODES.includes(c)) bad.push(`${id}: care ${c}`);
      }
      for (const s of g.season) {
        if (!GARMENT_SEASONS.includes(s)) bad.push(`${id}: season ${s}`);
      }
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });

  it("fabric percentages add up to 100", () => {
    const bad: string[] = [];
    for (const r of fashion) {
      const fabric = r.garment?.fabric ?? [];
      if (fabric.length === 0) continue;
      const total = fabric.reduce((sum, f) => sum + f.percent, 0);
      if (Math.abs(total - 100) > 0.01) {
        bad.push(`fashion/${r.slug}: ${total}%`);
      }
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });

  it("wear dates are ISO and the aging log never predates the first wear", () => {
    const bad: string[] = [];
    for (const r of fashion) {
      const g = r.garment;
      if (!g) continue;
      const id = `fashion/${r.slug}`;
      if (!ISO_DAY_OR_MONTH.test(g.firstWorn)) {
        bad.push(`${id}: firstWorn "${g.firstWorn}"`);
        continue;
      }
      for (const entry of g.aging) {
        if (!ISO_DAY_OR_MONTH.test(entry.date)) {
          bad.push(`${id}: aging date "${entry.date}"`);
        } else if (entry.date.slice(0, 7) < g.firstWorn.slice(0, 7)) {
          bad.push(`${id}: aging ${entry.date} predates ${g.firstWorn}`);
        }
      }
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });
});
