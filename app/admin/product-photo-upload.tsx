"use client";

import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { deleteProductImage, uploadProductImage } from "./actions";
import { cn } from "@/lib/utils";

// Host(s) we serve managed images from and can therefore delete
// remotely. The R2 public origin is configured server-side via
// R2_PUBLIC_BASE; the client only needs to recognize it, so we expose
// just the host through NEXT_PUBLIC_R2_PUBLIC_HOST. Falls back to the
// `*.r2.dev` dev-bucket suffix when that var is unset.
const R2_PUBLIC_HOST = process.env.NEXT_PUBLIC_R2_PUBLIC_HOST ?? "";

function isOurImageUrl(u: string): boolean {
  try {
    const host = new URL(u).hostname.toLowerCase();
    if (R2_PUBLIC_HOST && host === R2_PUBLIC_HOST.toLowerCase()) return true;
    return host.endsWith(".r2.dev");
  } catch {
    return false;
  }
}

export function ProductPhotoUpload({
  initialUrl,
  fieldName,
}: {
  initialUrl?: string;
  fieldName: string;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onPick(file: File | null) {
    if (!file) return;
    setError(null);
    setPending(true);
    // If we are replacing an existing blob asset, delete the old one
    // first so it doesn't sit orphaned in storage forever.
    const previous = url;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadProductImage(fd);
      if (!result.ok || !result.url) {
        setError(result.error ?? "Upload failed.");
        return;
      }
      setUrl(result.url);
      if (previous && previous !== result.url && isOurImageUrl(previous)) {
        // Fire-and-forget; if the cleanup fails we just leave the old
        // file behind, the upload itself already succeeded.
        deleteProductImage(previous).catch(() => undefined);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function onRemove() {
    setError(null);
    if (!url) return;
    if (isOurImageUrl(url)) {
      setDeleting(true);
      try {
        const res = await deleteProductImage(url);
        if (!res.ok) {
          setError(res.error ?? "Delete failed.");
          return;
        }
      } catch (e) {
        setError((e as Error).message);
        return;
      } finally {
        setDeleting(false);
      }
    }
    // For non-Blob URLs (local /products/... paths or pasted external
    // URLs), there's nothing to delete remotely; just clear the field.
    setUrl("");
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={fieldName} value={url} />

      <div
        onClick={() =>
          !pending && !deleting && fileInputRef.current?.click()
        }
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!pending && !deleting)
            onPick(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "relative cursor-pointer rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 p-6 text-center transition-colors dark:border-stone-700 dark:bg-stone-900",
          !(pending || deleting) &&
            "hover:border-stone-300 hover:bg-stone-100 dark:hover:border-stone-600 dark:hover:bg-stone-800",
          (pending || deleting) && "opacity-60",
        )}
      >
        {url ? (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Product photo"
              className="max-h-48 rounded-lg object-contain"
            />
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={pending || deleting}
                className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-stone-700 transition-colors hover:border-stone-400 hover:text-stone-900 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:border-stone-400"
              >
                <Upload className="h-3 w-3" />
                Replace
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                disabled={pending || deleting}
                className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700 transition-colors hover:border-rose-400 hover:text-rose-900 disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:border-rose-700 dark:hover:text-rose-200"
              >
                {deleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                {deleting
                  ? "Moving"
                  : isOurImageUrl(url)
                    ? "Move to trash"
                    : "Remove"}
              </button>
            </div>
            {isOurImageUrl(url) && (
              <p className="text-[10px] text-stone-400 dark:text-stone-500">
                Stored on Cloudflare R2. Delete removes it from storage.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 py-3">
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
            ) : (
              <Upload className="h-5 w-5 text-stone-400" />
            )}
            <p className="text-sm text-stone-700 dark:text-stone-200">
              {pending ? "Uploading…" : "Drop an image, or click to choose"}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Stored at original quality on Cloudflare R2.
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />

      {error && <p className="text-xs text-rose-700 dark:text-rose-400">{error}</p>}

      <details className="text-xs text-stone-500 dark:text-stone-400">
        <summary className="cursor-pointer hover:text-stone-700 dark:hover:text-stone-200">
          Or paste an image URL instead
        </summary>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500"
        />
      </details>
    </div>
  );
}
