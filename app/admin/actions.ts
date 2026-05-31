"use server";

import { z } from "zod";
import { put } from "@vercel/blob";
import { updateTag } from "next/cache";
import { auth } from "@/auth";
import { commitRepoFile, readRepoFile } from "@/lib/github";
import { retailerForUrl } from "@/lib/retailers";
import { normalizeAmazonUrl } from "@/lib/amazon-url";
import { restoreBlob, softDeleteBlob } from "@/lib/trash";

/**
 * Belt-and-braces auth guard: middleware already blocks unauthenticated
 * traffic at /admin/*, but server actions can in principle be invoked
 * from any referrer, so we double-check the session here before doing
 * any work. An `ALLOWED_ADMIN_EMAIL` mismatch returns the same error as
 * being fully signed-out: the action refuses to run.
 */
async function requireAdmin(): Promise<string | null> {
  // Kill switch: setting ADMIN_DISABLED=1 in Vercel (or .env.local)
  // disables every write action regardless of session, with no code
  // change required. Use it as a panic button if admin is ever
  // suspected compromised.
  if (process.env.ADMIN_DISABLED === "1") {
    return "Admin is currently disabled. Contact the site owner.";
  }
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!email) return "Not authorized. Sign in at /admin/login.";
  const allowed = (process.env.ALLOWED_ADMIN_EMAIL ?? "")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (allowed.length === 0 || !allowed.includes(email)) {
    return "Not authorized. Sign in at /admin/login.";
  }
  return null;
}

// Only image MIME types are accepted for product photos. SVG is
// deliberately excluded (script-in-SVG is a classic stored-XSS vector
// served straight from a public Blob CDN).
const ALLOWED_UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

const reviewSchema = z.object({
  kind: z.enum(["skincare", "supplements", "oral-care", "hair-care", "body-care", "essentials", "miscellaneous"]),
  name: z.string().trim().min(1, "required"),
  brand: z.string().trim().min(1, "required"),
  category: z.string().trim().min(1, "required"),
  verdict: z
    .string()
    .optional()
    .transform((v) => {
      if (v === "recommend" || v === "okay" || v === "bad") return v;
      return undefined;
    }),
  effectRating: z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return undefined;
      const n = Number(v);
      return isNaN(n) ? undefined : n;
    }),
  valueRating: z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return undefined;
      const n = Number(v);
      return isNaN(n) ? undefined : n;
    }),
  toleranceRating: z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return undefined;
      const n = Number(v);
      return isNaN(n) ? undefined : n;
    }),
  hidden: z.preprocess(
    (v) => v === "on" || v === "true" || v === true,
    z.boolean(),
  ),
  retired: z.preprocess(
    (v) => v === "on" || v === "true" || v === true,
    z.boolean(),
  ),
  retiredReason: z.string().trim().optional(),
  priceIn: z.string().trim().optional(),
  priceUs: z.string().trim().optional(),
  priceUk: z.string().trim().optional(),
  servingsPerContainer: z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return undefined;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }),
  dailyServings: z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return undefined;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }),
  skinType: z.string().optional(),
  goal: z.string().optional(),
  routines: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      const arr = v === undefined ? [] : Array.isArray(v) ? v : [v];
      return arr.filter(
        (s): s is "morning" | "evening" | "stack" | "shower" | "oral" =>
          s === "morning" ||
          s === "evening" ||
          s === "stack" ||
          s === "shower" ||
          s === "oral",
      );
    }),
  photo: z.string().trim().optional(),
  photoFallback: z.string().trim().optional(),
  boughtFromUrl: z
    .string()
    .trim()
    .url("must be a valid URL")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  indiaLinks: z.string().optional(),
  westernLinks: z.string().optional(),
  ukLinks: z.string().optional(),
  ingredients: z.string().optional(),
  pros: z.string().optional(),
  cons: z.string().optional(),
  repurchase: z.preprocess(
    (v) => {
      if (v === undefined || v === "" || v === "undecided") return undefined;
      if (v === "yes" || v === "on" || v === "true" || v === true) return true;
      if (v === "no" || v === "false" || v === false) return false;
      return undefined;
    },
    z.boolean().optional(),
  ),
  datePublished: z.string().trim().min(1, "required"),
  summary: z.string().optional().transform((v) => (v ?? "").trim()),
  body: z.string().optional(),
});

