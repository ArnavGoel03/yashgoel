"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { LibraryItem } from "@/lib/library";

type Tab = "reading" | "watching";

const RATING_LABEL: Record<NonNullable<LibraryItem["rating"]>, string> = {
  loved: "loved",
  liked: "liked",
  okay: "okay",
  skip: "skip",
};
const RATING_COLOR: Record<NonNullable<LibraryItem["rating"]>, string> = {
  loved: "text-emerald-700 dark:text-emerald-400",
  liked: "text-stone-700 dark:text-stone-300",
  okay: "text-amber-700 dark:text-amber-400",
  skip: "text-rose-600 dark:text-rose-400",
};

function statusOrder(items: LibraryItem[]) {
  const current = items.filter((i) => i.status === "current");
  const finished = items
    .filter((i) => i.status === "finished")
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const abandoned = items.filter((i) => i.status === "abandoned");
  return { current, finished, abandoned };
}

function Section({
  label,
  items,
  showDate,
}: {
  label: string;
  items: LibraryItem[];
  showDate: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-14">
      <h2 className="mb-6 border-b border-stone-200 pb-3 font-display text-3xl font-light tracking-tight text-stone-900 dark:border-stone-800 dark:text-stone-100">
        {label}
      </h2>
      <ul className="space-y-8">
        {items.map((it, i) => (
          <li key={`${it.title}-${i}`} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="font-serif text-xl text-stone-900 dark:text-stone-100">
                {it.link ? (
                  <a
                    href={it.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-stone-300 underline-offset-4 transition-colors hover:decoration-rose-400 dark:decoration-stone-700"
                  >
                    {it.title}
                  </a>
                ) : (
                  it.title
                )}
              </h3>
              {it.rating && (
                <span
                  className={
                    "font-mono text-[10px] uppercase tracking-[0.2em] " +
                    RATING_COLOR[it.rating]
                  }
                >
                  ❋ {RATING_LABEL[it.rating]}
                </span>
              )}
            </div>
            <p className="text-sm uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
              by {it.by}
              {showDate && it.date && (
                <span className="text-stone-300 dark:text-stone-700"> · {it.date}</span>
              )}
            </p>
            {it.note && (
              <p className="font-serif text-base italic leading-relaxed text-stone-700 dark:text-stone-300">
                {it.note}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LibraryTabs({
  reading,
  watching,
  initialTab,
}: {
  reading: LibraryItem[];
  watching: LibraryItem[];
  initialTab: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const sp = useSearchParams();

  // Keep URL in sync without triggering server navigation.
  useEffect(() => {
    const current = sp.get("tab");
    if (current === tab) return;
    const next = new URLSearchParams(sp.toString());
    next.set("tab", tab);
    window.history.replaceState(null, "", `/library?${next.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const items = tab === "reading" ? reading : watching;
  const { current, finished, abandoned } = statusOrder(items);

  return (
    <>
      <div
        role="tablist"
        aria-label="Library section"
        className="mt-12 inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white p-1 dark:border-stone-800 dark:bg-stone-900"
      >
        {(
          [
            { id: "reading", label: "Reading" },
            { id: "watching", label: "Watching" },
          ] as const
        ).map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.id)}
              className={
                "rounded-full px-5 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 " +
                (on
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                  : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100")
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="mt-12">
        <Section label="Currently" items={current} showDate />
        <Section label="Finished" items={finished} showDate />
        <Section label="Abandoned" items={abandoned} showDate={false} />
        {items.length === 0 && (
          <p className="rounded-2xl border border-stone-200 bg-stone-50 px-6 py-12 text-center font-serif italic text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
            Still gathering. Something honest will be here soon.
          </p>
        )}
      </div>
    </>
  );
}
