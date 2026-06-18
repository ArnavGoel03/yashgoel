"use client";

import { useState, useTransition } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { restoreProductImage } from "../actions";
import type { TrashEntry } from "@/lib/trash";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtDaysLeft(expiresAtIso: string): string {
  const ms = new Date(expiresAtIso).getTime() - Date.now();
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Expired (next cron will purge)";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

export function TrashTable({ entries }: { entries: TrashEntry[] }) {
  const [pending, startTransition] = useTransition();
  const [restoredOriginals, setRestoredOriginals] = useState<
    Record<string, { publicUrl: string }>
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  function onRestore(entry: TrashEntry) {
    setBusy(entry.url);
    setErrors((e) => ({ ...e, [entry.url]: "" }));
    startTransition(async () => {
      try {
        const res = await restoreProductImage(entry.url);
        if (res.ok && res.publicUrl) {
          setRestoredOriginals((r) => ({
            ...r,
            [entry.url]: { publicUrl: res.publicUrl! },
          }));
        } else {
          setErrors((e) => ({
            ...e,
            [entry.url]: res.error ?? "Restore failed.",
          }));
        }
      } catch (e) {
        setErrors((err) => ({
          ...err,
          [entry.url]: (e as Error).message,
        }));
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <ul className="mt-8 divide-y divide-stone-200 dark:divide-stone-800">
      {entries.map((entry) => {
        const restored = restoredOriginals[entry.url];
        const error = errors[entry.url];
        return (
          <li
            key={entry.url}
            className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center"
          >
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-800">
              {!restored && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-xs text-stone-700 dark:text-stone-200">
                {entry.originalKey}
              </p>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Trashed {fmtDate(entry.deletedAt)} · {fmtSize(entry.size)} ·{" "}
                <span
                  className={
                    fmtDaysLeft(entry.expiresAt).startsWith("Expired")
                      ? "text-rose-600 dark:text-rose-400"
                      : ""
                  }
                >
                  {fmtDaysLeft(entry.expiresAt)}
                </span>
              </p>
              {restored && (
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                  Restored to {restored.publicUrl}. Paste it back into the
                  product photo field on the relevant edit page.
                </p>
              )}
              {error && (
                <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">
                  {error}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!restored && (
                <button
                  type="button"
                  onClick={() => onRestore(entry)}
                  disabled={pending && busy === entry.url}
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 transition-colors hover:border-stone-900 hover:text-stone-900 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-stone-400"
                >
                  {pending && busy === entry.url ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3 w-3" />
                  )}
                  Restore
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
