/**
 * Knowledge table of UV filters used in sunscreen sold globally.
 *
 * `type`        organic = "chemical" filter (carbon-based, absorbs UV);
 *               inorganic = "mineral" filter (metal oxide, scatters/absorbs UV).
 *
 * `generation`  modern = post-2000 photostable filters (Tinosorbs, Uvinuls,
 *               Mexoryls, ZinClear, etc.) , broad-spectrum, photostable, used
 *               widely in EU / Asia / Australia / India.
 *               legacy = pre-2000 filters (Avobenzone, Octocrylene, Homosalate,
 *               Octinoxate, Oxybenzone) , still the bulk of US-market
 *               sunscreens because the FDA hasn't approved the modern filters.
 *
 * `coverage`    which part of the UV spectrum the filter blocks.
 *               UVB ≈ 280-315 nm (burning), UVA-II ≈ 315-340 nm,
 *               UVA-I ≈ 340-400 nm (deepest penetration, photoaging).
 *
 * Filters that are commonly seen on the back of a tube but NOT in this table
 * should be added here when first encountered, not invented inline.
 */
export type UVFilter = {
  /** INCI name as it appears on the label (canonical). */
  inci: string;
  /** Common alias / brand name (Tinosorb S, Mexoryl XL, …) for reading copy. */
  alias?: string;
  type: "organic" | "inorganic";
  generation: "modern" | "legacy";
  /** Which part of UV the filter primarily covers. */
  coverage: ("UVB" | "UVA-II" | "UVA-I")[];
  /** One-line plain-English note about the filter , what's distinctive. */
  note: string;
  /** Markets where the filter is widely approved at writing time. */
  approvedIn: ("US" | "EU" | "IN" | "UK" | "AU" | "JP" | "KR")[];
};

