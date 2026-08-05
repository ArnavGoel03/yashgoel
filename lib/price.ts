import type { RegionalPrice } from "./types";
import type { Region } from "./retailers";

type PriceField = string | RegionalPrice | undefined;

/**
 * Helpers around the multi-region price field. The MDX schema accepts
 * a price as either a legacy string (`"$34"`, treated as USD) or an
 * object keyed by region (`{ in?, us?, uk? }`). Everything in the UI
 * should go through these so the legacy form keeps working while we
 * migrate, and so we never accidentally show a USD price next to an
 * Amazon-IN buy button.
 */

function isRegional(p: PriceField): p is RegionalPrice {
  return typeof p === "object" && p !== null;
}

/**
 * Price for a specific region, or undefined if not entered.
 * Legacy strings are treated as USD (the historical default).
 */
export function priceFor(p: PriceField, region: Region): string | undefined {
  if (!p) return undefined;
  if (typeof p === "string") return region === "usa" ? p : undefined;
  if (region === "india") return p.in;
  if (region === "uk") return p.uk;
  return p.us;
}

/**
 * Best single price to use when only one is needed (OG image,
 * structured data, cost-per-day fallback). Prefers US, then any
 * available region in display order.
 */
export function defaultPrice(p: PriceField): string | undefined {
  if (!p) return undefined;
  if (typeof p === "string") return p;
  return p.us ?? p.in ?? p.uk;
}

/**
 * All prices, in display order (IN → US → UK). Each entry knows its
 * region so the UI can label or color it. Empty array when no price
 * data exists.
 */
export function pricesByRegion(
  p: PriceField,
): Array<{ region: Region; value: string }> {
  if (!p) return [];
  if (typeof p === "string") return [{ region: "usa", value: p }];
  const out: Array<{ region: Region; value: string }> = [];
  if (p.in) out.push({ region: "india", value: p.in });
  if (p.us) out.push({ region: "usa", value: p.us });
  if (p.uk) out.push({ region: "uk", value: p.uk });
  return out;
}

/**
 * Short label shown next to a price ("IN" / "US" / "UK"). Kept
 * separate from REGION_NAME (which uses "India" / "USA" / "UK") so
 * the inline price display can be tight.
 */
export const REGION_TAG: Record<Region, string> = {
  india: "IN",
  usa: "US",
  uk: "UK",
};

/**
 * Split a stored price string into its currency prefix and its amount,
 * e.g. "₹2,400" to { symbol: "₹", amount: 2400 }. Prices are stored as
 * display strings with the native symbol baked in, so any derived
 * figure (cost per wear, cost per day) has to re-emit the same symbol
 * rather than look one up, which would be a second source of truth for
 * currency. Returns null for anything without a parseable number.
 */
export function splitPrice(
  value: string | undefined,
): { symbol: string; amount: number } | null {
  if (!value) return null;
  const m = value.trim().match(/^([^\d]*)([\d.,]+)/);
  if (!m) return null;
  const amount = Number(m[2].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { symbol: m[1].trim(), amount };
}

/**
 * Re-emit an amount with the same currency prefix it was parsed from.
 * Sub-10 values keep one decimal so a cheap-per-wear figure doesn't
 * round to a misleading whole number.
 */
export function formatDerivedPrice(symbol: string, amount: number): string {
  const rounded =
    amount >= 10 ? Math.round(amount).toLocaleString("en-IN") : amount.toFixed(1);
  return `${symbol}${rounded}`;
}

export function hasAnyPrice(p: PriceField): boolean {
  if (!p) return false;
  if (typeof p === "string") return p.trim().length > 0;
  return Boolean(p.in || p.us || p.uk);
}

export { isRegional };
