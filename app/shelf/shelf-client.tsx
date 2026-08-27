"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { Copy } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import {
  onShelfChange,
  readShelf,
  shelfSnapshot,
  writeShelf,
} from "@/components/bookmark-toggle";
import { toast } from "@/lib/toast";
import type { ReviewSummary } from "@/lib/types";

const HASH_PREFIX = "#shelf=";

/**
 * Parse `#shelf=skincare/foo,supplements/bar` from the URL hash and
 * return the IDs array, or null if no hash payload is present.
 */
function readHashShelf(): string[] | null {
  if (typeof window === "undefined") return null;
  const h = window.location.hash;
  if (!h.startsWith(HASH_PREFIX)) return null;
  try {
    const raw = decodeURIComponent(h.slice(HASH_PREFIX.length));
    if (!raw) return [];
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.includes("/"));
  } catch {
    return null;
  }
}

function clearHash() {
  if (typeof window === "undefined") return;
  history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
}

export function ShelfClient({ reviews }: { reviews: ReviewSummary[] }) {
  // The shelf is a store with a subscription, so this reads it rather
  // than copying it into state on mount. null on the server keeps the
  // "not loaded yet" rendering exactly as it was.
  const ids = useSyncExternalStore(
    onShelfChange,
    shelfSnapshot,
    () => null as string[] | null,
  );

  // Merging a shared shelf out of the URL hash is a genuine side effect:
  // it writes storage, announces the change and raises a toast. It no
  // longer sets component state, because writeShelf notifies the
  // subscription above and the new value arrives that way.
  useEffect(() => {
    const hashIds = readHashShelf();
    if (!hashIds || hashIds.length === 0) return;
    const valid = hashIds.filter((id) =>
      reviews.some((r) => `${r.kind}/${r.slug}` === id),
    );
    const local = readShelf();
    const known = new Set(local);
    const newOnes = valid.filter((id) => !known.has(id));
    if (newOnes.length > 0) {
      // The reader's most recent saves stay at the end so freshly
      // pulled ones land on top when displayed newest-first.
      writeShelf([...local, ...newOnes]);
      toast(
        `Added ${newOnes.length} item${newOnes.length === 1 ? "" : "s"} from the link`,
      );
    } else if (valid.length > 0) {
      toast("Already on your shelf", { tone: "info" });
    }
    clearHash();
  }, [reviews]);

  function copyShareLink() {
    if (!ids || ids.length === 0) return;
    const url = `${window.location.origin}/shelf${HASH_PREFIX}${encodeURIComponent(ids.join(","))}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => toast("Share link copied"))
        .catch(() => toast("Could not copy link", { tone: "error" }));
    } else {
      // Fallback for browsers without clipboard API.
      window.prompt("Copy this link to share your shelf", url);
    }
  }

  if (ids === null) {
    return (
      <p className="mt-12 font-serif text-base italic text-stone-500 dark:text-stone-400">
        Loading your shelf…
      </p>
    );
  }

  if (ids.length === 0) {
    return (
      <div className="mt-12 max-w-xl border-l border-stone-200 pl-6 dark:border-stone-800">
        <p className="font-serif text-lg italic leading-relaxed text-stone-500 dark:text-stone-400">
          Empty for now. As you read through the catalog, tap the small
          rose ❋ on any card to save it here. Nothing is uploaded —
          your shelf stays in this browser.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/skincare"
            className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
          >
            Browse skincare
          </Link>
          <Link
            href="/now"
            className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:border-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-stone-400"
          >
            What&apos;s on the shelf this month
          </Link>
        </div>
      </div>
    );
  }

  // Preserve the order the user saved items in (most recent first).
  const idSet = new Set(ids);
  const items = ids
    .slice()
    .reverse()
    .map((id) => reviews.find((r) => `${r.kind}/${r.slug}` === id))
    .filter((r): r is ReviewSummary => Boolean(r));
  // Drop any IDs whose review no longer exists (slug renamed, retired, etc.).
  const missing = ids.filter(
    (id) => !reviews.some((r) => `${r.kind}/${r.slug}` === id),
  );

  return (
    <>
      <div className="mt-10 flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
          {items.length} saved
          {missing.length > 0 && (
            <span className="ml-3 italic text-stone-400 dark:text-stone-500">
              {missing.length} no longer in catalog
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={copyShareLink}
          className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-stone-700 transition-colors hover:border-stone-900 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-stone-400 dark:hover:text-stone-100"
        >
          <Copy className="h-3 w-3" aria-hidden />
          Copy share link
        </button>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((r) => (
          <ProductCard key={`${r.kind}-${r.slug}`} review={r} />
        ))}
      </div>
      {idSet.size > 0 && (
        <p className="mt-12 max-w-xl text-xs italic text-stone-400 dark:text-stone-500">
          Saved locally to your browser. Cleared if you wipe site data;
          not synced across devices.
        </p>
      )}
    </>
  );
}