const FILTERS: UVFilter[] = [
  // ── Modern (post-2000) organic filters ──────────────────────────
  {
    inci: "Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine",
    alias: "Tinosorb S",
    type: "organic",
    generation: "modern",
    coverage: ["UVB", "UVA-II", "UVA-I"],
    note: "Broad-spectrum, photostable, stabilises Avobenzone. EU/IN staple, not US-approved.",
    approvedIn: ["EU", "IN", "UK", "AU", "JP", "KR"],
  },
  {
    inci: "Methylene Bis-Benzotriazolyl Tetramethylbutylphenol",
    alias: "Tinosorb M",
    type: "organic",
    generation: "modern",
    coverage: ["UVB", "UVA-II", "UVA-I"],
    note: "Hybrid filter — partly absorbs, partly scatters. Broad-spectrum, very photostable.",
    approvedIn: ["EU", "IN", "UK", "AU", "JP", "KR"],
  },
  {
    inci: "Diethylamino Hydroxybenzoyl Hexyl Benzoate",
    alias: "Uvinul A Plus",
    type: "organic",
    generation: "modern",
    coverage: ["UVA-I"],
    note: "Strong long-UVA absorber — the kind of filter that earns a high PA rating.",
    approvedIn: ["EU", "IN", "UK", "AU", "JP", "KR"],
  },
  {
    inci: "Ethylhexyl Triazone",
    alias: "Uvinul T 150",
    type: "organic",
    generation: "modern",
    coverage: ["UVB"],
    note: "High-efficacy UVB filter, photostable. Lets formulators hit high SPF without overload.",
    approvedIn: ["EU", "IN", "UK", "AU", "JP", "KR"],
  },
  {
    inci: "Diethylhexyl Butamido Triazone",
    alias: "Iscotrizinol / Uvasorb HEB",
    type: "organic",
    generation: "modern",
    coverage: ["UVB", "UVA-II"],
    note: "Photostable, oil-soluble, frequently paired with Tinosorbs.",
    approvedIn: ["EU", "IN", "UK", "JP", "KR"],
  },
  {
    inci: "Drometrizole Trisiloxane",
    alias: "Mexoryl XL",
    type: "organic",
    generation: "modern",
    coverage: ["UVB", "UVA-II", "UVA-I"],
    note: "L'Oréal-patented broad-spectrum filter. Anthelios EU/IN versions, not the US melt-in-milk.",
    approvedIn: ["EU", "IN", "UK", "AU", "JP", "KR"],
  },
  {
    inci: "Terephthalylidene Dicamphor Sulfonic Acid",
    alias: "Mexoryl SX / Ecamsule",
    type: "organic",
    generation: "modern",
    coverage: ["UVA-II", "UVA-I"],
    note: "Water-soluble L'Oréal filter. UVA-I coverage was rare when it launched in 1993.",
    approvedIn: ["EU", "IN", "UK", "AU", "JP", "KR", "US"],
  },

  // ── Legacy (pre-2000) organic filters , still the US backbone ───
  {
    inci: "Butyl Methoxydibenzoylmethane",
    alias: "Avobenzone / Parsol 1789",
    type: "organic",
    generation: "legacy",
    coverage: ["UVA-I"],
    note: "Workhorse UVA-I filter, but photodegrades unless paired with a stabiliser (Octocrylene, Tinosorb S).",
    approvedIn: ["US", "EU", "IN", "UK", "AU", "JP", "KR"],
  },
  {
    inci: "Octocrylene",
    type: "organic",
    generation: "legacy",
    coverage: ["UVB", "UVA-II"],
    note: "Photostabilises Avobenzone. Storage-degrades into benzophenone over time, hence the EU restriction discussion.",
    approvedIn: ["US", "EU", "IN", "UK", "AU", "JP", "KR"],
  },
  {
    inci: "Homosalate",
    type: "organic",
    generation: "legacy",
    coverage: ["UVB"],
    note: "Mid-range UVB. Common in US sport sprays. EU has lowered the allowed concentration recently.",
    approvedIn: ["US", "EU", "IN", "UK", "AU", "JP", "KR"],
  },
  {
    inci: "Ethylhexyl Salicylate",
    alias: "Octisalate",
    type: "organic",
    generation: "legacy",
    coverage: ["UVB"],
    note: "Mild UVB filter, mostly a solvent for Avobenzone in US formulas.",
    approvedIn: ["US", "EU", "IN", "UK", "AU", "JP", "KR"],
  },
  {
    inci: "Ethylhexyl Methoxycinnamate",
    alias: "Octinoxate",
    type: "organic",
    generation: "legacy",
    coverage: ["UVB"],
    note: "Strong UVB but photo-unstable on its own. Banned in Hawaii reef-safe context.",
    approvedIn: ["US", "EU", "IN", "UK", "AU", "JP", "KR"],
  },
  {
    inci: "Benzophenone-3",
    alias: "Oxybenzone",
    type: "organic",
    generation: "legacy",
    coverage: ["UVB", "UVA-II"],
    note: "Endocrine-disruption concerns; banned in Hawaii. Largely phased out of newer formulas.",
    approvedIn: ["US", "EU", "IN", "UK", "AU", "JP", "KR"],
  },

  // ── Inorganic / mineral filters ─────────────────────────────────
  {
    inci: "Titanium Dioxide",
    type: "inorganic",
    generation: "legacy",
    coverage: ["UVB", "UVA-II"],
    note: "Mineral filter. Skews UVB. White cast unless micronised; gentle, pregnancy-friendly.",
    approvedIn: ["US", "EU", "IN", "UK", "AU", "JP", "KR"],
  },
  {
    inci: "Zinc Oxide",
    type: "inorganic",
    generation: "legacy",
    coverage: ["UVB", "UVA-II", "UVA-I"],
    note: "The only single-ingredient broad-spectrum filter. Heavier finish than chemical filters at equal SPF.",
    approvedIn: ["US", "EU", "IN", "UK", "AU", "JP", "KR"],
  },
];

const BY_INCI = new Map<string, UVFilter>(
  FILTERS.map((f) => [normalize(f.inci), f]),
);
// Three entries carry more than one trade name in a single `alias` string,
// as in "Avobenzone / Parsol 1789". Indexing the whole string meant neither
// name on its own reached the filter, so a review listing Avobenzone got no
// category and no note. Each name is indexed separately; the display string
// is untouched.
const BY_ALIAS = new Map<string, UVFilter>(
  FILTERS.flatMap((f) =>
    f.alias
      ? f.alias
          .split("/")
          .map((a) => normalize(a))
          .filter(Boolean)
          .map((a) => [a, f] as const)
      : [],
  ),
);

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s-]+/g, " ").trim();
}

/**
 * Look up a filter by INCI name or alias. Case- and dash-insensitive, and
 * tolerant of a trailing concentration.
 *
 * Some entries carry the strength the author read off the bottle, as in
 * "Octocrylene 10%". That is his data and it stays on screen; it just is
 * not part of the INCI name, so it is trimmed before the lookup. Without
 * this, every filter on the Anthelios SPF 100 entry missed the registry
 * and rendered with no category and no note.
 */
export function findUVFilter(name: string): UVFilter | null {
  const k = normalize(name.replace(/\s*\d+(?:\.\d+)?\s*%\s*$/, ""));
  return BY_INCI.get(k) ?? BY_ALIAS.get(k) ?? null;
}

/** All filters as a stable, sortable list (organic first, then inorganic). */
export function allUVFilters(): UVFilter[] {
  return FILTERS;
}
