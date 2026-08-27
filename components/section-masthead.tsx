import type { ReviewSummary } from "@/lib/types";

// ────────────────────────────────────────────────────────────────────────────
// Pure helpers. Plain functions, easy to test, easy to move.
// ────────────────────────────────────────────────────────────────────────────

/** Pad single-digit counts so "08" reads like an intentional edition number
 *  instead of a lonely chunk of Fraunces. */
const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

function computeStats(reviews: ReviewSummary[]) {
  const recommendCount = reviews.filter((r) => r.verdict === "recommend").length;
  const okayCount = reviews.filter((r) => r.verdict === "okay").length;
  const badCount = reviews.filter((r) => r.verdict === "bad").length;
  const testingCount = reviews.filter((r) => !r.verdict).length;
  return {
    total: reviews.length,
    recommendCount,
    okayCount,
    badCount,
    testingCount,
  };
}

// Evaluated at module load (build/deploy time) - keeps Next 16
// cacheComponents prerender happy and updates each deploy.
const ISSUE_DATE = new Date().toLocaleDateString("en-US", {
  month: "long",
  year: "numeric",
});
function issueDate(): string {
  return ISSUE_DATE;
}

// ────────────────────────────────────────────────────────────────────────────
// Subcomponents. Each takes plain props; no business logic.
// ────────────────────────────────────────────────────────────────────────────

function TopRule({ left, right }: { left: string; right: string }) {
  return (
    <div className="mb-8 flex items-baseline justify-between gap-4 text-[11px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
      <span className="flex items-baseline gap-2">
        <span className="text-rose-400">❋</span>
        <span>{left}</span>
      </span>
      <span className="font-mono text-stone-400 dark:text-stone-500">{right}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
        {label}
      </dt>
      <dd className="mt-1 font-display text-3xl font-light leading-none tracking-tight tabular-nums text-stone-900 dark:text-stone-100 sm:text-4xl">
        {value}
        {note && (
          <span className="ml-2 text-base font-normal italic text-stone-400 dark:text-stone-500">
            · {note}
          </span>
        )}
      </dd>
    </div>
  );
}

function RatingCaveat({
  verdictedCount,
  testingCount,
}: {
  verdictedCount: number;
  testingCount: number;
}) {
  const wrap = (text: React.ReactNode) => (
    <p className="mt-4 max-w-xl font-serif text-sm italic leading-relaxed text-stone-500 dark:text-stone-400">
      {text}
    </p>
  );

  if (verdictedCount > 0) {
    return wrap(
      "One word can't capture context, price, or routine, read the prose before the verdict.",
    );
  }
  if (testingCount > 0) {
    return wrap(
      <>
        Nothing verdicted yet. I don&apos;t call a product
        &ldquo;recommend&rdquo; or &ldquo;bad&rdquo; until it&apos;s lived in
        my routine for at least a month.
      </>,
    );
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// The main component. Reads like a layout template, not a computation.
// ────────────────────────────────────────────────────────────────────────────

export function SectionMasthead({
  volume,
  title,
  intro,
  reviews,
}: {
  volume: string;
  title: string;
  intro: string;
  reviews: ReviewSummary[];
}) {
  const stats = computeStats(reviews);

  return (
    <div className="bg-paper-grain relative border-b border-stone-300 py-12 dark:border-stone-800 sm:py-16">
      {/* Section-level rose wash, mirrors the homepage hero so the
          editorial identity carries through to /skincare, /supplements,
          /oral-care, /hair-care without introducing any new accent
          colour. Light mode runs warmer, dark mode keeps it whisper.

          The right edge is pinned to the container, not hung past it.
          This used to be `-right-32`, which put 8rem of a 28rem box
          outside the viewport and widened the document: 498px of page
          in a 390px viewport, on all eight section pages, at every
          width below ~1440, which is why a phone could scroll sideways.
          Clipping the parent instead would cut the wash at the
          container edge and leave a hard vertical seam 20px in from the
          screen. `blur-3xl` paints well outside the box without
          contributing to scrollWidth, so pinning the box and letting
          the blur spill keeps the bleed and loses the scrollbar. The
          homepage hero can still use a negative offset because its
          section is full-bleed and carries `overflow-hidden`. */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 -top-20 -z-10 h-[28rem] w-[28rem] rounded-full bg-rose-200/45 blur-3xl dark:bg-rose-900/20"
      />
      <TopRule left={volume} right={issueDate()} />

      <h1 className="font-serif text-[12vw] leading-[0.92] tracking-[-0.04em] text-stone-900 dark:text-stone-100 sm:text-8xl">
        {title}.
      </h1>

      <p className="mt-6 max-w-2xl font-serif text-xl italic leading-snug text-stone-600 dark:text-stone-300 sm:text-2xl">
        {intro}
      </p>

      <dl
        data-tour-listing="stats"
        className="mt-10 grid grid-cols-2 gap-x-6 border-t border-stone-200 pt-6 dark:border-stone-800 sm:max-w-2xl sm:grid-cols-4 sm:gap-x-12"
      >
        <Stat label="On the shelf" value={pad2(stats.total)} />
        <Stat label="Recommend" value={pad2(stats.recommendCount)} />
        <Stat label="Okayish" value={pad2(stats.okayCount)} />
        <Stat
          label="Testing"
          value={pad2(stats.testingCount)}
          note={stats.badCount > 0 ? `${stats.badCount} bad` : undefined}
        />
      </dl>

      <RatingCaveat
        verdictedCount={
          stats.recommendCount + stats.okayCount + stats.badCount
        }
        testingCount={stats.testingCount}
      />
    </div>
  );
}
