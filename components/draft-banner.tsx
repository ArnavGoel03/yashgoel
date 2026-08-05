/**
 * Shown at the top of any review whose frontmatter carries
 * `hidden: true`. Hidden entries are excluded from every listing, the
 * feed and the sitemap, but they stay reachable at their own URL so a
 * draft can be previewed and shared. Without this banner that preview
 * is indistinguishable from a published review, which is exactly the
 * confusion worth spending a component on.
 */
export function DraftBanner({ note }: { note?: string }) {
  return (
    <div className="mb-8 rounded-2xl border border-amber-300 bg-amber-50/70 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-700 dark:text-amber-500">
        Draft, not published
      </p>
      <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
        {note ??
          "This entry is hidden from every listing, the feed and the sitemap. Nothing on it is a finished opinion yet."}
      </p>
    </div>
  );
}
