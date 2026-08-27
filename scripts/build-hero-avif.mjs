#!/usr/bin/env node
// Build-time generator for the homepage hero's inline AVIF.
//
// Runs as `prebuild` on every Vercel deploy. For the photo flagged
// `hero: true` in content/photos.json:
//
//   1. Fetch the current `src` (R2 URL).
//   2. Resize to 1600px wide via sharp.
//   3. Encode AVIF at q50 (~20-30 KB for landscape photos).
//   4. Base64-embed into the entry as `inlineAvif` so PhotoHero can
//      paint it instantly with zero additional network requests.
//   5. Cache marker: `_inlineAvifSrc` records the src that was used.
//      Subsequent deploys re-run this script; if the src hasn't
//      changed, the existing inlineAvif is reused (no re-fetch, no
//      re-encode). Whenever you change the hero (e.g. flip `hero: true`
//      to a different entry), the next deploy regenerates.
//
// Failure mode: if the fetch or encode fails (network, malformed URL,
// missing hero), we log a warning and let the build continue. Worst
// case: PhotoHero falls back to the normal Next/Image-only render
// (still works, just no instant-paint AVIF layer).

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PHOTOS_JSON = join(__dirname, "..", "content", "photos.json");
const TARGET_WIDTH = 1600;
const AVIF_QUALITY = 50;

async function main() {
  const raw = await readFile(PHOTOS_JSON, "utf8");
  const photos = JSON.parse(raw);
  const hero = photos.find((p) => p.hero);

  if (!hero) {
    console.log("[build-hero-avif] No hero found in photos.json; skipping.");
    return;
  }

  // Cache marker: skip if we already encoded for this exact src.
  if (hero.inlineAvif && hero._inlineAvifSrc === hero.src) {
    console.log(`[build-hero-avif] Hero AVIF up to date for ${hero.caption}`);
    return;
  }

  console.log(`[build-hero-avif] Generating for ${hero.caption}`);
  console.log(`  src: ${hero.src}`);

  let resp;
  try {
    resp = await fetch(hero.src);
  } catch (e) {
    console.warn(`[build-hero-avif] fetch failed: ${e?.message}; build continues without inline AVIF.`);
    return;
  }
  if (!resp.ok) {
    console.warn(`[build-hero-avif] fetch returned ${resp.status}; build continues.`);
    return;
  }
  const buf = Buffer.from(await resp.arrayBuffer());

  let out;
  try {
    out = await sharp(buf)
      .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
      .avif({ quality: AVIF_QUALITY, effort: 6 })
      .toBuffer();
  } catch (e) {
    console.warn(`[build-hero-avif] sharp failed: ${e?.message}; build continues.`);
    return;
  }

  const meta = await sharp(out).metadata();
  const dataUri = `data:image/avif;base64,${out.toString("base64")}`;
  console.log(`  ${(out.length / 1024).toFixed(1)} KB AVIF (${meta.width}×${meta.height}) at q${AVIF_QUALITY}`);

  hero.inlineAvif = dataUri;
  hero.inlineAvifWidth = meta.width ?? TARGET_WIDTH;
  hero.inlineAvifHeight = meta.height ?? 0;
  hero._inlineAvifSrc = hero.src;

  // Four spaces, which is how content/photos.json is written on disk.
  // Emitting two meant every `pnpm build` reformatted the whole file and
  // left a 1425-line diff in the working tree that had no content in it.
  const next = JSON.stringify(photos, null, 4) + "\n";
  if (next === (await readFile(PHOTOS_JSON, "utf8").catch(() => null))) {
    console.log("[build-hero-avif] Unchanged.");
    return;
  }
  await writeFile(PHOTOS_JSON, next, "utf8");
  console.log("[build-hero-avif] Saved.");
}

main().catch((e) => {
  console.warn(`[build-hero-avif] unexpected error: ${e?.message}; build continues.`);
});
