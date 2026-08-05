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

/* ---------------------------- care ------------------------------- *
 *
 * Two standards write the world's care labels, and they mostly agree.
 *
 *  - ISO 3758, published in Europe by GINETEX. This is what you find
 *    on clothing sold in India, the UK and the EU, and on most of what
 *    is made in Asia for those markets.
 *  - ASTM D5489, the American set. Same five base shapes, one real
 *    difference: it prints wash and dry temperatures as dots where
 *    GINETEX prints a number.
 *
 * A code below is an *instruction*, not a drawing. Where the two
 * standards draw the same instruction differently, both drawings are
 * rendered side by side (see CARE_GLYPH_ASTM in garment-icons) and
 * GARMENT_CARE_REGIONS records who actually prints it.
 *
 * Add a code here, its label, its regions, its family and its glyph.
 * All five are exhaustive Records or a covered-once test, so a missing
 * one fails the build rather than shipping a blank square.
 * ------------------------------------------------------------------ */

/** The markets a symbol is actually printed in. */
export const GARMENT_CARE_REGION_CODES = ["IN", "UK", "EU", "US"] as const;
export type GarmentCareRegion = (typeof GARMENT_CARE_REGION_CODES)[number];

export const GARMENT_CARE_REGION_LABEL: Record<GarmentCareRegion, string> = {
  IN: "India",
  UK: "United Kingdom",
  EU: "European Union",
  US: "United States",
};

/** ISO 3758 / GINETEX territory. */
const GINETEX: readonly GarmentCareRegion[] = ["IN", "UK", "EU"];
/** ASTM D5489 territory. */
const ASTM: readonly GarmentCareRegion[] = ["US"];
/** Printed under both standards, so it turns up on any label. */
const EVERYWHERE: readonly GarmentCareRegion[] = ["IN", "UK", "EU", "US"];

export const GARMENT_CARE_STANDARD_LABEL = {
  iso: "ISO 3758 / GINETEX",
  astm: "ASTM D5489",
} as const;

export const GARMENT_CARE_CODES = [
  // Washing, the tub.
  "machine-wash-cold",
  "machine-wash-warm",
  "machine-wash-50",
  "machine-wash-hot",
  "machine-wash-70",
  "machine-wash-very-hot",
  "machine-wash-permanent-press",
  "machine-wash-gentle",
  "hand-wash",
  "do-not-wash",
  "do-not-wring",

  // Bleaching, the triangle.
  "bleach-any",
  "bleach-non-chlorine",
  "do-not-bleach",

  // Tumble drying, a circle inside the square.
  "tumble-dry-any",
  "tumble-dry-no-heat",
  "tumble-dry-low",
  "tumble-dry-medium",
  "tumble-dry-high",
  "tumble-dry-permanent-press",
  "tumble-dry-gentle",
  "do-not-tumble-dry",

  // Natural drying, the square.
  "line-dry",
  "drip-dry",
  "flat-dry",
  "line-dry-shade",
  "drip-dry-shade",
  "flat-dry-shade",

  // Ironing.
  "iron-low",
  "iron-medium",
  "iron-high",
  "iron-no-steam",
  "do-not-iron",

  // Professional care, the circle.
  "dry-clean",
  "dry-clean-p",
  "dry-clean-p-gentle",
  "dry-clean-f",
  "dry-clean-f-gentle",
  "do-not-dry-clean",
  "wet-clean",
  "wet-clean-gentle",
  "do-not-wet-clean",
] as const;
export type GarmentCareCode = (typeof GARMENT_CARE_CODES)[number];

