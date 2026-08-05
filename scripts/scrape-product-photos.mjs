#!/usr/bin/env node
/**
 * Best-effort scraper that fills in `photo:` for any review missing
 * one. Strategy per product:
 *
 *   1. Walk the retailer URLs in the MDX (boughtFromUrl, then
 *      western/india/uk links) and try og:image on each.
 *   2. If that fails, fall back to DuckDuckGo HTML search with
 *      progressively-broadening queries (Nykaa, iHerb, brand+name
 *      open) and try og:image on the first result.
 *
 * Sites that block scrapers (Amazon especially) silently fail and the
 * next URL is tried. Per-product summary printed at the end.
 *
 *   node scripts/scrape-product-photos.mjs
 */

import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC_PRODUCTS_DIR = join(REPO_ROOT, "public", "products");
// Mirror of KINDS in lib/types.ts. This file is plain .mjs run by node
// with no TS pipeline, so it cannot import the const; keep the two in
// step when a kind is added (tests/data-integrity.test.ts will not
// catch a drift here, it only guards the app routes).
const KINDS = [
  "skincare",
  "supplements",
  "oral-care",
  "hair-care",
  "body-care",
  "essentials",
  "miscellaneous",
  "fashion",
];

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const FETCH_HEADERS = {
  "User-Agent": UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};
const FETCH_TIMEOUT_MS = 15000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

if (!existsSync(PUBLIC_PRODUCTS_DIR))
  mkdirSync(PUBLIC_PRODUCTS_DIR, { recursive: true });

function readFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { fm: "", body: src, hasFm: false };
  return { fm: m[1], body: src.slice(m[0].length), hasFm: true, raw: m[0] };
}

function frontmatterHas(fm, key) {
  return new RegExp(`^${key}\\s*:`, "m").test(fm);
}

function getString(fm, key) {
  const m = fm.match(new RegExp(`^${key}\\s*:\\s*"?([^"\\n]+)"?\\s*$`, "m"));
  return m ? m[1].trim() : null;
}

function getLinkUrls(fm, key) {
  const re = new RegExp(`^${key}\\s*:\\s*\\n((?:\\s+-\\s.*\\n?)+)`, "m");
  const blockMatch = fm.match(re);
  if (!blockMatch) return [];
  const block = blockMatch[1];
  const urls = [];
  for (const line of block.split("\n")) {
    const u = line.match(/url\s*:\s*"?([^"\s]+)"?/);
    if (u) urls.push(u[1]);
  }
  return urls;
}

function pickContentTypeExt(contentType) {
  if (!contentType) return null;
  const t = contentType.split(";")[0].trim().toLowerCase();
  switch (t) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/avif":
      return ".avif";
    case "image/gif":
      return ".gif";
    default:
      return null;
  }
}

function extractMeta(html, prop) {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${prop}["']`,
      "i",
    ),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return null;
}

async function scrapeOgImage(pageUrl, brandHint) {
  let res;
  try {
    res = await fetchWithTimeout(pageUrl, { headers: FETCH_HEADERS });
  } catch (e) {
    return { ok: false, error: `fetch failed: ${e.message}` };
  }
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  const html = await res.text();
  const og =
    extractMeta(html, "og:image") ||
    extractMeta(html, "twitter:image") ||
    extractMeta(html, "twitter:image:src");
  if (!og) return { ok: false, error: "no og:image" };

  // Brand verification: when a hint is provided (search-result path),
  // require the page title or og:title to mention the brand. Stops the
  // search from accepting Nykaa/Sephora's closest-match-on-the-site
  // products that happen to be the wrong brand.
  if (brandHint) {
    const ogTitle =
      extractMeta(html, "og:title") ||
      extractMeta(html, "twitter:title") ||
      "";
    const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const haystack = (
      ogTitle +
      " " +
      (titleTagMatch ? titleTagMatch[1] : "")
    ).toLowerCase();
    const needles = brandHint
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);
    const hits = needles.filter((n) => haystack.includes(n)).length;
    // Require at least the first word of the brand to appear (handles
    // 'La Roche-Posay' → 'la' is too generic, but 'roche' or 'posay'
    // should match; multi-word brands need ≥1 distinctive token).
    const distinctive = needles.filter((n) => n.length > 3);
    const ok = distinctive.some((n) => haystack.includes(n)) || hits >= 1;
    if (!ok) {
      return { ok: false, error: `brand mismatch (title: "${haystack.slice(0, 80)}")` };
    }
  }

  let absolute;
  try {
    absolute = new URL(og, pageUrl).toString();
  } catch {
    return { ok: false, error: "bad og:image URL" };
  }
  return { ok: true, imageUrl: absolute };
}

