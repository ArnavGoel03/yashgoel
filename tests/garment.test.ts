import { describe, expect, it } from "vitest";

import {
  agingElapsedLabel,
  costPerWear,
  estimatedWears,
  monthsBetween,
  monthsOwned,
  ownedLabel,
  parseWearDate,
  seasonMonths,
} from "@/lib/garment";
import {
  careRegionDetail,
  careRegionSummary,
  GARMENT_CARE_CODES,
  GARMENT_CARE_FAMILIES,
  GARMENT_CARE_LABEL,
  GARMENT_CARE_REGION_CODES,
  GARMENT_CARE_REGION_NOTE,
  GARMENT_CARE_REGIONS,
  GARMENT_SEASONS,
  isRegionSpecific,
} from "@/lib/garment-types";
import type { Garment } from "@/lib/garment-types";

const NOW = Date.UTC(2026, 7, 5); // 2026-08-05

function garment(overrides: Partial<Garment> = {}): Garment {
  return {
    fit: "regular",
    size: "M",
    fabric: [{ material: "Cotton", percent: 100 }],
    care: [],
    season: [],
    firstWorn: "2026-02",
    condition: "worn-in",
    aging: [],
    ...overrides,
  };
}

describe("parseWearDate", () => {
  it("accepts month and day precision", () => {
    expect(parseWearDate("2026-02")?.toISOString()).toBe(
      "2026-02-01T00:00:00.000Z",
    );
    expect(parseWearDate("2026-02-14")?.toISOString()).toBe(
      "2026-02-14T00:00:00.000Z",
    );
  });

  it("rejects malformed input", () => {
    for (const bad of ["", "2026", "26-02", "2026-13", "yesterday"]) {
      expect(parseWearDate(bad), bad).toBeNull();
    }
  });
});

describe("monthsOwned", () => {
  it("counts whole months only", () => {
    expect(monthsOwned("2026-02", NOW)).toBe(6);
    expect(monthsOwned("2026-08", NOW)).toBe(0);
  });

  it("does not credit a month that has not completed", () => {
    // 2026-07-20 to 2026-08-05 is not a full month.
    expect(monthsOwned("2026-07-20", NOW)).toBe(0);
    expect(monthsOwned("2026-07-05", NOW)).toBe(1);
  });

  it("clamps future dates to zero rather than going negative", () => {
    expect(monthsOwned("2027-01", NOW)).toBe(0);
  });

  it("returns null for an unparseable date", () => {
    expect(monthsOwned("soon", NOW)).toBeNull();
  });
});

describe("monthsBetween", () => {
  it("measures the aging log against the first wear", () => {
    expect(monthsBetween("2026-02", "2026-06")).toBe(4);
    expect(monthsBetween("2026-02", "2026-02")).toBe(0);
    expect(monthsBetween("2026-06", "2026-02")).toBe(0);
    expect(monthsBetween("2026-02", "nope")).toBeNull();
  });
});

describe("estimatedWears", () => {
  it("stays null without a stated wear rate", () => {
    expect(estimatedWears(garment(), NOW)).toBeNull();
  });

  it("multiplies the rate by months owned", () => {
    expect(estimatedWears(garment({ wearsPerMonth: 8 }), NOW)).toBe(48);
  });

  it("counts the first month even before it completes", () => {
    expect(
      estimatedWears(garment({ firstWorn: "2026-08", wearsPerMonth: 4 }), NOW),
    ).toBe(4);
  });
});

describe("costPerWear", () => {
  it("divides each regional price by the wear estimate", () => {
    const g = garment({ wearsPerMonth: 8 }); // 48 wears
    expect(costPerWear({ in: "₹4,800", us: "$96" }, g, NOW)).toEqual([
      { region: "india", value: "₹100" },
      { region: "usa", value: "$2.0" },
    ]);
  });

  it("is empty without a price or without a wear rate", () => {
    expect(costPerWear(undefined, garment({ wearsPerMonth: 8 }), NOW)).toEqual(
      [],
    );
    expect(costPerWear({ in: "₹4,800" }, garment(), NOW)).toEqual([]);
  });

  it("skips prices it cannot parse instead of printing NaN", () => {
    expect(
      costPerWear({ in: "gifted" }, garment({ wearsPerMonth: 8 }), NOW),
    ).toEqual([]);
  });
});

describe("labels", () => {
  it("reads naturally at every span", () => {
    expect(ownedLabel(0)).toBe("New this month");
    expect(ownedLabel(1)).toBe("1 month");
    expect(ownedLabel(9)).toBe("9 months");
    expect(ownedLabel(24)).toBe("2 years");
    expect(ownedLabel(25)).toBe("2 years, 1 month");
  });

  it("dates the aging log relative to the first wear", () => {
    expect(agingElapsedLabel("2026-02", "2026-02")).toBe("First month");
    expect(agingElapsedLabel("2026-02", "2026-03")).toBe("After 1 month");
    expect(agingElapsedLabel("2026-02", "2026-07")).toBe("After 5 months");
  });
});

describe("seasonMonths", () => {
  it("unions overlapping seasons", () => {
    expect([...seasonMonths(["summer", "monsoon"])].sort((a, b) => a - b)).toEqual(
      [2, 3, 4, 5, 6, 7, 8],
    );
  });

  it("covers all twelve months across the season set", () => {
    const covered = seasonMonths([...GARMENT_SEASONS]);
    expect(covered.size).toBe(12);
  });

  it("is empty when no season is declared", () => {
    expect(seasonMonths([]).size).toBe(0);
  });
});

describe("care vocabulary", () => {
  it("gives every code a non-empty label", () => {
    const missing = GARMENT_CARE_CODES.filter(
      (code) => !GARMENT_CARE_LABEL[code]?.trim(),
    );
    expect(missing).toEqual([]);
  });

  it("sorts every code into exactly one family", () => {
    const seen = GARMENT_CARE_FAMILIES.flatMap((f) => f.codes);
    expect([...seen].sort()).toEqual([...GARMENT_CARE_CODES].sort());
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("prints every code in at least one real market", () => {
    const valid = new Set<string>(GARMENT_CARE_REGION_CODES);
    for (const code of GARMENT_CARE_CODES) {
      const regions = GARMENT_CARE_REGIONS[code];
      expect(regions.length, code).toBeGreaterThan(0);
      expect(regions.every((r) => valid.has(r)), code).toBe(true);
      expect(new Set(regions).size, code).toBe(regions.length);
    }
  });

  it("stays silent about region when a symbol is universal", () => {
    expect(isRegionSpecific("do-not-bleach")).toBe(false);
    expect(careRegionSummary("do-not-bleach")).toBe("");
  });

  it("names the market when a symbol is not universal", () => {
    expect(careRegionSummary("tumble-dry-high")).toBe("US only");
    expect(careRegionSummary("line-dry-shade")).toBe("India, UK and EU");
  });

  it("prefers the divergence note over the bare region list", () => {
    expect(careRegionDetail("machine-wash-cold")).toContain("one dot in the US");
    expect(careRegionDetail("tumble-dry-high")).toBe("US only");
    expect(careRegionDetail("do-not-bleach")).toBe("");
  });

  it("only annotates codes that exist", () => {
    const codes = new Set<string>(GARMENT_CARE_CODES);
    for (const code of Object.keys(GARMENT_CARE_REGION_NOTE)) {
      expect(codes.has(code), code).toBe(true);
    }
  });
});
