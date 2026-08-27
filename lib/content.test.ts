import { describe, it, expect } from "vitest";
import {
  getAllReviews,
  getAllReviewsIncludingHidden,
  getPrimer,
  getPrimers,
  getReview,
  getReviews,
  getAdjacentReviews,
  rankingScoreOf,
} from "./content";
import { KINDS } from "./types";

/**
 * Content-loading smoke tests. These run against the real content/ directory
 * on purpose, if a frontmatter field drifts or a new review has bad YAML,
 * the tests fail before a bad deploy goes out.
 */

// The canonical list, imported rather than restated. This file used to
// carry its own three-entry copy, so the five sections added after it was
// written (body-care, hair-care, fashion, essentials, miscellaneous) were
// never covered, and the getAllReviews() count test compared a total over
// eight kinds against a sum over three.

describe("getReviews(), per kind", () => {
  for (const kind of KINDS) {
    it(`returns a valid array for ${kind} and all entries match the kind`, () => {
      const reviews = getReviews(kind);
      expect(Array.isArray(reviews)).toBe(true);
      for (const r of reviews) {
        // A cross-listed review surfaces in a section that is not its
        // canonical folder, which is the whole point of crossList.
        expect(r.kind === kind || r.crossList.includes(kind)).toBe(true);
        expect(r.slug).toMatch(/^[a-z0-9-]+$/);
        expect(r.brand.length).toBeGreaterThan(0);
        expect(r.name.length).toBeGreaterThan(0);
        expect(r.category.length).toBeGreaterThan(0);
        expect(r.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it(`orders ${kind} reviews by ranking score, highest first`, () => {
      // getReviews() sorts by getRankingScore (verdict, routines, photo,
      // recency), not by date. This asserted date order for months after
      // ranking landed, which made it a permanently red test rather than
      // a gate on anything.
      const reviews = getReviews(kind);
      for (let i = 1; i < reviews.length; i++) {
        expect(
          rankingScoreOf(reviews[i - 1]),
        ).toBeGreaterThanOrEqual(rankingScoreOf(reviews[i]));
      }
    });

    it(`walks ${kind} adjacency in date order`, () => {
      // PrevNext labels these "Older" and "Newer", so the ordering behind
      // them has to be chronological even though the listing is ranked.
      const reviews = getReviews(kind);
      for (const r of reviews) {
        const { prev, next } = getAdjacentReviews(kind, r.slug);
        if (prev) {
          expect(
            prev.datePublished.localeCompare(r.datePublished),
          ).toBeLessThanOrEqual(0);
        }
        if (next) {
          expect(
            next.datePublished.localeCompare(r.datePublished),
          ).toBeGreaterThanOrEqual(0);
        }
      }
    });
  }
});

describe("getReviews(), hidden filter", () => {
  it("public listing never includes hidden reviews", () => {
    for (const kind of KINDS) {
      const pub = getReviews(kind);
      expect(pub.every((r) => r.hidden !== true)).toBe(true);
    }
  });

  it("admin listing can include hidden reviews", () => {
    for (const kind of KINDS) {
      const all = getAllReviewsIncludingHidden(kind);
      const pub = getReviews(kind);
      // all must be a superset of pub
      const pubSlugs = new Set(pub.map((r) => r.slug));
      for (const r of pub) {
        expect(all.find((x) => x.slug === r.slug)).toBeDefined();
      }
      // any review in `all` but not `pub` is hidden
      for (const r of all) {
        if (!pubSlugs.has(r.slug)) {
          // Retired postdates this test. A retired review is off the
          // public listing without being hidden, and the author still
          // needs to see it on /admin.
          expect(r.hidden === true || r.retired === true).toBe(true);
        }
      }
    }
  });
});

describe("getReview(), single lookup", () => {
  it("round-trips: every slug from getReviews() resolves", () => {
    for (const kind of KINDS) {
      const reviews = getReviews(kind);
      for (const r of reviews) {
        // A cross-listed review is surfaced here but lives, and is
        // linked, at its canonical kind: ProductCard builds the href
        // from review.kind. Resolve it there.
        const single = getReview(r.kind, r.slug);
        expect(single).not.toBeNull();
        expect(single?.slug).toBe(r.slug);
        expect(single?.brand).toBe(r.brand);
      }
    }
  });

  it("returns null for a slug that does not exist", () => {
    expect(getReview("skincare", "definitely-not-a-real-product")).toBeNull();
  });
});

describe("slug uniqueness", () => {
  it("no two reviews share the same slug within a kind", () => {
    for (const kind of KINDS) {
      const slugs = getAllReviewsIncludingHidden(kind).map((r) => r.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });
});

describe("getAllReviews()", () => {
  it("combines all kinds and excludes hidden", () => {
    const all = getAllReviews();
    // Summing getReviews() over the kinds double-counts anything
    // cross-listed, which is why this compares distinct reviews.
    const distinct = new Set(
      KINDS.flatMap((k) => getReviews(k).map((r) => `${r.kind}/${r.slug}`)),
    );
    expect(all.length).toBe(distinct.size);
    expect(all.every((r) => r.hidden !== true)).toBe(true);
  });
});

describe("getPrimers() and getPrimer()", () => {
  it("returns an array (possibly empty)", () => {
    expect(Array.isArray(getPrimers())).toBe(true);
  });

  it("round-trips any existing primer slugs", () => {
    for (const p of getPrimers()) {
      const single = getPrimer(p.slug);
      expect(single).not.toBeNull();
      expect(single?.slug).toBe(p.slug);
    }
  });
});
