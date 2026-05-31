import { INDIA_HOSTS, UK_HOSTS, USA_HOSTS } from "./retailers";

/**
 * Wraps every outbound buy link in the appropriate affiliate program
 * the moment its env var is set in Vercel. Two-mechanism design:
 *
 *   1. Amazon tags. Each marketplace (com / in / co.uk) takes a ?tag=
 *      query param. We inject it directly when the corresponding
 *      AMAZON_*_TAG env var exists.
 *
 *   2. Aggregator templates. Cuelinks / EarnKaro / Skimlinks / Sovrn /
 *      RewardStyle all wrap arbitrary retailer URLs with their own
 *      redirector. The site stores the template per region:
 *        INDIA_AFFILIATE_TEMPLATE   = "https://linksredirect.com/?…&url={url}"
 *        WESTERN_AFFILIATE_TEMPLATE = "https://go.skimresources.com/?…&url={url}"
 *        UK_AFFILIATE_TEMPLATE      = "https://go.skimresources.com/?…&url={url}"
 *      `{url}` in the template is replaced by the URL-encoded original
 *      destination.
 *
 * If no env var is set for a host, the original URL passes through
 * unchanged — so the site is shippable today and only starts earning
 * once the program is approved and the env var lands.
 *
 * The retailer-host source of truth lives in `lib/retailers.ts`
 * (INDIA_HOSTS / USA_HOSTS / UK_HOSTS). Importing them here keeps the
 * affiliate map and the region detection in lockstep — adding a new
 * retailer to the listing automatically extends affiliate coverage.
 */

function withAmazonTag(url: string, tag: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("tag", tag);
    return u.toString();
  } catch {
    return url;
  }
}

function withTemplate(url: string, template: string): string {
  if (!template.includes("{url}")) return url;
  return template.replace("{url}", encodeURIComponent(url));
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function hostMatches(host: string, list: readonly string[]): boolean {
  return list.some((h) => host === h || host.endsWith(`.${h}`));
}

export function affiliatize(rawUrl: string | undefined | null): string | undefined {
  if (!rawUrl) return rawUrl ?? undefined;
  const host = hostOf(rawUrl);
  if (!host) return rawUrl;

  // Amazon: native ?tag= injection per marketplace. `a.co` and
  // `amzn.to` are Amazon US short links that redirect to a /dp/ page on
  // amazon.com, so they take the US tag.
  if (
    host === "amazon.com" ||
    host.endsWith(".amazon.com") ||
    host === "amzn.to" ||
    host === "a.co"
  ) {
    const tag = process.env.AMAZON_US_TAG;
    if (tag) return withAmazonTag(rawUrl, tag);
    return rawUrl;
  }
  if (host === "amazon.in" || host.endsWith(".amazon.in")) {
    const tag = process.env.AMAZON_IN_TAG;
    if (tag) return withAmazonTag(rawUrl, tag);
    return rawUrl;
  }
  if (host === "amazon.co.uk" || host.endsWith(".amazon.co.uk")) {
    const tag = process.env.AMAZON_UK_TAG;
    if (tag) return withAmazonTag(rawUrl, tag);
    return rawUrl;
  }

  // Non-Amazon retailers route through their region's aggregator
  // template. INDIA / USA / UK host lists come straight from
  // `lib/retailers.ts` so adding a retailer there auto-extends
  // affiliate coverage here.
  if (hostMatches(host, INDIA_HOSTS)) {
    const template = process.env.INDIA_AFFILIATE_TEMPLATE;
    if (template) return withTemplate(rawUrl, template);
    return rawUrl;
  }
  if (hostMatches(host, USA_HOSTS)) {
    const template = process.env.WESTERN_AFFILIATE_TEMPLATE;
    if (template) return withTemplate(rawUrl, template);
    return rawUrl;
  }
  if (hostMatches(host, UK_HOSTS)) {
    const template = process.env.UK_AFFILIATE_TEMPLATE;
    if (template) return withTemplate(rawUrl, template);
    return rawUrl;
  }

  return rawUrl;
}

export function isAffiliated(rawUrl: string): boolean {
  return affiliatize(rawUrl) !== rawUrl;
}
