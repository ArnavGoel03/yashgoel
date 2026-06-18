import { AwsClient } from "aws4fetch";

/**
 * Cloudflare R2 storage layer (S3-compatible).
 *
 * Replaces the old Vercel Blob integration: every product photo and
 * admin-uploaded gallery image now lives in an R2 bucket. R2 speaks the
 * S3 API, so we sign requests with `aws4fetch` (tiny, runs on Node and
 * Edge via WebCrypto, no AWS SDK bloat) and talk to the bucket's S3
 * endpoint directly.
 *
 * Reads are served from the bucket's PUBLIC base URL
 * (`R2_PUBLIC_BASE`), which Next/Image then optimizes and CDN-caches.
 * For production that base should be a CUSTOM domain bound to the
 * bucket in Cloudflare (e.g. https://images.yashgoel.com), NOT the
 * `pub-*.r2.dev` development URL — the dev URL is rate-limited and can
 * 401 without warning. See tests/data-integrity.test.ts.
 *
 * We reuse the EXISTING `yashgoel-photos` bucket (the same one the DSLR
 * photos live in), so the only things that must be configured are the
 * write credentials. Everything non-secret (account id, bucket name,
 * public read origin) defaults to the known values below and can still
 * be overridden by env if they ever change.
 *
 * Required env (set in Vercel Production + .env.local) — credentials only:
 *   R2_ACCESS_KEY_ID      R2 API token access key id
 *   R2_SECRET_ACCESS_KEY  R2 API token secret
 *
 * Also required (not secret, copy from the R2 dashboard "Account ID"):
 *   R2_ACCOUNT_ID         Cloudflare account id (R2 S3 endpoint host)
 *
 * Optional overrides (sensible defaults baked in, none secret):
 *   R2_BUCKET             bucket name (default: yashgoel-photos)
 *   R2_PUBLIC_BASE        public read origin, no trailing slash
 *                         (default: the pub-*.r2.dev bucket URL)
 *
 * The read-only `yashgoel-photos-guard` Worker (see _local/r2-worker)
 * cannot accept uploads, so writes go straight to the S3 API here.
 */

// Non-secret defaults for the existing bucket. Env vars win if set.
const DEFAULT_BUCKET = "yashgoel-photos";
const DEFAULT_PUBLIC_BASE =
  "https://pub-81726e3b98da43bb906dabff81db14a2.r2.dev";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `${name} is not set. R2 storage is not configured — add it in Vercel and .env.local.`,
    );
  }
  return v;
}

function endpoint(): string {
  return `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`;
}

function bucket(): string {
  return process.env.R2_BUCKET || DEFAULT_BUCKET;
}

/** Public read origin with no trailing slash. */
export function publicBase(): string {
  return (process.env.R2_PUBLIC_BASE || DEFAULT_PUBLIC_BASE).replace(
    /\/+$/,
    "",
  );
}

let _client: AwsClient | null = null;
function client(): AwsClient {
  if (!_client) {
    _client = new AwsClient({
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
      service: "s3",
      region: "auto",
    });
  }
  return _client;
}

/** Encode each path segment but keep the slashes between them. */
function encodeKey(key: string): string {
  return key
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

function objectUrl(key: string): string {
  return `${endpoint()}/${bucket()}/${encodeKey(key)}`;
}

/** Public URL a browser/Next-Image can fetch for a given object key. */
export function publicUrl(key: string): string {
  return `${publicBase()}/${encodeKey(key)}`;
}

/**
 * Map a public R2 URL back to its object key, or null if the URL does
 * not belong to our bucket's public origin.
 */
export function keyFromUrl(url: string): string | null {
  let parsed: URL;
  let base: URL;
  try {
    parsed = new URL(url);
    base = new URL(publicBase());
  } catch {
    return null;
  }
  if (parsed.host !== base.host) return null;
  const basePath = base.pathname.replace(/\/+$/, "");
  if (!parsed.pathname.startsWith(basePath)) return null;
  const rest = parsed.pathname.slice(basePath.length).replace(/^\/+/, "");
  if (!rest) return null;
  return decodeURIComponent(rest);
}

/** True if the URL is served from our configured R2 public origin. */
export function isOurR2Url(url: string): boolean {
  return keyFromUrl(url) !== null;
}

export type R2PutBody = ArrayBuffer | Uint8Array | Buffer;

/** Upload (or overwrite) an object. Returns its public URL. */
export async function r2Put(
  key: string,
  body: R2PutBody,
  contentType?: string,
): Promise<{ url: string; key: string }> {
  const res = await client().fetch(objectUrl(key), {
    method: "PUT",
    body: body as BodyInit,
    headers: contentType ? { "content-type": contentType } : undefined,
  });
  if (!res.ok) {
    throw new Error(
      `R2 put failed (${res.status}) for ${key}: ${await res.text()}`,
    );
  }
  return { url: publicUrl(key), key };
}

/** Server-side copy within the bucket (no egress). */
export async function r2Copy(srcKey: string, destKey: string): Promise<void> {
  const res = await client().fetch(objectUrl(destKey), {
    method: "PUT",
    headers: {
      "x-amz-copy-source": `/${bucket()}/${encodeKey(srcKey)}`,
    },
  });
  if (!res.ok) {
    throw new Error(
      `R2 copy failed (${res.status}) ${srcKey} -> ${destKey}: ${await res.text()}`,
    );
  }
}

export async function r2Delete(key: string): Promise<void> {
  const res = await client().fetch(objectUrl(key), { method: "DELETE" });
  // S3 DELETE is idempotent: a missing key still returns 204.
  if (!res.ok && res.status !== 404) {
    throw new Error(
      `R2 delete failed (${res.status}) for ${key}: ${await res.text()}`,
    );
  }
}

export type R2Head = { contentType?: string; size: number } | null;

/** HEAD an object. Returns null if it does not exist. */
export async function r2Head(key: string): Promise<R2Head> {
  const res = await client().fetch(objectUrl(key), { method: "HEAD" });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`R2 head failed (${res.status}) for ${key}`);
  }
  return {
    contentType: res.headers.get("content-type") ?? undefined,
    size: Number(res.headers.get("content-length") ?? "0"),
  };
}

export type R2Object = { key: string; size: number };

function xmlTagAll(xml: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

function xmlTagFirst(xml: string, tag: string): string | null {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml);
  return m ? m[1] : null;
}

function xmlDecode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * List one page of objects under a prefix (S3 ListObjectsV2). Returns
 * the objects plus a continuation token for the next page, if any.
 */
export async function r2List(
  prefix: string,
  cursor?: string,
): Promise<{ objects: R2Object[]; cursor?: string }> {
  const params = new URLSearchParams({ "list-type": "2", prefix });
  if (cursor) params.set("continuation-token", cursor);
  const res = await client().fetch(
    `${endpoint()}/${bucket()}?${params.toString()}`,
    { method: "GET" },
  );
  if (!res.ok) {
    throw new Error(`R2 list failed (${res.status}): ${await res.text()}`);
  }
  const xml = await res.text();
  const objects: R2Object[] = xmlTagAll(xml, "Contents").map((c) => ({
    key: xmlDecode(xmlTagFirst(c, "Key") ?? ""),
    size: Number(xmlTagFirst(c, "Size") ?? "0"),
  }));
  const truncated = xmlTagFirst(xml, "IsTruncated") === "true";
  const next = truncated
    ? xmlTagFirst(xml, "NextContinuationToken") ?? undefined
    : undefined;
  return { objects, cursor: next ? xmlDecode(next) : undefined };
}
