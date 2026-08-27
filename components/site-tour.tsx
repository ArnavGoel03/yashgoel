"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

export type TourStep = {
  selector?: string;
  title: string;
  body: string;
  placement?: "bottom" | "top" | "center";
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Generic tour UI. Walks a reader through an ordered list of steps,
 * anchoring a floating card to a target element for each step and
 * darkening + blurring everything outside the target so the eye lands
 * on the spotlight. Portals to document.body so nothing in the page
 * tree clips it; positions are recomputed on scroll + resize via rAF
 * to avoid the per-event re-render jitter of the previous setTimeout
 * implementation.
 */
// The window is an external store with a resize event, so it is read
// through useSyncExternalStore instead of being copied into state by an
// effect. The snapshot is cached because it is compared by identity.
const SERVER_VIEWPORT = { w: 0, h: 0 };
let viewportCache = SERVER_VIEWPORT;

function readViewport(): { w: number; h: number } {
  if (
    viewportCache.w !== window.innerWidth ||
    viewportCache.h !== window.innerHeight
  ) {
    viewportCache = { w: window.innerWidth, h: window.innerHeight };
  }
  return viewportCache;
}

function subscribeToViewport(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

export function SiteTour({
  steps,
  storageKey,
  onClose,
}: {
  steps: TourStep[];
  storageKey: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  // The measurement is tagged with the step it was taken for, so moving
  // to a new step clears the highlight by derivation. Writing null into
  // state on every step change meant a synchronous setState at the top
  // of the effect below, and one extra render per step.
  const [measured, setMeasured] = useState<{
    key: string;
    rect: DOMRect | null;
  } | null>(null);
  const viewport = useSyncExternalStore(
    subscribeToViewport,
    readViewport,
    () => SERVER_VIEWPORT,
  );
  const rafRef = useRef<number | null>(null);

  const step = steps[index];
  const stepKey = step?.selector ?? "";
  const rect = measured && measured.key === stepKey ? measured.rect : null;

  const updateRect = useCallback(() => {
    const selector = step?.selector;
    if (!selector) return;
    const el = document.querySelector(selector) as HTMLElement | null;
    setMeasured({
      key: selector,
      rect: el ? el.getBoundingClientRect() : null,
    });
  }, [step]);

  // Scroll the target into view once per step change, then keep the
  // rect synced via rAF for ~800ms so the smooth scroll has time to
  // settle without us spamming setState on every animation frame
  // forever.
  useEffect(() => {
    const selector = step?.selector;
    // Nothing to measure. `rect` is already null by derivation, so there
    // is no state to clear here.
    if (!selector) return;
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const start = performance.now();
    let frame: number;
    const tick = () => {
      setMeasured({ key: selector, rect: el.getBoundingClientRect() });
      if (performance.now() - start < 800) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [step]);

  // rAF-batched scroll/resize syncing. Falls in line with the browser's
  // paint cadence, kills the every-event re-render that produced the
  // jitter the user reported.
  useEffect(() => {
    const schedule = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        updateRect();
      });
    };
    // The viewport size itself comes from the store above; resizing only
    // needs to re-measure the highlighted element.
    const onResize = schedule;
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", schedule);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [updateRect]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(true);
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function finish(saveSeen: boolean) {
    if (saveSeen) {
      try {
        localStorage.setItem(storageKey, "seen");
      } catch {
        // ignore
      }
    }
    onClose();
  }

  function next() {
    if (index === steps.length - 1) finish(true);
    else setIndex(index + 1);
  }

  function back() {
    setIndex(Math.max(0, index - 1));
  }

  if (typeof document === "undefined" || !step) return null;

  const CARD_W = Math.min(384, viewport.w - 32);
  const placement = step.placement ?? "bottom";

  let cardStyle: React.CSSProperties;
  let cardLeft = 0;
  let arrowDirection: "up" | "down" | null = null;
  let arrowOffsetPx = CARD_W / 2;

  // Spotlight: a single fixed-position box at the target, with a giant
  // box-shadow flooding everything outside. The transition keeps the
  // box silky on step changes; pointer-events: none lets the user
  // interact with the target through the visual mask.
  const HIGHLIGHT_PADDING = 8;
  const spotlightStyle: React.CSSProperties | null =
    rect && placement !== "center"
      ? {
          position: "fixed",
          left: rect.left - HIGHLIGHT_PADDING,
          top: rect.top - HIGHLIGHT_PADDING,
          width: rect.width + HIGHLIGHT_PADDING * 2,
          height: rect.height + HIGHLIGHT_PADDING * 2,
          borderRadius: 14,
          boxShadow: "0 0 0 9999px rgba(28, 25, 23, 0.55)",
          transition:
            "left 280ms cubic-bezier(0.22, 1, 0.36, 1), top 280ms cubic-bezier(0.22, 1, 0.36, 1), width 280ms cubic-bezier(0.22, 1, 0.36, 1), height 280ms cubic-bezier(0.22, 1, 0.36, 1)",
          pointerEvents: "none",
        }
      : null;
  const ringStyle: React.CSSProperties | null = spotlightStyle
    ? {
        ...spotlightStyle,
        boxShadow: "none",
        outline: "1.5px solid rgba(251, 113, 133, 0.85)",
        outlineOffset: 0,
      }
    : null;

  if (rect && placement === "bottom") {
    cardLeft = clamp(
      rect.left + rect.width / 2 - CARD_W / 2,
      16,
      viewport.w - CARD_W - 16,
    );
    cardStyle = {
      position: "fixed",
      left: cardLeft,
      top: Math.min(rect.bottom + 18, viewport.h - 220),
      width: CARD_W,
    };
    arrowDirection = "up";
    arrowOffsetPx = clamp(
      rect.left + rect.width / 2 - cardLeft,
      20,
      CARD_W - 20,
    );
  } else if (rect && placement === "top") {
    cardLeft = clamp(
      rect.left + rect.width / 2 - CARD_W / 2,
      16,
      viewport.w - CARD_W - 16,
    );
    cardStyle = {
      position: "fixed",
      left: cardLeft,
      bottom: Math.min(viewport.h - rect.top + 18, viewport.h - 40),
      width: CARD_W,
    };
    arrowDirection = "down";
    arrowOffsetPx = clamp(
      rect.left + rect.width / 2 - cardLeft,
      20,
      CARD_W - 20,
    );
  } else {
    cardStyle = {
      position: "fixed",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: CARD_W,
    };
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      {spotlightStyle ? (
        <>
          {/* Transparent full-screen click-catcher. Sits below the
              spotlight visually but receives clicks anywhere outside
              the lit area to close the tour. The spotlight itself is
              pointer-events:none so clicks at the target pass through
              to the page. */}
          <button
            type="button"
            aria-label="Close tour"
            onClick={() => finish(true)}
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div style={spotlightStyle} aria-hidden />
          {ringStyle && <div style={ringStyle} aria-hidden />}
        </>
      ) : (
        // Center placement: no target, dim the whole screen with blur.
        <button
          type="button"
          aria-label="Close tour"
          onClick={() => finish(true)}
          className="absolute inset-0 bg-stone-900/45 backdrop-blur-[2px] transition-opacity dark:bg-black/70"
        />
      )}

      <div
        style={cardStyle}
        className="relative animate-[tour-card_220ms_cubic-bezier(0.22,1,0.36,1)] rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-800 dark:bg-stone-900"
      >
        {arrowDirection === "up" && (
          <>
            <span
              aria-hidden
              style={{ left: arrowOffsetPx }}
              className="absolute -top-[9px] -translate-x-1/2 border-x-[9px] border-b-[9px] border-x-transparent border-b-stone-200 dark:border-b-stone-800"
            />
            <span
              aria-hidden
              style={{ left: arrowOffsetPx }}
              className="absolute -top-[7px] -translate-x-1/2 border-x-[8px] border-b-[8px] border-x-transparent border-b-white dark:border-b-stone-900"
            />
          </>
        )}
        {arrowDirection === "down" && (
          <>
            <span
              aria-hidden
              style={{ left: arrowOffsetPx }}
              className="absolute -bottom-[9px] -translate-x-1/2 border-x-[9px] border-t-[9px] border-x-transparent border-t-stone-200 dark:border-t-stone-800"
            />
            <span
              aria-hidden
              style={{ left: arrowOffsetPx }}
              className="absolute -bottom-[7px] -translate-x-1/2 border-x-[8px] border-t-[8px] border-x-transparent border-t-white dark:border-t-stone-900"
            />
          </>
        )}

        <div className="mb-3 flex items-baseline justify-between text-[11px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
          <span className="flex items-baseline gap-2">
            <span className="text-rose-400">❋</span>
            <span>Tour</span>
          </span>
          <span className="font-mono text-stone-400 dark:text-stone-500">
            № {String(index + 1).padStart(2, "0")} /{" "}
            {String(steps.length).padStart(2, "0")}
          </span>
        </div>
        <h3
          id="tour-title"
          className="font-serif text-2xl leading-tight text-stone-900 dark:text-stone-100"
        >
          {step.title}
          <span className="text-rose-400">.</span>
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          {step.body}
        </p>
        <div className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
          <kbd className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[10px] tracking-normal text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400">
            ←
          </kbd>
          <kbd className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[10px] tracking-normal text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400">
            →
          </kbd>
          <span>navigate</span>
          <span className="text-stone-300 dark:text-stone-700">·</span>
          <kbd className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[10px] tracking-normal text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400">
            esc
          </kbd>
          <span>close</span>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => finish(true)}
            className="text-[10px] uppercase tracking-[0.18em] text-stone-400 transition-colors hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={back}
                className="rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-700 transition-colors hover:border-stone-900 dark:border-stone-700 dark:text-stone-200 dark:hover:border-stone-400"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="rounded-full bg-stone-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
            >
              {index === steps.length - 1 ? "Done" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tour configurations
// ────────────────────────────────────────────────────────────────────────────

export const HOME_TOUR_STORAGE_KEY = "yashgoel-tour-seen";
export const LISTING_TOUR_STORAGE_KEY = "yashgoel-listing-tour-seen";

/**
 * First-visit tour for the home page. Walks through the three review
 * categories one by one (so readers learn what each covers), then the
 * search + theme affordances, then the hero stats and CTAs.
 */
export const HOME_STEPS: TourStep[] = [
  {
    title: "Welcome in",
    body: "A personal review site: skincare, supplements, oral care. Every product has lived in my routine for at least a month before it earned a verdict. Quick tour, thirty seconds.",
    placement: "center",
  },
  {
    selector: "[data-tour='tab-skincare']",
    title: "Skincare",
    body: "Cleansers, serums, moisturizers, sunscreens, actives. Everything that has lived on my face for at least a month.",
    placement: "bottom",
  },
  {
    selector: "[data-tour='tab-supplements']",
    title: "Supplements",
    body: "Vitamins, minerals, protein, nootropics. Dose, duration, and what I actually felt. No 'big if true' copy.",
    placement: "bottom",
  },
  {
    selector: "[data-tour='tab-oralcare']",
    title: "Oral care",
    body: "Electric brushes, pastes, mouthwash, flossing kit. Smaller section, but held to the same month-minimum rule.",
    placement: "bottom",
  },
  {
    selector: "[data-tour='search']",
    title: "Search everything",
    body: "Click the magnifier, or press ⌘K (Ctrl+K on Windows) anywhere. Fuzzy-matches across reviews, notes, and primers.",
    placement: "bottom",
  },
  {
    selector: "[data-tour='theme']",
    title: "Light or dark",
    body: "Sun or moon, pick the one you want. Your choice is remembered across sessions.",
    placement: "bottom",
  },
  {
    selector: "[data-tour='stats']",
    title: "The honesty line",
    body: "Zero sponsored products. Nothing ever sent free by a brand. If I stopped using something, the review says that.",
    placement: "top",
  },
  {
    selector: "[data-tour='cta']",
    title: "Pick an entry point",
    body: "Latest reviews, or 'what's on the shelf' for the monthly snapshot of what I'm currently using.",
    placement: "top",
  },
];

/**
 * First-visit tour for a category listing page (skincare, supplements,
 * oral care). Explains the masthead stats and every filter / sort
 * control so the filter rail makes sense on first sight.
 */
export const LISTING_STEPS: TourStep[] = [
  {
    title: "How this shelf works",
    body: "The listing pages have more controls than the home page. Thirty-second walkthrough of the filter rail and a product card.",
    placement: "center",
  },
  {
    selector: "[data-tour-listing='stats']",
    title: "Verdict counts at a glance",
    body: "How many products are on the shelf, how many earned a 'recommend', how many landed at 'okayish', and how many are still in testing.",
    placement: "top",
  },
  {
    selector: "[data-tour-listing='categories']",
    title: "Sub-category filter",
    body: "Narrow to cleansers, serums, protein powders, toothpastes. Click a chip to toggle that category on; click again or tap 'All' to clear.",
    placement: "bottom",
  },
  {
    selector: "[data-tour-listing='sort']",
    title: "Sort the shelf",
    body: "Recent (default), verdict (recommends first), price (low to high), or cost per day for supplements where servings matter more than sticker price.",
    placement: "bottom",
  },
  {
    selector: "[data-tour-listing='region']",
    title: "Region filter",
    body: "Some products are only stocked in one region. Pick India, USA, or UK to hide everything you can't buy from where you are.",
    placement: "bottom",
  },
  {
    selector: "[data-tour-listing='card']",
    title: "A product card",
    body: "Verdict pill in the top-right. Compare toggle in the bottom-left. Click anywhere else on the card to open the full review.",
    placement: "top",
  },
];
