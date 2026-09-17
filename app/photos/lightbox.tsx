"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type LightboxPhoto = {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
  location?: string;
  date: string;
};

/**
 * Build a Next/Image-optimized URL for the lightbox. The browser gets
 * an AVIF/WebP at the requested width instead of the full camera JPG
 * (~5-7 MB) which keeps the open-on-click feel snappy. The /_next/image
 * proxy already lives on the same origin and is responsible for the
 * actual transcode + caching.
 */
function optimized(src: string, w = 2400, q = 88): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`;
}

function lightboxTrigger(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element
    ? target.closest<HTMLElement>("[data-lightbox-index]")
    : null;
}


/**
 * Click-to-open lightbox for /photos.
 *
 * - Click any element with `data-lightbox-index={N}` (where N is the
 *   index into the photos array passed in) to open the lightbox at
 *   that frame.
 * - Arrow keys move between frames. Escape closes. Click backdrop or
 *   the close button to close.
 * - URL hash updates to `#lightbox-N` for shareable deep links.
 */
// Lightbox interaction state — zoom level, pan offsets, toggles. Reset
// whenever the open photo changes so each frame starts at base view.
type LightboxView = {
  zoom: number;
  panX: number;
  panY: number;
  showInfo: boolean;
  whiteBg: boolean;
};
const BASE_VIEW: LightboxView = {
  zoom: 1, panX: 0, panY: 0, showInfo: false, whiteBg: false,
};

function vtName(caption: string | undefined): string {
  const slug = (caption || "photo")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `vt-${slug || "photo"}`;
}