export const GARMENT_CARE_LABEL: Record<GarmentCareCode, string> = {
  "machine-wash-cold": "Machine wash cold, 30C",
  "machine-wash-warm": "Machine wash warm, 40C",
  "machine-wash-50": "Machine wash 50C",
  "machine-wash-hot": "Machine wash hot, 60C",
  "machine-wash-70": "Machine wash 70C",
  "machine-wash-very-hot": "Machine wash very hot, 95C",
  "machine-wash-permanent-press": "Machine wash, permanent press",
  "machine-wash-gentle": "Machine wash, gentle cycle",
  "hand-wash": "Hand wash only",
  "do-not-wash": "Do not wash",
  "do-not-wring": "Do not wring",

  "bleach-any": "Any bleach when needed",
  "bleach-non-chlorine": "Non-chlorine bleach only",
  "do-not-bleach": "Do not bleach",

  "tumble-dry-any": "Tumble dry, any heat",
  "tumble-dry-no-heat": "Tumble dry, no heat",
  "tumble-dry-low": "Tumble dry low",
  "tumble-dry-medium": "Tumble dry medium",
  "tumble-dry-high": "Tumble dry high",
  "tumble-dry-permanent-press": "Tumble dry, permanent press",
  "tumble-dry-gentle": "Tumble dry, gentle",
  "do-not-tumble-dry": "Do not tumble dry",

  "line-dry": "Line dry",
  "drip-dry": "Drip dry, do not spin",
  "flat-dry": "Dry flat",
  "line-dry-shade": "Line dry in shade",
  "drip-dry-shade": "Drip dry in shade",
  "flat-dry-shade": "Dry flat in shade",

  "iron-low": "Iron low, 110C",
  "iron-medium": "Iron medium, 150C",
  "iron-high": "Iron high, 200C",
  "iron-no-steam": "Iron, no steam",
  "do-not-iron": "Do not iron",

  "dry-clean": "Dry clean, any solvent",
  "dry-clean-p": "Dry clean, P solvents",
  "dry-clean-p-gentle": "Dry clean, P, gentle",
  "dry-clean-f": "Dry clean, F solvents",
  "dry-clean-f-gentle": "Dry clean, F, gentle",
  "do-not-dry-clean": "Do not dry clean",
  "wet-clean": "Professional wet clean",
  "wet-clean-gentle": "Professional wet clean, gentle",
  "do-not-wet-clean": "Do not wet clean",
};

/**
 * Where each symbol is actually printed. Most are in both standards, so
 * they show up on a kurta from Bengaluru and a shirt from Portland
 * alike. The interesting rows are the ones that are not: the shade
 * symbols are a GINETEX habit the Americans never adopted, and the
 * third tumble-dry dot, the air-dry circle and "do not wring" are
 * American marks with no ISO equivalent.
 */
export const GARMENT_CARE_REGIONS: Record<
  GarmentCareCode,
  readonly GarmentCareRegion[]
> = {
  "machine-wash-cold": EVERYWHERE,
  "machine-wash-warm": EVERYWHERE,
  "machine-wash-50": EVERYWHERE,
  "machine-wash-hot": EVERYWHERE,
  "machine-wash-70": EVERYWHERE,
  "machine-wash-very-hot": EVERYWHERE,
  "machine-wash-permanent-press": EVERYWHERE,
  "machine-wash-gentle": EVERYWHERE,
  "hand-wash": EVERYWHERE,
  "do-not-wash": EVERYWHERE,
  "do-not-wring": ASTM,

  "bleach-any": EVERYWHERE,
  "bleach-non-chlorine": EVERYWHERE,
  "do-not-bleach": EVERYWHERE,

  "tumble-dry-any": EVERYWHERE,
  "tumble-dry-no-heat": ASTM,
  "tumble-dry-low": EVERYWHERE,
  "tumble-dry-medium": EVERYWHERE,
  "tumble-dry-high": ASTM,
  "tumble-dry-permanent-press": EVERYWHERE,
  "tumble-dry-gentle": EVERYWHERE,
  "do-not-tumble-dry": EVERYWHERE,

  "line-dry": EVERYWHERE,
  "drip-dry": EVERYWHERE,
  "flat-dry": EVERYWHERE,
  "line-dry-shade": GINETEX,
  "drip-dry-shade": GINETEX,
  "flat-dry-shade": GINETEX,

  "iron-low": EVERYWHERE,
  "iron-medium": EVERYWHERE,
  "iron-high": EVERYWHERE,
  "iron-no-steam": EVERYWHERE,
  "do-not-iron": EVERYWHERE,

  "dry-clean": EVERYWHERE,
  "dry-clean-p": EVERYWHERE,
  "dry-clean-p-gentle": EVERYWHERE,
  "dry-clean-f": EVERYWHERE,
  "dry-clean-f-gentle": EVERYWHERE,
  "do-not-dry-clean": EVERYWHERE,
  "wet-clean": EVERYWHERE,
  "wet-clean-gentle": EVERYWHERE,
  "do-not-wet-clean": EVERYWHERE,
};

/**
 * Notes for the rows where the two standards disagree about the
 * drawing or the meaning, rather than about the instruction. Absent
 * for the majority, which are drawn identically everywhere.
 */
export const GARMENT_CARE_REGION_NOTE: Partial<
  Record<GarmentCareCode, string>
