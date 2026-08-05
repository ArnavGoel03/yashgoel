import { formatDerivedPrice, pricesByRegion, splitPrice } from "./price";
import { GARMENT_SEASON_MONTHS } from "./garment-types";
import type { RegionalPrice } from "./types";
import type { Garment, GarmentSeason } from "./garment-types";
import type { Region } from "./retailers";

/**
 * Derived garment figures. Nothing here is stored in frontmatter: how
 * long a piece has been owned, how many wears that adds up to, and what
 * each wear cost are all computed from `firstWorn`, `wearsPerMonth` and
 * the existing `price` field. Storing them would mean a number that
 * silently goes stale the day after it is written.
 */

// Snapshot at module load, same reason as lib/content.ts: reading the
// clock during render trips Next 16's cacheComponents prerender guard.
// Per-deploy granularity is right for a figure measured in months.
const BUILD_NOW_MS = Date.now();

/** Parse "YYYY-MM" or "YYYY-MM-DD" as UTC. Returns null if malformed. */
export function parseWearDate(value: string): Date | null {
  const m = value.trim().match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = m[3] ? Number(m[3]) : 1;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

/** Whole months between two wear dates. Negative spans clamp to 0. */
export function monthsBetween(from: string, to: string): number | null {
  const a = parseWearDate(from);
  const b = parseWearDate(to);
  if (!a || !b) return null;
  const months =
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    (b.getUTCMonth() - a.getUTCMonth()) -
    (b.getUTCDate() < a.getUTCDate() ? 1 : 0);
  return Math.max(0, months);
}

/** Whole months since the first wear, as of the current deploy. */
export function monthsOwned(
  firstWorn: string,
  nowMs: number = BUILD_NOW_MS,
): number | null {
  const start = parseWearDate(firstWorn);
  if (!start) return null;
  const now = new Date(nowMs);
  const months =
    (now.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - start.getUTCMonth()) -
    (now.getUTCDate() < start.getUTCDate() ? 1 : 0);
  return Math.max(0, months);
}

/**
 * Estimated total wears so far. Null unless `wearsPerMonth` is set,
 * because an unstated wear rate is not a number worth guessing.
 */
export function estimatedWears(
  garment: Garment,
  nowMs: number = BUILD_NOW_MS,
): number | null {
  if (typeof garment.wearsPerMonth !== "number") return null;
  const months = monthsOwned(garment.firstWorn, nowMs);
  if (months === null) return null;
  // A piece worn once in its first fortnight has 0 whole months owned
  // but is not 0 wears, so the first month always counts.
  return Math.round(Math.max(1, months) * garment.wearsPerMonth);
}

/**
 * Cost per wear, per region, using the same price strings the buy
 * panel shows. Empty when there is no price or no wear estimate.
 */
export function costPerWear(
  price: string | RegionalPrice | undefined,
  garment: Garment,
  nowMs: number = BUILD_NOW_MS,
): Array<{ region: Region; value: string }> {
  const wears = estimatedWears(garment, nowMs);
  if (!wears || wears <= 0) return [];
  const out: Array<{ region: Region; value: string }> = [];
  for (const entry of pricesByRegion(price)) {
    const parsed = splitPrice(entry.value);
    if (!parsed) continue;
    out.push({
      region: entry.region,
      value: formatDerivedPrice(parsed.symbol, parsed.amount / wears),
    });
  }
  return out;
}

/** "8 months" / "1 month" / "New this month". */
export function ownedLabel(months: number | null): string {
  if (months === null) return "";
  if (months <= 0) return "New this month";
  if (months === 1) return "1 month";
  if (months < 24) return `${months} months`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0
    ? `${years} years`
    : `${years} years, ${rest} month${rest === 1 ? "" : "s"}`;
}

/** "After 5 months" label for one aging-log entry. */
export function agingElapsedLabel(firstWorn: string, date: string): string {
  const months = monthsBetween(firstWorn, date);
  if (months === null) return "";
  if (months <= 0) return "First month";
  return `After ${months} month${months === 1 ? "" : "s"}`;
}

/** Month indexes (0 = January) covered by a set of seasons. */
export function seasonMonths(seasons: GarmentSeason[]): Set<number> {
  const out = new Set<number>();
  for (const season of seasons) {
    for (const month of GARMENT_SEASON_MONTHS[season]) out.add(month);
  }
  return out;
}

/** Single-letter month scale for the wearable-window strip. */
export const MONTH_INITIALS = [
  "J",
  "F",
  "M",
  "A",
  "M",
  "J",
  "J",
  "A",
  "S",
  "O",
  "N",
  "D",
] as const;

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