const photoSchema = z.object({
  alt: z.string().trim().min(1, "required"),
  caption: z.string().trim().min(1, "required"),
  location: z.string().trim().optional(),
  date: z.string().trim().min(1, "required"),
  width: z.coerce.number().int().positive(),
  height: z.coerce.number().int().positive(),
});

function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseList(s: string | undefined): string[] {
  return (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
}

function parseLines(s: string | undefined): string[] {
  return (s ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
}

function parseBuyLinks(
  s: string | undefined,
): { retailer: string; url: string }[] {
  const out: { retailer: string; url: string }[] = [];
  for (const line of parseLines(s)) {
    let retailer: string;
    let url: string;
    if (line.includes("|")) {
      const [r, u] = line.split("|", 2).map((x) => x.trim());
      retailer = r || retailerForUrl(u);
      url = u;
    } else {
      url = line;
      retailer = retailerForUrl(line);
    }
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    // Only http(s) buy links. `new URL()` happily accepts javascript:/data:
    // (valid URLs per spec); drop anything that isn't a web link so a
    // dangerous-scheme URL can never reach the rendered <a href>.
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      continue;
    }
    url = normalizeAmazonUrl(url);
    out.push({ retailer, url });
  }
  return out;
}

function yamlString(s: string): string {
  if (/^[-?*&!|>'"%@`#[{,]/.test(s) || /[:\n#]/.test(s)) {
    return JSON.stringify(s);
  }
  return s;
}

function buildReviewMdx(d: {
  name: string;
  brand: string;
  category: string;
  verdict?: "recommend" | "okay" | "bad";
  ratings?: { effect?: number; value?: number; tolerance?: number };
  hidden?: boolean;
  retired?: boolean;
  retiredReason?: string;
  price?: { in?: string; us?: string; uk?: string };
  servingsPerContainer?: number;
  dailyServings?: number;
  skinType: string[];
  goal: string[];
  routines: ("morning" | "evening" | "stack" | "shower" | "oral")[];
  photo?: string;
  boughtFromUrl?: string;
  indiaLinks: { retailer: string; url: string }[];
  westernLinks: { retailer: string; url: string }[];
  ukLinks: { retailer: string; url: string }[];
  ingredients: string[];
  pros: string[];
  cons: string[];
  repurchase?: boolean;
  datePublished: string;
  summary: string;
  body: string;
}): string {
  const lines: string[] = ["---"];
  lines.push(`name: ${yamlString(d.name)}`);
  lines.push(`brand: ${yamlString(d.brand)}`);
  lines.push(`category: ${yamlString(d.category)}`);
  if (d.verdict) lines.push(`verdict: ${d.verdict}`);
  if (d.ratings) {
    const r = d.ratings;
    const entries: string[] = [];
    if (typeof r.effect === "number") entries.push(`effect: ${r.effect}`);
    if (typeof r.value === "number") entries.push(`value: ${r.value}`);
    if (typeof r.tolerance === "number")
      entries.push(`tolerance: ${r.tolerance}`);
    if (entries.length) {
      lines.push("ratings:");
      for (const e of entries) lines.push(`  ${e}`);
    }
  }
  if (d.hidden) lines.push(`hidden: true`);
  if (d.retired) lines.push(`retired: true`);
  if (d.retiredReason) lines.push(`retiredReason: ${yamlString(d.retiredReason)}`);
  if (d.price && (d.price.in || d.price.us || d.price.uk)) {
    lines.push("price:");
    if (d.price.in) lines.push(`  in: ${yamlString(d.price.in)}`);
    if (d.price.us) lines.push(`  us: ${yamlString(d.price.us)}`);
    if (d.price.uk) lines.push(`  uk: ${yamlString(d.price.uk)}`);
  }
  if (typeof d.servingsPerContainer === "number")
    lines.push(`servingsPerContainer: ${d.servingsPerContainer}`);
  if (typeof d.dailyServings === "number")
    lines.push(`dailyServings: ${d.dailyServings}`);
  if (d.skinType.length) lines.push(`skinType: [${d.skinType.join(", ")}]`);
  if (d.goal.length) lines.push(`goal: [${d.goal.join(", ")}]`);
  if (d.routines.length) lines.push(`routines: [${d.routines.join(", ")}]`);
  if (d.photo) lines.push(`photo: ${yamlString(d.photo)}`);
  if (d.boughtFromUrl)
    lines.push(`boughtFromUrl: ${JSON.stringify(d.boughtFromUrl)}`);
  if (d.indiaLinks.length) {
    lines.push("indiaLinks:");
    for (const l of d.indiaLinks) {
      lines.push(
        `  - { retailer: ${JSON.stringify(l.retailer)}, url: ${JSON.stringify(l.url)} }`,
      );
    }
  }
  if (d.westernLinks.length) {
    lines.push("westernLinks:");
    for (const l of d.westernLinks) {
      lines.push(
        `  - { retailer: ${JSON.stringify(l.retailer)}, url: ${JSON.stringify(l.url)} }`,
      );
    }
  }
  if (d.ukLinks.length) {
    lines.push("ukLinks:");
    for (const l of d.ukLinks) {
      lines.push(
        `  - { retailer: ${JSON.stringify(l.retailer)}, url: ${JSON.stringify(l.url)} }`,
      );
    }
  }
  if (d.ingredients.length)
    lines.push(`ingredients: [${d.ingredients.join(", ")}]`);
  if (d.pros.length) {
    lines.push("pros:");
    for (const p of d.pros) lines.push(`  - ${p}`);
  }
  if (d.cons.length) {
    lines.push("cons:");
    for (const c of d.cons) lines.push(`  - ${c}`);
  }
  if (typeof d.repurchase === "boolean")
    lines.push(`repurchase: ${d.repurchase}`);
  lines.push(`datePublished: "${d.datePublished}"`);
  if (d.summary) lines.push(`summary: ${yamlString(d.summary)}`);
  lines.push("---");
  lines.push("");
  lines.push(d.body.trim());
  lines.push("");
  return lines.join("\n");
}

export type ActionState = {
  ok: boolean;
  error?: string;
  message?: string;
  slug?: string;
  kind?: "skincare" | "supplements" | "oral-care" | "hair-care" | "body-care" | "essentials" | "miscellaneous";
  path?: string;
};

function buildContentFromForm(d: z.infer<typeof reviewSchema>): string {
  const ratings =
    d.effectRating !== undefined ||
    d.valueRating !== undefined ||
    d.toleranceRating !== undefined
      ? {
          effect: d.effectRating,
          value: d.valueRating,
          tolerance: d.toleranceRating,
        }
      : undefined;
  return buildReviewMdx({
    name: d.name,
    brand: d.brand,
    category: d.category,
    verdict: d.verdict,
    ratings,
    hidden: d.hidden,
    retired: d.retired,
    retiredReason: d.retiredReason || undefined,
    price:
      d.priceIn || d.priceUs || d.priceUk
        ? {
            in: d.priceIn || undefined,
            us: d.priceUs || undefined,
            uk: d.priceUk || undefined,
          }
        : undefined,
    servingsPerContainer: d.servingsPerContainer,
    dailyServings: d.dailyServings,
    skinType: d.kind === "skincare" ? parseList(d.skinType) : [],
    goal: d.kind === "skincare" ? [] : parseList(d.goal),
    routines: d.routines,
    photo: d.photo || undefined,
    boughtFromUrl: d.boughtFromUrl ? normalizeAmazonUrl(d.boughtFromUrl) : undefined,
    indiaLinks: parseBuyLinks(d.indiaLinks),
    westernLinks: parseBuyLinks(d.westernLinks),
    ukLinks: parseBuyLinks(d.ukLinks),
    ingredients: parseList(d.ingredients),
    pros: parseLines(d.pros),
    cons: parseLines(d.cons),
    repurchase: d.repurchase,
    datePublished: d.datePublished,
    summary: d.summary,
    body: d.body ?? "",
  });
}

export async function createReview(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return { ok: false, error: authError };
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "form"}: ${i.message}`)
        .join("; "),
    };
  }
  const d = parsed.data;
  const slug = slugify(`${d.brand} ${d.name}`);
  if (!slug) return { ok: false, error: "Could not generate slug." };

  const repoPath = `content/${d.kind}/${slug}.mdx`;

  try {
    await commitRepoFile({
      path: repoPath,
      content: buildContentFromForm(d),
      message: `Add ${d.brand} ${d.name} (${d.kind})`,
      expectExisting: false,
    });
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  updateTag(`review-${d.kind}-${slug}`);
  updateTag(`reviews-${d.kind}`);
  updateTag("reviews");
  updateTag("feed");

  return {
    ok: true,
    slug,
    kind: d.kind,
    path: repoPath,
    message: `Committed ${repoPath}. New review live on the next deploy (Vercel rebuilds on push).`,
  };
}

export async function updateReview(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return { ok: false, error: authError };
  const slug = (formData.get("slug") ?? "").toString().trim();
  if (!slug) return { ok: false, error: "Missing slug, can't locate the file to update." };
  // Hard-validate the slug. Without this, an authenticated admin (or a
  // hijacked session) could supply `../../package.json` and write
  // arbitrary `.mdx` content to any repo path via the GitHub Contents
  // API. createReview is already safe because it derives slug via
  // slugify(); updateReview takes slug from the form raw.
  if (!/^[a-z0-9-]{2,120}$/.test(slug)) {
    return { ok: false, error: "Invalid slug format." };
  }

  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "form"}: ${i.message}`)
        .join("; "),
    };
  }
  const d = parsed.data;
  const repoPath = `content/${d.kind}/${slug}.mdx`;

  try {
    await commitRepoFile({
      path: repoPath,
      content: buildContentFromForm(d),
      message: `Update ${d.brand} ${d.name} (${d.kind})`,
    });
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  updateTag(`review-${d.kind}-${slug}`);
  updateTag(`reviews-${d.kind}`);
  updateTag("reviews");
  updateTag("feed");

  return {
    ok: true,
    slug,
    kind: d.kind,
    path: repoPath,
    message: `Updated ${repoPath}. Edit live on the next deploy (Vercel rebuilds on push).`,
  };
}