async function downloadImage(url, slug) {
  let res;
  try {
    res = await fetchWithTimeout(url, { headers: FETCH_HEADERS });
  } catch (e) {
    return { ok: false, error: `image fetch failed: ${e.message}` };
  }
  if (!res.ok) return { ok: false, error: `image HTTP ${res.status}` };
  const ct = res.headers.get("content-type");
  const ext = pickContentTypeExt(ct) || ".jpg";
  const filename = `${slug}${ext}`;
  const filepath = join(PUBLIC_PRODUCTS_DIR, filename);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) {
    return { ok: false, error: `image too small (${buf.length} bytes)` };
  }
  writeFileSync(filepath, buf);
  return { ok: true, publicPath: `/products/${filename}`, bytes: buf.length };
}

function insertPhotoField(raw, photoPath) {
  // External URLs contain `:` and need to be quoted to stay valid YAML.
  // Local /products/... paths render fine unquoted but we always quote
  // here to keep the inserted line uniform.
  const value = /^https?:/.test(photoPath) ? JSON.stringify(photoPath) : photoPath;
  const lines = raw.split("\n");
  const idx = lines.findIndex((l) => /^category\s*:/.test(l));
  if (idx === -1) {
    const closingIdx = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
    if (closingIdx === -1) return raw;
    lines.splice(closingIdx, 0, `photo: ${value}`);
  } else {
    lines.splice(idx + 1, 0, `photo: ${value}`);
  }
  return lines.join("\n");
}

function isAdUrl(href) {
  // DuckDuckGo sponsored results route through y.js; Bing ads route
  // through bing.com/aclick. Both have nothing to do with the actual
  // product and tend to land on irrelevant store pages, which is how
  // we ended up scraping a 'BeMinimalist Alpha Arbutin' image for a
  // Tirtir Vitamin C serum on the first run.
  return (
    href.includes("duckduckgo.com/y.js") ||
    href.includes("bing.com/aclick") ||
    href.includes("ad_provider=") ||
    href.includes("ad_domain=")
  );
}

/**
 * DuckDuckGo HTML search: returns the first non-ad result URL,
 * decoding the tracker wrapper. Returns null if nothing found.
 */
