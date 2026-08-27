"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * The photo well inside a listing-page product card.
 * One photo: behaves exactly like the old static well.
 * Multiple photos: cycles on hover (desktop) or via swipe (mobile),
 * with corner dots that show how many shots exist and which is active.
 *
 * On <img> error (404, network, broken path) the photo is dropped
 * from the rotation. If every photo fails we fall back to the brand
 * monogram watermark so the card never shows the browser's broken-
 * image icon (the small "?").
 */
export function ProductCardPhoto({
  photos,
  alt,
  brand,
}: {
  photos: string[];
  alt: string;
  /**
   * Used for the silent fallback when every photo errors. Falls back
   * to the first character of `alt` if not provided.
   */
  brand?: string;
}) {
  const [errored, setErrored] = useState<Record<string, boolean>>({});
  const valid = useMemo(
    () => photos.filter((p) => !errored[p]),
    [photos, errored],
  );
  const [requested, setRequested] = useState(0);
  // A photo that fails to load drops out of `valid`, which can leave the
  // requested index past the end. Clamping here is a render-time
  // derivation of state we already hold; the effect this replaces set
  // state during commit and re-rendered the card a second time.
  const active = requested < valid.length ? requested : 0;
  const setActive = setRequested;
  const multi = valid.length > 1;
  const allBroken = photos.length > 0 && valid.length === 0;
  const hovering = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCycle() {
    if (!multi || intervalRef.current) return;
    hovering.current = true;
    intervalRef.current = setInterval(() => {
      setActive((i) => (i + 1) % valid.length);
    }, 1200);
  }
  function stopCycle() {
    hovering.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setActive(0);
  }
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Touch swipe: a horizontal drag advances or rewinds the active photo.
  const touchStart = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!multi || touchStart.current === null) return;
    const end = e.changedTouches[0]?.clientX ?? touchStart.current;
    const dx = end - touchStart.current;
    if (Math.abs(dx) > 30) {
      setActive((i) =>
        dx < 0 ? (i + 1) % valid.length : (i - 1 + valid.length) % valid.length,
      );
    }
    touchStart.current = null;
  }

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={startCycle}
      onMouseLeave={stopCycle}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-3">
        {/* mix-blend-multiply makes the source white background blend
            into the cream well, so the product silhouette floats
            cleanly on the card instead of sitting on a hard
            rectangle. */}
        {!allBroken && valid[active] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={valid[active]}
            src={valid[active]}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={() => {
              const src = valid[active];
              if (src) setErrored((e) => ({ ...e, [src]: true }));
            }}
            className="h-full w-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-[1.03] animate-[fade-in_220ms_ease-out]"
          />
        )}
        {allBroken && (
          // Silent fallback when every photo failed to load. Reads as
          // the same brand-monogram placeholder cards without a photo
          // get from the start, so a broken image never reveals the
          // browser's "?" icon.
          <span className="px-6 text-center font-serif text-4xl leading-[0.95] tracking-tight text-stone-400/90 sm:text-5xl">
            {brand ?? alt.charAt(0)}
          </span>
        )}
      </div>
      {/* Corner registration marks. Hidden by default; fade in on
          hover. Reads as a magazine-grid accent that doesn't fight the
          product photo when at rest. */}
      <span aria-hidden className="card-corner-mark left-3 top-3 border-l border-t" />
      <span aria-hidden className="card-corner-mark right-3 top-3 border-r border-t" />
      <span aria-hidden className="card-corner-mark bottom-3 left-3 border-b border-l" />
      <span aria-hidden className="card-corner-mark bottom-3 right-3 border-b border-r" />
      {multi && (
        <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 backdrop-blur dark:bg-stone-900/80">
          {photos.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={
                "h-1.5 w-1.5 rounded-full transition-colors " +
                (i === active
                  ? "bg-stone-800 dark:bg-stone-100"
                  : "bg-stone-300 dark:bg-stone-700")
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