export async function uploadProductImage(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const authError = await requireAdmin();
  if (authError) return { ok: false, error: authError };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file received." };
  }
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    return {
      ok: false,
      error: `Unsupported file type ${file.type || "(unknown)"}. Use JPEG, PNG, WebP, AVIF, or GIF.`,
    };
  }
  // Cap at 8 MiB so a runaway upload can't chew through Blob quota.
  const MAX_BYTES = 8 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `File is ${(file.size / 1024 / 1024).toFixed(1)} MiB, over the 8 MiB cap.`,
    };
  }
  const origName = file.name || "upload";
  const ext = origName.includes(".") ? origName.split(".").pop()! : "bin";
  const base =
    origName
      .replace(/\.[^.]+$/, "")
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "product";
  const key = `products/${base}-${Date.now()}.${ext}`;
  try {
    const blob = await put(key, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type || undefined,
    });
    return { ok: true, url: blob.url };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

function isOurBlobUrl(url: string): boolean {
  try {
    return new URL(url)
      .hostname.toLowerCase()
      .endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/**
 * Soft-delete a previously-uploaded product image. The asset is moved
 * to a __trash/<deletedAt-iso>__<originalKey> location in Blob, where
 * a daily cron will physically delete it after a 30-day grace window.
 * Until then it's restorable from /admin/trash.
 *
 * Returns the new (trash) URL so the admin UI can stash it for an
 * undo flow. Locked to our Blob host so a stray call can't be turned
 * into an arbitrary URL fetcher.
 */
export async function deleteProductImage(
  url: string,
): Promise<{ ok: boolean; trashUrl?: string; error?: string }> {
  const authError = await requireAdmin();
  if (authError) return { ok: false, error: authError };
  if (!url) return { ok: false, error: "No URL provided." };
  if (!isOurBlobUrl(url)) {
    return {
      ok: false,
      error: "Only Vercel Blob URLs can be moved to trash from here.",
    };
  }
  try {
    const { trashUrl } = await softDeleteBlob(url);
    return { ok: true, trashUrl };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Restore a previously soft-deleted asset back to its original
 * pathname. Returns the restored public URL so the admin UI can put it
 * straight back into the form.
 */
export async function restoreProductImage(
  trashUrl: string,
): Promise<{ ok: boolean; publicUrl?: string; error?: string }> {
  const authError = await requireAdmin();
  if (authError) return { ok: false, error: authError };
  if (!trashUrl) return { ok: false, error: "No URL provided." };
  if (!isOurBlobUrl(trashUrl)) {
    return { ok: false, error: "Only Vercel Blob URLs can be restored." };
  }
  try {
    const { publicUrl } = await restoreBlob(trashUrl);
    return { ok: true, publicUrl };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function createPhoto(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return { ok: false, error: authError };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose an image file." };
  }
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    return {
      ok: false,
      error: `Unsupported file type ${file.type || "(unknown)"}. Use JPEG, PNG, WebP, AVIF, or GIF.`,
    };
  }
  const parsed = photoSchema.safeParse({
    alt: formData.get("alt"),
    caption: formData.get("caption"),
    location: formData.get("location"),
    date: formData.get("date"),
    width: formData.get("width"),
    height: formData.get("height"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "form"}: ${i.message}`)
        .join("; "),
    };
  }
  const meta = parsed.data;

  const origName = file.name || "upload";
  const ext = origName.includes(".") ? origName.split(".").pop()! : "bin";
  const base = origName
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "photo";
  const key = `photos/originals/${meta.date}-${base}-${Date.now()}.${ext}`;

  let uploadedUrl: string;
  try {
    const blob = await put(key, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type || undefined,
    });
    uploadedUrl = blob.url;
  } catch (err) {
    return { ok: false, error: `Blob upload failed: ${(err as Error).message}` };
  }

  const repoPath = "content/photos.json";
  try {
    const existing = await readRepoFile(repoPath);
    const current = existing ? (JSON.parse(existing) as unknown[]) : [];
    const entry = {
      src: uploadedUrl,
      alt: meta.alt,
      caption: meta.caption,
      location: meta.location || undefined,
      date: meta.date,
      width: meta.width,
      height: meta.height,
    };
    const next = [entry, ...current];
    const json = JSON.stringify(next, null, 2) + "\n";
    await commitRepoFile({
      path: repoPath,
      content: json,
      message: `Add photo: ${meta.caption.slice(0, 60)}`,
    });
  } catch (err) {
    return {
      ok: false,
      error: `Photo uploaded to Blob but commit failed: ${(err as Error).message}`,
    };
  }

  updateTag("photos");

  return {
    ok: true,
    path: repoPath,
    message: `Uploaded and committed. Live on the next deploy.`,
  };
}

const photoEntrySchema = z.object({
  src: z.string().url(),
  alt: z.string(),
  caption: z.string(),
  location: z.string().optional(),
  date: z.string(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  hidden: z.boolean().optional(),
  hero: z.boolean().optional(),
  featured: z.boolean().optional(),
  rawSource: z.string().optional(),
  srcFallback: z.string().optional(),
  tier: z.enum(["editorial", "archive"]).optional(),
  camera: z.string().optional(),
  lens: z.string().optional(),
  focalLength: z.string().optional(),
  aperture: z.string().optional(),
  iso: z.union([z.string(), z.number()]).optional(),
  shutter: z.string().optional(),
});

/**
 * Overwrite the entire `content/photos.json` manifest in one commit.
 * Used by the admin photo manager to persist reorder / hide / bulk
 * changes. Validates every entry against `photoEntrySchema` so a
 * malformed client payload can't corrupt the file.
 */
export async function updatePhotosManifest(
  payloadJson: string,
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const authError = await requireAdmin();
  if (authError) return { ok: false, error: authError };
  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(payloadJson);
  } catch {
    return { ok: false, error: "Payload is not valid JSON." };
  }
  const parsed = z.array(photoEntrySchema).safeParse(parsedRaw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".") || "entry"}: ${i.message}`)
        .join("; "),
    };
  }
  const json = JSON.stringify(parsed.data, null, 2) + "\n";
  try {
    await commitRepoFile({
      path: "content/photos.json",
      content: json,
      message: `Update photo manifest (${parsed.data.length} entries)`,
    });
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  updateTag("photos");
  return {
    ok: true,
    message: `Saved. Live on the next deploy.`,
  };
}