export function LightboxRoot({ photos }: { photos: LightboxPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [view, setView] = useState<LightboxView>(BASE_VIEW);

  const close = useCallback(() => setOpen(null), []);
  const prev = useCallback(() => {
    setOpen((i) => (i === null || i <= 0 ? i : i - 1));
    setView(BASE_VIEW);
  }, []);
  const next = useCallback(() => {
    setOpen((i) => (i === null || i >= photos.length - 1 ? i : i + 1));
    setView(BASE_VIEW);
  }, [photos.length]);

  const zoomIn = useCallback(
    () => setView((v) => ({ ...v, zoom: Math.min(4, v.zoom + 0.5) })),
    [],
  );
  const zoomOut = useCallback(
    () => setView((v) => {
      const z = Math.max(1, v.zoom - 0.5);
      return z === 1 ? BASE_VIEW : { ...v, zoom: z };
    }),
    [],
  );
  const resetView = useCallback(() => setView(BASE_VIEW), []);
  const toggleInfo = useCallback(
    () => setView((v) => ({ ...v, showInfo: !v.showInfo })),
    [],
  );
  const toggleBg = useCallback(
    () => setView((v) => ({ ...v, whiteBg: !v.whiteBg })),
    [],
  );

  // Trigger from any [data-lightbox-index] click on the page.
  // Also preload the lightbox-size variant on mouseenter so the click
  // feels instant by the time it lands.
  const preloaded = useRef<Set<number>>(new Set());
  useEffect(() => {
    const click = (e: MouseEvent) => {
      const el = lightboxTrigger(e.target);
      if (!el) return;
      if (el.closest("[data-lightbox-overlay]")) return;
      const idx = Number(el.dataset.lightboxIndex);
      if (!Number.isFinite(idx) || idx < 0 || idx >= photos.length)
        return;
      e.preventDefault();
      setOpen(idx);
    };
    function warm(idx: number) {
      if (preloaded.current.has(idx)) return;
      preloaded.current.add(idx);
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = optimized(photos[idx].src);
      // Don't override if already there
      document.head.appendChild(link);
    }
    const enter = (e: MouseEvent) => {
      const el = lightboxTrigger(e.target);
      if (!el) return;
      const idx = Number(el.dataset.lightboxIndex);
      if (!Number.isFinite(idx) || idx < 0 || idx >= photos.length)
        return;
      warm(idx);
    };
    document.addEventListener("click", click, { capture: true });
    document.addEventListener("mouseenter", enter, { capture: true });
    return () => {
      document.removeEventListener("click", click, { capture: true });
      document.removeEventListener("mouseenter", enter, { capture: true });
    };
  }, [photos]);

  // Idle pre-warm of the first ~20 photos. Cold first-clicks become
  // warm clicks for the most-visible part of the gallery.
  useEffect(() => {
    if (photos.length === 0) return;
    const ric: typeof requestIdleCallback | undefined =
      typeof window !== "undefined"
        ? (window as unknown as { requestIdleCallback?: typeof requestIdleCallback })
            .requestIdleCallback
        : undefined;
    const schedule = ric ?? ((cb: IdleRequestCallback) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline), 800));
    const ids: number[] = [];
    const warmEarly = () => {
      for (let i = 0; i < Math.min(20, photos.length); i++) {
        if (preloaded.current.has(i)) continue;
        preloaded.current.add(i);
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = optimized(photos[i].src);
        document.head.appendChild(link);
      }
    };
    const id = schedule(() => warmEarly()) as unknown as number;
    ids.push(id);
    return () => {
      ids.forEach((i) => {
        if (typeof window !== "undefined") {
          const cic = (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
          if (cic) cic(i);
          else clearTimeout(i);
        }
      });
    };
  }, [photos]);

  // Keyboard navigation while open
  useEffect(() => {
    if (open === null) return;
    const handler = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft" || k === "k") prev();
      else if (e.key === "ArrowRight" || k === "j") next();
      else if (k === "+" || k === "=") { e.preventDefault(); zoomIn(); }
      else if (k === "-" || k === "_") { e.preventDefault(); zoomOut(); }
      else if (k === "0") { e.preventDefault(); resetView(); }
      else if (k === "i") { e.preventDefault(); toggleInfo(); }
      else if (k === "w") { e.preventDefault(); toggleBg(); }
      else if (k === "f") {
        e.preventDefault();
        if (document.fullscreenElement) document.exitFullscreen?.();
        else document.documentElement.requestFullscreen?.();
      }
    };
    window.addEventListener("keydown", handler);
    // Lock body scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, prev, next, zoomIn, zoomOut, resetView, toggleInfo, toggleBg]);

  // Preload adjacent photos so prev/next is instant
  useEffect(() => {
    if (open === null) return;
    const adjacent = [open - 1, open + 1, open - 2, open + 2].filter(
      (i) => i >= 0 && i < photos.length && i !== open,
    );
    const tags: HTMLLinkElement[] = [];
    for (const i of adjacent) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = optimized(photos[i].src);
      document.head.appendChild(link);
      tags.push(link);
    }
    return () => {
      tags.forEach((t) => t.remove());
    };
  }, [open, photos]);

  // Touch gesture handling: single-finger swipe = prev/next, two-finger
  // pinch = zoom, double-tap = toggle 2x zoom. Pointer events unify
  // mouse + touch + pen so a single handler stack covers everything.
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const swipeStart = useRef<{ x: number; t: number } | null>(null);
  const initialPinch = useRef<number | null>(null);
  const lastTap = useRef<number>(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 1) {
        swipeStart.current = { x: e.clientX, t: performance.now() };
        const now = performance.now();
        if (now - lastTap.current < 300) {
          // Double tap → toggle 2x zoom
          setView((v) => (v.zoom > 1 ? BASE_VIEW : { ...v, zoom: 2 }));
        }
        lastTap.current = now;
      } else if (pointers.current.size === 2) {
        const [a, b] = Array.from(pointers.current.values());
        initialPinch.current = Math.hypot(a.x - b.x, a.y - b.y);
        swipeStart.current = null;
      }
    },
    [],
  );
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2 && initialPinch.current !== null) {
        const [a, b] = Array.from(pointers.current.values());
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const scale = dist / initialPinch.current;
        const newZoom = Math.max(1, Math.min(4, scale));
        setView((v) => ({ ...v, zoom: newZoom }));
      }
    },
    [],
  );
  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = swipeStart.current;
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) initialPinch.current = null;
      if (start && view.zoom === 1) {
        const dx = e.clientX - start.x;
        const dt = performance.now() - start.t;
        // Fast horizontal swipe = prev/next
        if (Math.abs(dx) > 60 && dt < 400) {
          if (dx > 0) prev();
          else next();
        }
      }
      swipeStart.current = null;
    },
    [view.zoom, prev, next],
  );

  if (open === null) return null;
  const photo = photos[open];
  if (!photo) return null;

  return (
    <div
      data-lightbox-overlay
      onClick={close}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-sm transition-colors duration-300 ${view.whiteBg ? "bg-stone-50/95" : "bg-black/95"}`}
      style={{ touchAction: view.zoom > 1 ? "none" : "pan-y" }}
    >
      {/* Close + frame number */}
      <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-5 text-stone-300">
        <span className="font-mono text-[11px] uppercase tracking-[0.24em]">
          {String(open + 1).padStart(3, "0")} / {String(photos.length).padStart(3, "0")}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
          className="font-mono text-xs uppercase tracking-[0.22em] text-stone-300 hover:text-white"
          aria-label="Close"
        >
          Close ✕
        </button>
      </div>

      {/* Prev */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          prev();
        }}
        disabled={open <= 0}
        className="absolute left-4 top-1/2 z-10 -translate-y-1/2 select-none text-4xl text-stone-300 transition-opacity hover:text-white disabled:opacity-20 sm:left-8 sm:text-5xl"
        aria-label="Previous photo"
      >
        ‹
      </button>

      {/* Next */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          next();
        }}
        disabled={open >= photos.length - 1}
        className="absolute right-4 top-1/2 z-10 -translate-y-1/2 select-none text-4xl text-stone-300 transition-opacity hover:text-white disabled:opacity-20 sm:right-8 sm:text-5xl"
        aria-label="Next photo"
      >
        ›
      </button>

      {/* Image */}
      <figure
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col items-center justify-center px-4 py-16 sm:px-16 sm:py-20"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.src}
          src={optimized(photo.src, 2400, 88)}
          alt={photo.alt}
          draggable={false}
          loading="eager"
          decoding="async"
          className="max-h-[78vh] max-w-full select-none object-contain transition-transform duration-200 ease-out will-change-transform"
          style={{
            transform: `scale(${view.zoom}) translate(${view.panX}px, ${view.panY}px)`,
            viewTransitionName: vtName(photo.caption),
          }}
        />
        <figcaption className={`mt-5 max-w-3xl px-6 text-center ${view.whiteBg ? "text-stone-700" : "text-stone-100"}`}>
          {photo.caption && (
            <p className="font-serif text-lg italic sm:text-xl">
              {photo.caption}
            </p>
          )}
          <p className={`mt-2 font-mono text-[10px] uppercase tracking-[0.22em] ${view.whiteBg ? "text-stone-500" : "text-stone-400"}`}>
            {photo.date}
            {photo.location && (
              <>
                <span aria-hidden className={`mx-2 ${view.whiteBg ? "text-stone-300" : "text-stone-600"}`}>·</span>
                <span>{photo.location}</span>
              </>
            )}
          </p>
        </figcaption>
      </figure>

      {/* Info panel — toggled with I. Slides in from the right with the
          full EXIF + caption details. */}
      {view.showInfo && (
        <aside
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 top-0 bottom-0 w-80 max-w-[80vw] overflow-y-auto p-8 backdrop-blur-md ${view.whiteBg ? "bg-stone-100/95 text-stone-800" : "bg-black/80 text-stone-100"}`}
        >
          <h3 className="mb-4 font-serif text-2xl italic">{photo.caption}</h3>
          <p className="mb-6 text-sm leading-relaxed opacity-80">{photo.alt}</p>
          <dl className="space-y-2 font-mono text-[11px] uppercase tracking-[0.18em]">
            {photo.location && (
              <div className="flex justify-between gap-3 opacity-80">
                <dt>Place</dt><dd className="text-right normal-case">{photo.location}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3 opacity-80">
              <dt>Date</dt><dd className="text-right tabular-nums">{photo.date}</dd>
            </div>
          </dl>
          <p className="mt-8 text-[10px] uppercase tracking-[0.22em] opacity-50">
            Press I to close
          </p>
        </aside>
      )}

      {/* Keyboard / gesture hints */}
      <div className={`absolute bottom-4 right-4 hidden text-[10px] uppercase tracking-[0.22em] sm:block ${view.whiteBg ? "text-stone-500" : "text-stone-500"}`}>
        ← → arrows · + − zoom · i info · w bg · f full · esc close
      </div>
    </div>
  );
}
