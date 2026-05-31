import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import {
  ROUTINE_DESCRIPTIONS,
  ROUTINE_LABELS,
  getReviewsInRoutine,
  getRoutinesList,
} from "@/lib/routines";

export const metadata: Metadata = {
  title: "Routines",
  description:
    "What I actually do, morning, evening, and the running supplement stack.",
  alternates: { canonical: "/routine" },
};

const TODAY = new Date().toLocaleDateString("en-US", {
  month: "long",
  year: "numeric",
});

export default function RoutineIndexPage() {
  const routines = getRoutinesList();
  const today = TODAY;

  return (
    <Container className="max-w-4xl py-12 sm:py-16">
      <div className="mb-8 flex items-baseline justify-between gap-4 text-[11px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
        <span className="flex items-baseline gap-2">
          <span className="text-rose-400">❋</span>
          <span>What I actually do</span>
        </span>
        <span className="font-mono text-stone-400 dark:text-stone-500">{today}</span>
      </div>

      <h1 className="font-serif text-[12vw] leading-[0.92] tracking-[-0.04em] text-stone-900 sm:text-8xl dark:text-stone-100">
        Routines<span className="text-rose-400">.</span>
      </h1>
      <p className="mt-6 max-w-2xl font-serif text-xl italic leading-snug text-stone-600 sm:text-2xl dark:text-stone-300">
        The reviews answer &ldquo;is this product good?&rdquo; These pages
        answer &ldquo;what do you actually do, in order?&rdquo;
      </p>

      <Link
        href="/today"
        className="group mt-10 flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white/50 px-5 py-4 transition-colors hover:border-rose-300 dark:border-stone-800 dark:bg-stone-900/30 dark:hover:border-rose-900/60"
      >
        <span>
          <span className="block font-serif text-lg text-stone-900 dark:text-stone-100">
            Track today against these <span className="text-rose-400">❋</span>
          </span>
          <span className="mt-0.5 block text-sm text-stone-500 dark:text-stone-400">
            A private, offline checklist that lives on your device. Installable to your home screen.
          </span>
        </span>
        <span className="shrink-0 text-sm text-stone-400 transition-colors group-hover:text-rose-500 dark:text-stone-500">
          Open →
        </span>
      </Link>

      <ol className="mt-12 divide-y divide-stone-200 border-t border-stone-300 dark:border-stone-800 dark:divide-stone-800">
        {routines.map((r, i) => {
          const items = getReviewsInRoutine(r);
          return (
            <li key={r}>
              <Link
                href={`/routine/${r}`}
                className="group flex items-baseline gap-6 py-8"
              >
                <span className="hidden w-14 shrink-0 font-mono text-xs text-stone-400 tabular-nums sm:inline-block dark:text-stone-500">
                  №&nbsp;{String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-3xl leading-tight tracking-tight text-stone-900 transition-colors group-hover:text-rose-700 dark:group-hover:text-rose-400 sm:text-4xl dark:text-stone-100">
                    {ROUTINE_LABELS[r]}
                  </h3>
                  <p className="mt-3 max-w-2xl font-serif text-base italic leading-relaxed text-stone-500 dark:text-stone-400">
                    {ROUTINE_DESCRIPTIONS[r]}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
                  {items.length} item{items.length === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </Container>
  );
}
