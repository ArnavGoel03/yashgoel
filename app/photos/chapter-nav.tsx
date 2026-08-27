"use client";

import { useEffect, useState } from "react";

type Chapter = { id: string; label: string };

/**
 * Sticky chapter nav. Editorial italic-serif labels, no pills, with a
 * hairline rose underline marking the active section. Tracks scroll
 * via IntersectionObserver.
 */
export function ChapterNav({ chapters }: { chapters: Chapter[] }) {
  const [active, setActive] = useState<string>(chapters[0]?.id ?? "");

  useEffect(() => {
    if (chapters.length === 0) return;
    const els = chapters
      .map((c) => document.getElementById(c.id))
      .filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      {
        rootMargin: "-40% 0px -40% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [chapters]);

  function jump(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    const url = new URL(window.location.href);
    url.hash = id;
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <nav
      aria-label="Chapter navigation"
      className="sticky top-0 z-40 border-b border-stone-200/60 bg-white/75 px-6 backdrop-blur-md dark:border-stone-800/60 dark:bg-stone-950/75"
    >
      <ul className="mx-auto flex max-w-5xl items-baseline justify-center gap-8 overflow-x-auto py-4 sm:gap-12 sm:py-5">
        {chapters.map((c) => {
          const isActive = c.id === active;
          return (
            <li key={c.id} className="shrink-0">
              <a
                href={`#${c.id}`}
                onClick={(e) => jump(e, c.id)}
                className={`relative block font-serif text-sm italic transition-colors sm:text-base ${
                  isActive
                    ? "text-stone-900 dark:text-stone-50"
                    : "text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-200"
                }`}
              >
                {c.label}
                <span
                  aria-hidden
                  className={`pointer-events-none absolute -bottom-2 left-1/2 h-px -translate-x-1/2 bg-rose-400 transition-all duration-300 ${
                    isActive ? "w-8 opacity-100" : "w-0 opacity-0"
                  }`}
                />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