> = {
  "machine-wash-cold": "Number in India, UK and EU; one dot in the US",
  "machine-wash-warm": "Number in India, UK and EU; two dots in the US",
  "machine-wash-50": "Number in India, UK and EU; three dots in the US",
  "machine-wash-hot": "Number in India, UK and EU; four dots in the US",
  "machine-wash-70": "Number in India, UK and EU; five dots in the US",
  "machine-wash-very-hot": "Number in India, UK and EU; six dots in the US",
  "tumble-dry-medium": "Two dots means normal heat under ISO, medium under ASTM",
  "drip-dry": "Two strokes under ISO, three under ASTM",
  "do-not-wring": "Withdrawn from ISO 3758, still printed on US labels",
};

/** Short forms, for the tiny type under a symbol. */
export const GARMENT_CARE_REGION_SHORT: Record<GarmentCareRegion, string> = {
  IN: "India",
  UK: "UK",
  EU: "EU",
  US: "US",
};

/** True when a symbol is not printed in every market listed here. */
export function isRegionSpecific(code: GarmentCareCode): boolean {
  return GARMENT_CARE_REGIONS[code].length < GARMENT_CARE_REGION_CODES.length;
}

/** "US only", "India, UK and EU", or "" when it is printed everywhere. */
export function careRegionSummary(code: GarmentCareCode): string {
  const regions = GARMENT_CARE_REGIONS[code];
  if (!isRegionSpecific(code)) return "";
  const names = regions.map((r) => GARMENT_CARE_REGION_SHORT[r]);
  if (names.length === 1) return `${names[0]} only`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** The region line shown under a symbol, or "" when there is nothing to say. */
export function careRegionDetail(code: GarmentCareCode): string {
  return GARMENT_CARE_REGION_NOTE[code] ?? careRegionSummary(code);
}

/**
 * The six symbol families, in the order they appear on a label and in
 * the order you actually do them. Every code belongs to exactly one,
 * which tests/garment.test.ts enforces.
 */
export const GARMENT_CARE_FAMILIES = [
  {
    key: "wash",
    label: "Washing",
    note: "The tub. A number is the maximum temperature; bars under it mean a slower, gentler cycle.",
    codes: [
      "machine-wash-cold",
      "machine-wash-warm",
      "machine-wash-50",
      "machine-wash-hot",
      "machine-wash-70",
      "machine-wash-very-hot",
      "machine-wash-permanent-press",
      "machine-wash-gentle",
      "hand-wash",
      "do-not-wash",
      "do-not-wring",
    ],
  },
  {
    key: "bleach",
    label: "Bleaching",
    note: "The triangle. Two diagonal strokes inside mean oxygen bleach only, never chlorine.",
    codes: ["bleach-any", "bleach-non-chlorine", "do-not-bleach"],
  },
  {
    key: "tumble",
    label: "Tumble drying",
    note: "A circle in the square. Dots are heat, bars are cycle, a filled circle is no heat at all.",
    codes: [
      "tumble-dry-any",
      "tumble-dry-no-heat",
      "tumble-dry-low",
      "tumble-dry-medium",
      "tumble-dry-high",
      "tumble-dry-permanent-press",
      "tumble-dry-gentle",
      "do-not-tumble-dry",
    ],
  },
  {
    key: "natural",
    label: "Natural drying",
    note: "The bare square. Vertical strokes hang it, horizontal strokes lay it flat, a corner stroke keeps it out of the sun.",
    codes: [
      "line-dry",
      "drip-dry",
      "flat-dry",
      "line-dry-shade",
      "drip-dry-shade",
      "flat-dry-shade",
    ],
  },
  {
    key: "iron",
    label: "Ironing",
    note: "Dots are the plate temperature, one through three. Crossed steam means dry iron only.",
    codes: [
      "iron-low",
      "iron-medium",
      "iron-high",
      "iron-no-steam",
      "do-not-iron",
    ],
  },
  {
    key: "professional",
    label: "Professional care",
    note: "The circle, addressed to the cleaner rather than to you. P and F are solvent classes; W is water.",
    codes: [
      "dry-clean",
      "dry-clean-p",
      "dry-clean-p-gentle",
      "dry-clean-f",
      "dry-clean-f-gentle",
      "do-not-dry-clean",
      "wet-clean",
      "wet-clean-gentle",
      "do-not-wet-clean",
    ],
  },
] as const satisfies readonly {
  key: string;
  label: string;
  note: string;
  codes: readonly GarmentCareCode[];
}[];

export type GarmentCareFamily = (typeof GARMENT_CARE_FAMILIES)[number]["key"];

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

