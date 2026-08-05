/* ------------------------------------------------------------------ *
 * GARMENT VOCABULARY, the whole of it.
 *
 * Deliberately a module of its own rather than a section of
 * lib/types.ts. Everything the fashion section knows about clothes is
 * defined here and nowhere else, so the section can be lifted into a
 * standalone site by copying this file, lib/garment.ts, the
 * components/garment-*.tsx set, app/fashion/ and content/fashion/.
 * The only thing the rest of the site takes from here is the
 * `Garment` type on `Review.garment`.
 *
 * See the "Spinning /fashion out" section of the README.
 * ------------------------------------------------------------------ */

export const GARMENT_FITS = [
  "slim",
  "tailored",
  "regular",
  "relaxed",
  "oversized",
] as const;
export type GarmentFit = (typeof GARMENT_FITS)[number];

export const GARMENT_FIT_LABEL: Record<GarmentFit, string> = {
  slim: "Slim",
  tailored: "Tailored",
  regular: "Regular",
  relaxed: "Relaxed",
  oversized: "Oversized",
};

export const GARMENT_SEASONS = [
  "summer",
  "monsoon",
  "winter",
  "year-round",
] as const;
export type GarmentSeason = (typeof GARMENT_SEASONS)[number];

export const GARMENT_SEASON_LABEL: Record<GarmentSeason, string> = {
  summer: "Summer",
  monsoon: "Monsoon",
  winter: "Winter",
  "year-round": "Year round",
};

/**
 * Months (0 = January) each season covers, on an Indian calendar.
 * Drives the 12-cell wearable-window strip on the detail page. Summer
 * and monsoon deliberately overlap in June; that is the weather, not
 * a bug.
 */
export const GARMENT_SEASON_MONTHS: Record<GarmentSeason, readonly number[]> = {
  summer: [2, 3, 4, 5],
  monsoon: [5, 6, 7, 8],
  winter: [9, 10, 11, 0, 1],
  "year-round": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

/**
 * Care instructions, keyed by the GINETEX / ISO 3758 symbol they map
 * to. Only the symbols that actually appear on clothing sold in India
 * are listed; add one here (and its glyph in components/garment-icons)
 * rather than writing care advice as prose.
 */
export const GARMENT_CARE_CODES = [
  "machine-wash-cold",
  "machine-wash-warm",
  "hand-wash",
  "do-not-bleach",
  "tumble-dry-low",
  "do-not-tumble-dry",
  "line-dry",
  "iron-low",
  "do-not-iron",
  "dry-clean",
  "do-not-dry-clean",
] as const;
export type GarmentCareCode = (typeof GARMENT_CARE_CODES)[number];

export const GARMENT_CARE_LABEL: Record<GarmentCareCode, string> = {
  "machine-wash-cold": "Machine wash cold, 30C",
  "machine-wash-warm": "Machine wash warm, 40C",
  "hand-wash": "Hand wash only",
  "do-not-bleach": "Do not bleach",
  "tumble-dry-low": "Tumble dry low",
  "do-not-tumble-dry": "Do not tumble dry",
  "line-dry": "Line dry",
  "iron-low": "Iron low",
  "do-not-iron": "Do not iron",
  "dry-clean": "Dry clean",
  "do-not-dry-clean": "Do not dry clean",
};

/**
 * Where the piece is in its life. Ordered worst-to-best is wrong here:
 * ordered NEW to FINISHED is the honest axis, because "broken in" is
 * better than "as new" for denim and worse for a shirt. The meter
 * renders position, never a score.
 */
export const GARMENT_CONDITIONS = [
  "as-new",
  "broken-in",
  "worn-in",
  "fading",
  "failing",
] as const;
export type GarmentCondition = (typeof GARMENT_CONDITIONS)[number];

export const GARMENT_CONDITION_LABEL: Record<GarmentCondition, string> = {
  "as-new": "As new",
  "broken-in": "Broken in",
  "worn-in": "Worn in",
  fading: "Fading",
  failing: "Failing",
};

export interface GarmentFabric {
  /** Fibre name as printed on the label, e.g. "Cotton", "Merino wool". */
  material: string;
  /** Percentage of the blend. All entries for one garment sum to 100. */
  percent: number;
}

/** One dated observation about how the piece has aged. */
export interface GarmentAging {
  /** YYYY-MM or YYYY-MM-DD. */
  date: string;
  note: string;
}

export interface Garment {
  fit: GarmentFit;
  /** Size as labelled, e.g. "M", "32x32", "40 EU". Sizes are not universal. */
  size: string;
  /** Optional note on how the labelled size actually ran. */
  sizeNote?: string;
  fabric: GarmentFabric[];
  care: GarmentCareCode[];
  season: GarmentSeason[];
  /** YYYY-MM or YYYY-MM-DD. Anchors months owned and cost per wear. */
  firstWorn: string;
  /** Honest estimate. Cost per wear is only shown when this is set. */
  wearsPerMonth?: number;
  condition: GarmentCondition;
  aging: GarmentAging[];
}

