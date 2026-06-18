import {
  isOurR2Url,
  keyFromUrl,
  publicUrl,
  r2Copy,
  r2Delete,
  r2List,
} from "./r2";

/**
 * Soft-delete plumbing for R2 image assets.
 *
 * Instead of deleting an object outright, we *move* it (server-side
 * copy + delete of the original) to a trash key:
 *
 *   __trash/<deletedAtEpochMs>__<rand>__<originalKey>
 *
 * The bytes still live in the bucket at a new public URL, but the
 * public site stops referencing them because the corresponding MDX
 * `photo:` field is cleared at the same time. A daily cron then scans
 * `__trash/*` and physically deletes anything older than 30 days.
 *
 * `<rand>` is unguessable entropy so an attacker can't enumerate trash
 * URLs by brute-forcing the deletion timestamp (R2 public reads have no
 * auth). `__` (double underscore) is the field separator; generated
 * object keys only ever contain single underscores.
 *
 * Restore: copy the bytes back to the original key, delete the trash
 * entry.
 */

const TRASH_PREFIX = "__trash/";
export const TRASH_GRACE_DAYS = 30;

function trashKeyFor(originalKey: string, nowMs: number): string {
  const rand = globalThis.crypto.randomUUID().replace(/-/g, "");
  return `${TRASH_PREFIX}${nowMs}__${rand}__${originalKey}`;
}

function parseTrashKey(
  key: string,
): { deletedAt: Date; originalKey: string } | null {
  if (!key.startsWith(TRASH_PREFIX)) return null;
  const rest = key.slice(TRASH_PREFIX.length);
  const firstSep = rest.indexOf("__");
  if (firstSep === -1) return null;
  const epoch = Number(rest.slice(0, firstSep));
  if (!Number.isFinite(epoch)) return null;
  const afterEpoch = rest.slice(firstSep + 2);
  const secondSep = afterEpoch.indexOf("__");
  if (secondSep === -1) return null;
  const originalKey = afterEpoch.slice(secondSep + 2);
  if (!originalKey) return null;
  const deletedAt = new Date(epoch);
  if (Number.isNaN(deletedAt.getTime())) return null;
  return { deletedAt, originalKey };
}

/**
 * Move an asset from its current key to a timestamped trash key.
 * Returns the new (trash) public URL the admin can save for later
 * restore. Locked to our R2 public origin so a stray call can't be
 * turned into an arbitrary URL fetcher.
 */
export async function softDeleteImage(
  imageUrl: string,
): Promise<{ trashUrl: string; trashKey: string }> {
  const originalKey = keyFromUrl(imageUrl);
  if (!originalKey) {
    throw new Error(`Refusing to trash non-R2 URL: ${imageUrl}`);
  }
  const trashKey = trashKeyFor(originalKey, Date.now());
  await r2Copy(originalKey, trashKey);
  await r2Delete(originalKey);
  return { trashUrl: publicUrl(trashKey), trashKey };
}

/**
 * Move an asset back from trash to its original key. Returns the
 * restored public URL.
 */
export async function restoreImage(
  trashUrl: string,
): Promise<{ publicUrl: string }> {
  const trashKey = keyFromUrl(trashUrl);
  if (!trashKey) {
    throw new Error(`Refusing to restore non-R2 URL: ${trashUrl}`);
  }
  const parsed = parseTrashKey(trashKey);
  if (!parsed) {
    throw new Error(`URL is not a trash entry: ${trashUrl}`);
  }
  await r2Copy(trashKey, parsed.originalKey);
  await r2Delete(trashKey);
  return { publicUrl: publicUrl(parsed.originalKey) };
}

export type TrashEntry = {
  url: string;
  key: string;
  originalKey: string;
  deletedAt: string;
  expiresAt: string;
  size: number;
};

export async function listTrashed(): Promise<TrashEntry[]> {
  // Mark this read as request-time so Next 16 cacheComponents doesn't
  // try to prerender admin pages that call us — listing reads live
  // bucket state, never a build-time snapshot.
  const { connection } = await import("next/server");
  await connection();

  const out: TrashEntry[] = [];
  let cursor: string | undefined = undefined;
  do {
    const page = await r2List(TRASH_PREFIX, cursor);
    for (const obj of page.objects) {
      const parsed = parseTrashKey(obj.key);
      if (!parsed) continue;
      const expiresAt = new Date(parsed.deletedAt);
      expiresAt.setUTCDate(expiresAt.getUTCDate() + TRASH_GRACE_DAYS);
      out.push({
        url: publicUrl(obj.key),
        key: obj.key,
        originalKey: parsed.originalKey,
        deletedAt: parsed.deletedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        size: obj.size,
      });
    }
    cursor = page.cursor;
  } while (cursor);
  // Soonest-to-expire first.
  out.sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  return out;
}

/**
 * Physically delete every trash entry whose deletedAt is more than
 * `TRASH_GRACE_DAYS` ago. Returns the keys that were purged.
 */
export async function purgeExpiredTrash(): Promise<{
  purged: string[];
  scanned: number;
}> {
  const cutoff = Date.now() - TRASH_GRACE_DAYS * 24 * 60 * 60 * 1000;
  const purged: string[] = [];
  let scanned = 0;
  let cursor: string | undefined = undefined;
  do {
    const page = await r2List(TRASH_PREFIX, cursor);
    for (const obj of page.objects) {
      scanned++;
      const parsed = parseTrashKey(obj.key);
      if (!parsed) continue;
      if (parsed.deletedAt.getTime() > cutoff) continue;
      await r2Delete(obj.key);
      purged.push(obj.key);
    }
    cursor = page.cursor;
  } while (cursor);
  return { purged, scanned };
}

// Re-exported so callers (admin actions, UI) can validate URLs without
// importing from two modules.
export { isOurR2Url };
