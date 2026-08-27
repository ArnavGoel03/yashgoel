"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useClientValue } from "@/lib/use-client-value";
import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "yashgoel-compare";
const MAX_ITEMS = 4;

type CompareCtx = {
  items: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  clear: () => void;
};

const Ctx = createContext<CompareCtx | null>(null);

const EMPTY: string[] = [];

// useSyncExternalStore calls the reader on every render and compares by
// identity, so the parse is memoised against the raw string. Returning a
// fresh array each time would re-render without end.
let lastRaw: string | null = null;
let lastParsed: string[] = EMPTY;

function readCompare(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === lastRaw) return lastParsed;
    lastRaw = raw;
    lastParsed = raw
      ? (JSON.parse(raw) as unknown[])
          .filter((x): x is string => typeof x === "string")
          .slice(0, MAX_ITEMS)
      : EMPTY;
    return lastParsed;
  } catch {
    // private mode, quota, malformed JSON
    return EMPTY;
  }
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  // The stored list is read on the first render, not written into state
  // by an effect afterwards. The old order also let the persist effect
  // below fire with the empty initial value and blank localStorage for a
  // tick before the hydrate effect put it back.
  const stored = useClientValue<string[]>(readCompare, EMPTY);
  const [override, setOverride] = useState<string[] | null>(null);
  const items = override ?? stored;
  const setItems = useCallback(
    (next: string[] | ((prev: string[]) => string[])) =>
      setOverride((prev) =>
        typeof next === "function"
          ? next(prev ?? readCompare())
          : next,
      ),
    [],
  );

  // Persist on every change. Empty array still writes "[]", which is fine.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore.
    }
  }, [items]);

  const toggle = useCallback((id: string) => {
    setItems((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_ITEMS) return prev; // silently cap
      return [...prev, id];
    });
  }, [setItems]);

  const has = useCallback((id: string) => items.includes(id), [items]);

  const clear = useCallback(() => setItems([]), [setItems]);

  return (
    <Ctx.Provider value={{ items, has, toggle, clear }}>
      {children}
      <CompareBar />
    </Ctx.Provider>
  );
}

export function useCompare(): CompareCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Outside provider (e.g. SSR pre-hydration): no-op stub.
    return {
      items: [],
      has: () => false,
      toggle: () => {},
      clear: () => {},
    };
  }
  return ctx;
}

/**
 * Floating bar in the bottom-right when at least one item is picked.
 * Hidden entirely when the tray is empty so it doesn't clutter the
 * baseline experience.
 */
function CompareBar() {
  const { items, clear } = useCompare();
  if (items.length === 0) return null;

  const href = `/compare?ids=${encodeURIComponent(items.join(","))}`;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4",
        "sm:bottom-6 sm:px-6",
      )}
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-stone-200 bg-white/95 px-4 py-2 shadow-lg backdrop-blur dark:border-stone-800 dark:bg-stone-900/95">
        <span className="text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
          Compare tray
        </span>
        <span className="font-mono text-sm tabular-nums text-stone-700 dark:text-stone-300">
          {items.length} selected
        </span>
        <button
          type="button"
          onClick={clear}
          aria-label="Clear compare tray"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100 dark:text-stone-500"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        {items.length >= 2 ? (
          <Link
            href={href}
            className="inline-flex h-8 items-center rounded-full bg-stone-900 px-4 text-xs font-medium text-white transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
          >
            Compare →
          </Link>
        ) : (
          <span className="text-xs italic text-stone-500 dark:text-stone-400">
            Add one more to compare
          </span>
        )}
      </div>
    </div>
  );
}

export function CompareToggle({ id }: { id: string }) {
  const { has, toggle } = useCompare();
  const selected = has(id);
  return (
    <button
      type="button"
      onClick={(e) => {
        // Don't let a click on the toggle also trigger the card's Link navigation.
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
      aria-pressed={selected}
      aria-label={selected ? "Remove from compare" : "Add to compare"}
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] transition-colors",
        selected
          ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
          : "border-stone-200 bg-white/90 text-stone-500 hover:border-stone-900 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-400 dark:hover:border-stone-200 dark:hover:text-stone-100",
      )}
    >
      {selected ? "In compare" : "Compare"}
    </button>
  );
}