async function ddgFirstResult(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  let res;
  try {
    res = await fetchWithTimeout(url, { headers: FETCH_HEADERS });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const html = await res.text();
  const matches = [
    ...html.matchAll(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"/g),
  ];
  for (const m of matches) {
    let href = m[1];
    const uddg = href.match(/uddg=([^&]+)/);
    if (uddg) href = decodeURIComponent(uddg[1]);
    if (href.startsWith("//")) href = "https:" + href;
    if (isAdUrl(href)) continue;
    return href;
  }
  return null;
}

/**
 * Build a sequence of search queries to try. Goes Nykaa first (good
 * og:image coverage), then iHerb (supplements), then a generic
 * brand+name search.
 */
function searchQueriesFor(brand, name) {
  const base = `${brand} ${name}`;
  return [
    `${base} site:nykaa.com`,
    `${base} site:iherb.com`,
    `${base} site:sephora.com`,
    `${base} site:cultbeauty.co.uk`,
    `${base} site:lookfantastic.com`,
    `${base} site:walmart.com`,
    `${base} site:target.com`,
    `${base} site:bodybuilding.com`,
    `${base} site:gnc.com`,
    `${base} site:hollandandbarrett.com`,
    `${base} site:laroche-posay.us`,
    `${base} site:nutricost.com`,
    `${base} site:thorne.com`,
    `${base} site:sportsresearch.com`,
    `${base} site:tirtir.global`,
    `${base} site:vivanaturals.com`,
    `${base} site:optimumnutrition.com`,
    `${base} site:herocosmetics.com`,
    `${base} buy`,
  ];
}

/**
 * REMOTE_MODE skips the local download/cache step and writes the
 * upstream og:image URL straight into `photo:`. Use it when you want
 * fast coverage now and plan to mirror to Blob later via
 * scripts/mirror-remote-photos-to-blob.mjs. Defaults to off so the
 * legacy `node scripts/scrape-product-photos.mjs` invocation still
 * downloads to public/products/ and stays byte-perfect on disk.
 */
const REMOTE_MODE = process.argv.includes("--remote");

async function tryUrl(pageUrl, slug, brandHint) {
  const og = await scrapeOgImage(pageUrl, brandHint);
  if (!og.ok) return { ok: false, error: og.error };
  if (REMOTE_MODE) {
    return { ok: true, publicPath: og.imageUrl, bytes: 0 };
  }
  const dl = await downloadImage(og.imageUrl, slug);
  if (!dl.ok) return { ok: false, error: dl.error };
  return { ok: true, publicPath: dl.publicPath, bytes: dl.bytes };
}

async function processFile(kind, file) {
  const fullPath = join(REPO_ROOT, "content", kind, file);
  const slug = file.replace(/\.mdx$/, "");
  const src = await readFile(fullPath, "utf8");
  const fm = readFrontmatter(src);
  if (!fm.hasFm) return { slug, status: "skip", reason: "no frontmatter" };
  if (frontmatterHas(fm.fm, "photo")) {
    return { slug, status: "skip", reason: "already has photo" };
  }

  const brand = getString(fm.fm, "brand") ?? "";
  const name = getString(fm.fm, "name") ?? "";

  // Phase 1: retailer URLs from the MDX.
  const directCandidates = [
    getString(fm.fm, "boughtFromUrl"),
    ...getLinkUrls(fm.fm, "westernLinks"),
    ...getLinkUrls(fm.fm, "indiaLinks"),
    ...getLinkUrls(fm.fm, "ukLinks"),
  ].filter(Boolean);

  const errors = [];
  for (const pageUrl of directCandidates) {
    // No brand check for direct retailer URLs from the MDX, those are
    // explicitly the right product and pre-vetted by the author.
    const result = await tryUrl(pageUrl, slug, null);
    if (result.ok) {
      const patched = src.replace(
        fm.raw,
        `---\n${insertPhotoField(fm.fm, result.publicPath)}\n---`,
      );
      await writeFile(fullPath, patched, "utf8");
      return {
        slug,
        status: "ok",
        photoPath: result.publicPath,
        via: pageUrl,
        bytes: result.bytes,
      };
    }
    errors.push(`direct ${pageUrl}: ${result.error}`);
  }

  // Phase 2: search-based fallback.
  if (brand && name) {
    for (const query of searchQueriesFor(brand, name)) {
      const found = await ddgFirstResult(query);
      if (!found) {
        errors.push(`search "${query}": no result`);
        continue;
      }
      // Skip if the search result itself loops back to a known-bad host.
      const result = await tryUrl(found, slug, brand);
      if (result.ok) {
        const patched = src.replace(
          fm.raw,
          `---\n${insertPhotoField(fm.fm, result.publicPath)}\n---`,
        );
        await writeFile(fullPath, patched, "utf8");
        return {
          slug,
          status: "ok",
          photoPath: result.publicPath,
          via: `${found} (via "${query}")`,
          bytes: result.bytes,
        };
      }
      errors.push(`search "${query}" → ${found}: ${result.error}`);
      // small delay between search attempts
      await sleep(400);
    }
  }

  return { slug, status: "fail", reason: errors.join(" | ") };
}

const summary = { ok: [], skip: [], fail: [] };
for (const kind of KINDS) {
  const dir = join(REPO_ROOT, "content", kind);
  if (!existsSync(dir)) continue;
  const files = (await readdir(dir)).filter((f) => f.endsWith(".mdx"));
  for (const file of files) {
    process.stdout.write(`${kind}/${file} ... `);
    const result = await processFile(kind, file);
    summary[result.status].push(result);
    if (result.status === "ok") {
      console.log(`✓ ${result.photoPath} (${(result.bytes / 1024).toFixed(0)} KiB)  via ${result.via}`);
    } else if (result.status === "skip") {
      console.log(`- skip (${result.reason})`);
    } else {
      console.log(`✗ ${result.reason.slice(0, 200)}${result.reason.length > 200 ? "..." : ""}`);
    }
    await sleep(250);
  }
}

console.log("\n=== Summary ===");
console.log(`✓ ${summary.ok.length} fetched`);
console.log(`- ${summary.skip.length} skipped (already had photo)`);
console.log(`✗ ${summary.fail.length} failed`);
if (summary.fail.length) {
  console.log("\nStill missing:");
  for (const f of summary.fail) console.log(`  ${f.slug}`);
}
