"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Mic, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import type { SearchItem } from "@/lib/search-index";

/**
 * Global command palette. Opens with Cmd/Ctrl+K from anywhere on the
 * site. Closes with Escape or click-outside.
 *
 * Keyboard model:
 *   ↑ / ↓  navigate results
 *   Enter  open selected
 *   Esc    close
 */
export function CommandPalette({ items }: { items: SearchItem[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [requestedCursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();
  const voice = useSpeechRecognition({
    onTranscript: (t) => {
      setQuery(t);
      setCursor(0);
    },
  });

  // Global keybinding + a `palette:open` custom event so non-keyboard
  // entry points (the header search icon) can open the same palette
  // instead of navigating to a separate /search page.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't steal Cmd+K from form fields, unless the palette is
      // already open (Cmd+K should toggle even when the palette input
      // is focused).
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA";

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (!inField || open) {
          e.preventDefault();
          setOpen((o) => !o);
        }
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("palette:open", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("palette:open", onOpen);
    };
  }, [open]);

  // Clearing the query belongs to the open/closed transition, not to a
  // commit-time effect. React's documented way to reset state when a
  // prop changes is to compare against the previous value during
  // render; focusing the input stays in the effect because it is a real
  // side effect on the DOM.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) {
      setQuery("");
      setCursor(0);
    }
  }

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 12);
    const terms = q.split(/\s+/).filter(Boolean);
    return items
      .map((item) => {
        let score = 0;
        for (const t of terms) {
          if (!item.haystack.includes(t)) return null;
          if (item.title.toLowerCase().includes(t)) score += 3;
          if (item.subtitle.toLowerCase().includes(t)) score += 2;
          score += 1;
        }
        return { item, score };
      })
      .filter((x): x is { item: SearchItem; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((r) => r.item);
  }, [items, query]);

  // Keep the cursor in range when results shrink. Derived at render
  // rather than corrected afterwards, so a shrinking result list never
  // paints a frame with the cursor off the end.
  const cursor = Math.min(requestedCursor, Math.max(0, results.length - 1));

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const target = results[cursor];
      if (target) go(target.href);
      return;
    }
    // Common "quick commands", not fuzzy-matched, just hardcoded for
    // the most-used pages.
    if (e.key === "g" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setOpen(false);
      router.push("/");
    }
  }

  // Scroll the active row into view when cursor moves.
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[cursor] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[100] flex items-start justify-center bg-stone-900/25 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900"
      >
        <div className="relative border-b border-stone-200 dark:border-stone-800">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={voice.listening ? "Listening…" : "Jump to a page, product, or primer…"}
            className={cn(
              "w-full bg-transparent py-4 pl-11 pr-24 text-base font-serif italic text-stone-900 placeholder:text-stone-400 focus:outline-none dark:text-stone-100",
            )}
            type="search"
            aria-label="Search"
            aria-autocomplete="list"
            aria-controls="command-palette-list"
          />
          {(() => {
            const title = !voice.supported
              ? "Voice search needs Chrome, Edge, or recent Safari"
              : voice.error === "denied"
                ? "Microphone permission was blocked"
                : voice.listening
                  ? "Stop voice input"
                  : "Voice search";
            return (
              <button
                type="button"
                onClick={voice.supported ? voice.toggle : undefined}
                disabled={!voice.supported}
                aria-label={title}
                aria-pressed={voice.listening}
                title={title}
                className={cn(
                  "absolute right-12 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition-colors sm:h-7 sm:w-7",
                  voice.listening
                    ? "bg-rose-500 text-white animate-pulse"
                    : voice.error === "denied"
                      ? "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                      : !voice.supported
                        ? "text-stone-300 cursor-not-allowed dark:text-stone-700"
                        : "text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100",
                )}
              >
                <Mic className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </button>
            );
          })()}
          <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[10px] text-stone-500 sm:inline dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400">
            esc
          </kbd>
        </div>

        <ul
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          className="max-h-[50vh] overflow-y-auto"
        >
          {results.map((item, i) => (
            <li
              key={item.id}
              role="option"
              aria-selected={i === cursor}
              onMouseEnter={() => setCursor(i)}
              onClick={() => go(item.href)}
              className={cn(
                "flex cursor-pointer items-baseline justify-between gap-4 border-l-2 px-4 py-2.5 transition-colors",
                i === cursor
                  ? "border-rose-400 bg-rose-50/60 dark:bg-rose-950/20"
                  : "border-transparent hover:bg-stone-50 dark:hover:bg-stone-800/50",
              )}
            >
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500">
                  {item.subtitle}
                </p>
                <p className="truncate font-serif text-sm text-stone-900 dark:text-stone-100">
                  {item.title}
                </p>
              </div>
              {item.verdict && (
                <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] italic text-stone-400 dark:text-stone-500">
                  {item.verdict}
                </span>
              )}
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-4 py-10 text-center font-serif text-sm italic text-stone-500 dark:text-stone-400">
              nothing matches yet. try a softer word.
            </li>
          )}
        </ul>

        <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50/80 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-stone-400 dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-500">
          <span className="inline-flex items-center gap-2">
            <kbd className="font-mono">↑↓</kbd>
            navigate
            <span className="text-stone-300 dark:text-stone-700">·</span>
            <kbd className="font-mono">enter</kbd>
            open
          </span>
          <span className="hidden sm:inline-flex items-center gap-1">
            <kbd className="font-mono">⌘K</kbd>
            to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
