import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/container";
import { SocialIconLink } from "@/components/social-link";
import { SectionTile } from "@/components/section-tile";
import { ListeningSection } from "@/components/listening-section";
import { PersonJsonLd } from "@/components/json-ld";
import { TimeGreeting } from "@/components/time-greeting";
import { RightNowLine } from "@/components/right-now-line";
import { site } from "@/lib/site";
import { socials } from "@/lib/socials";
import { getAllReviews, getReviews } from "@/lib/content";
import { getReviewsInRoutine } from "@/lib/routines";
import { photos } from "@/lib/photos";
import { KIND_LABEL, KINDS, kindPath } from "@/lib/types";
import type { Kind, ReviewSummary } from "@/lib/types";

// One line per section, in KINDS order. The tile grid below is built
// from this map, so a new kind can never be silently missing from the
// homepage (TypeScript fails the build until its blurb exists).
const SECTION_BLURB: Record<Kind, string> = {
  skincare:
    "Cleansers, serums, moisturizers, sunscreens, every product that's lived on my face for a month.",
  supplements:
    "Vitamins, minerals, nootropics. What I took, how long, and what I actually felt.",
  "oral-care":
    "Electric brushes, pastes, mouthwash, for teeth, breath, and gums.",
  "hair-care":
    "Conditioners, masks, treatments, what lives in the shower for hair, scalp, and ends.",
  "body-care":
    "Body washes, lotions, scrubs, trimmers, the everyday cleanse-and-moisturise from the neck down.",
  essentials:
    "Cornerstone daily-life devices: laptop, earbuds, wearable, charger, water filter, fan. The pieces I'd replace within a week if they broke.",
  miscellaneous:
    "Random utility objects, gadgets, accessories. The smaller things that earn or fail their shelf space.",
  fashion:
    "Shirts, denim, knitwear. What a piece is made of, how it fits, how it is washed, and how it has aged since the first wear.",
};

// Small ordered map for the starter skincare snippet so the AM column
// reads cleanse → moisturize → protect, not file-name order.
const STARTER_SKINCARE_ORDER: Record<string, number> = {
  "cleansing balm": 9,
  "face wash": 10,
  cleanser: 11,
  toner: 40,
  serum: 60,
  "eye cream": 80,
  moisturizer: 90,
  sunscreen: 100,
};

const STARTER_ORAL_ORDER: Record<string, number> = {
  "electric toothbrush": 10,
  toothpaste: 15,
  floss: 25,
  "water flosser": 30,
  mouthwash: 50,
};

export default function HomePage() {
  const allReviews = getAllReviews();
  const countByKind = Object.fromEntries(
    KINDS.map((kind) => [kind, getReviews(kind).length]),
  ) as Record<Kind, number>;
  const totalReviews = KINDS.reduce((sum, kind) => sum + countByKind[kind], 0);
  const photosCount = photos.length;
  // Hero strip stats: every value comes from the actual content set so
  // the line stays honest as the catalog grows. No more hardcoded
  // "0 sponsored / ∞ unfiltered" placeholders.
  const recommendCount = allReviews.filter(
    (r) => r.verdict === "recommend",
  ).length;
  const testingCount = allReviews.filter((r) => !r.verdict).length;

  // Starter routine columns: pull from the user's curated routines
  // (morning skincare, supplement stack, oral). Cap each column to a
  // small N so the homepage stays readable; the full routines live at
  // /routine/<slug>. If a routine has no items yet, the column is
  // simply omitted, never an empty placeholder.
  const starterMorning = getReviewsInRoutine("morning")
    .filter((r) => r.kind === "skincare")
    .sort(
      (a, b) =>
        (STARTER_SKINCARE_ORDER[a.category] ?? 999) -
        (STARTER_SKINCARE_ORDER[b.category] ?? 999),
    )
    .slice(0, 4);
  const starterStack = getReviewsInRoutine("stack")
    .filter((r) => r.verdict === "recommend")
    .slice(0, 4);
  const starterOral = getReviewsInRoutine("oral")
    .sort(
      (a, b) =>
        (STARTER_ORAL_ORDER[a.category] ?? 999) -
        (STARTER_ORAL_ORDER[b.category] ?? 999),
    )
    .slice(0, 5);
  const starterColumns: {
    label: string;
    href: string;
    blurb: string;
    items: ReviewSummary[];
  }[] = [
    {
      label: "Morning skincare",
      href: "/routine/morning",
      blurb: "A cleanse, a moisturizer, a sunscreen. The minimum honest version.",
      items: starterMorning,
    },
    {
      label: "Daily supplement stack",
      href: "/routine/stack",
      blurb: "What I take every day, in roughly the order I take it.",
      items: starterStack,
    },
    {
      label: "Oral, twice a day",
      href: "/routine/oral",
      blurb: "Same products morning and night, in this order. No shortcuts.",
      items: starterOral,
    },
  ].filter((c) => c.items.length > 0);

  return (
    <>
      <PersonJsonLd />

      {/* Hero, magazine cover. `bg-paper-grain` overlays a 1 KB SVG
          noise so the rose wash reads as printed paper, not a flat
          gradient, the analog texture is what separates editorial
          from generic. */}
      <section className="bg-paper-grain relative overflow-hidden border-b border-stone-300 bg-gradient-to-b from-stone-50 via-stone-50 to-white dark:border-stone-800 dark:from-stone-950 dark:via-stone-950 dark:to-stone-900">
        <Container className="relative z-10 pt-12 pb-20 sm:pt-16 sm:pb-28">
          {/* Masthead rule: greeting · location · issue · date */}
          <div className="mb-10 flex items-baseline justify-between gap-4 text-[11px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
            <span className="flex items-baseline gap-2">
              {/* Hero rose drifts on a 60s loop, ambient, not a
                  spinner. Reduced-motion sees a still mark. */}
              <span className="rose-drift text-rose-400">❋</span>
              {/* Quiet time-of-day greeting, hydrates on the client
                  so it always reflects the visitor's local clock. */}
              <TimeGreeting />
              <span>{site.location}</span>
            </span>
            <span className="font-mono text-stone-400 dark:text-stone-500">
              Issue №{" "}
              {String(totalReviews + photosCount).padStart(2, "0")}
            </span>
          </div>

          <div className="max-w-3xl">
            {/* Italic editorial label */}
            <p className="font-serif text-xl italic text-stone-500 dark:text-stone-400 sm:text-2xl">
              An honest catalog of
            </p>

            <h1 className="mt-2 font-serif text-[14vw] leading-[0.92] tracking-[-0.045em] text-stone-900 dark:text-stone-100 sm:text-8xl">
              {site.name}
              <span className="text-rose-400">.</span>
            </h1>

            <p className="mt-8 max-w-2xl font-serif text-xl leading-snug text-stone-600 dark:text-stone-300 sm:text-2xl">
              {site.bio}
            </p>

            <RightNowLine />

            {/* Trust strip, newsstand-style. All counts derive from the
                live content set, so the line stays accurate as products
                are added or move between verdict states. */}
            <div
              data-tour="stats"
              className="mt-10 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-y border-stone-200 py-5 dark:border-stone-800"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-light tabular-nums text-stone-900 dark:text-stone-100">
                  {totalReviews}
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                  reviews
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-light tabular-nums text-stone-900 dark:text-stone-100">
                  {recommendCount}
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                  recommend
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-light tabular-nums text-stone-900 dark:text-stone-100">
                  {testingCount}
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                  still testing
                </span>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {socials.map((s) => (
                <SocialIconLink key={s.label} social={s} />
              ))}
            </div>

            <div data-tour="cta" className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/skincare"
                className="group inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
              >
                Read the latest reviews
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/now"
                className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-900 transition-colors hover:border-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-stone-400"
              >
                What&apos;s on the shelf this month
              </Link>
            </div>
          </div>
        </Container>
        {/* Editorial rose wash. Sits behind the content (z-0) so the
            soft tint never crawls over the headline or stats, that
            was the contrast hit reported on light mode. Top-right blob
            runs in both modes; the bottom-left companion is light-only
            because the user did not want dark mode touched.
            dark:hidden removes the second blob entirely at night. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 z-0 h-[34rem] w-[34rem] rounded-full bg-rose-200/45 blur-3xl dark:bg-rose-900/20"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 z-0 h-[22rem] w-[22rem] rounded-full bg-rose-100/40 blur-3xl dark:hidden"
        />
      </section>

      {/* Starter routine, replaces the older "just added shelf" band.
          The point of the homepage for a first-time visitor is to teach
          them what a basic, defensible routine looks like, not to push
          the latest unverdicted product. Three columns mirror the three
          routines a beginner should care about: AM skincare, daily
          supplements, oral. Each column links to its full routine page. */}
      {starterColumns.length > 0 && (
        <Container className="py-20">
          <div className="mb-10 max-w-2xl">
            <p className="mb-1 text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
              <span className="text-rose-400">✦</span> Start here
            </p>
            <h2 className="font-serif text-3xl text-stone-900 dark:text-stone-100 sm:text-4xl">
              A starter routine.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400 sm:text-base">
              If you&rsquo;re new and just want to know where to begin, this is
              the minimum honest version of what I do. Each column is a real
              routine, not a shopping list, tap through to see the full
              sequence and timing.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3">
            {starterColumns.map((col) => (
              <StarterColumn key={col.href} column={col} />
            ))}
          </div>
        </Container>
      )}

      {/* Photographs, promoted block ahead of the section grid. The
          /photos surface gets its own moment rather than being tucked
          into the catalog tiles. Renders the page-hero frame as a
          cinematic cover with a typographic right-rail. */}
      {(() => {
        const pageHero =
          photos.find((p) => p.hero) ?? photos[0] ?? null;
        if (!pageHero) return null;
        return (
          <Container className="border-t border-stone-200/70 py-20 dark:border-stone-900/40">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Cover photo */}
              <Link
                href="/photos"
                className="group block lg:col-span-8"
                aria-label="Open the photo roll"
              >
                <div
                  className="relative w-full select-none overflow-hidden bg-stone-100 dark:bg-stone-900"
                  style={{
                    aspectRatio: `${pageHero.width} / ${pageHero.height}`,
                    maxHeight: "75vh",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pageHero.src}
                    alt={pageHero.alt}
                    loading="lazy"
                    draggable={false}
                    className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.012]"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute bottom-2 right-2 select-none font-mono text-[9px] uppercase tracking-[0.22em] text-white/85 mix-blend-difference"
                  >
                    ❋ yashgoel.vercel.app
                  </span>
                </div>
                <p className="mt-4 font-serif text-lg italic text-stone-600 dark:text-stone-300">
                  {pageHero.caption}
                </p>
              </Link>

              {/* Right rail */}
              <div className="flex flex-col justify-between gap-8 lg:col-span-4 lg:py-4">
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
                    <span className="text-rose-400">❋</span> Photographs
                  </p>
                  <h2 className="font-serif text-4xl leading-[1.02] text-stone-900 sm:text-5xl dark:text-stone-100">
                    From the roll.
                  </h2>
                  <p className="mt-4 max-w-md font-serif text-base italic leading-snug text-stone-500 dark:text-stone-400 sm:text-lg">
                    A slow-growing contact sheet. Shot when the camera was
                    in the bag and the light was doing something. Two
                    chapters, ordered like a printed photo essay.
                  </p>
                </div>

                <div className="space-y-4 border-t border-stone-200 pt-6 dark:border-stone-800">
                  <div className="flex items-baseline gap-6 text-[11px] uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
                    <span className="flex items-baseline gap-2">
                      <span className="font-display text-2xl font-light tabular-nums text-stone-900 dark:text-stone-100">
                        {String(photosCount).padStart(2, "0")}
                      </span>
                      frames
                    </span>
                    <span aria-hidden className="text-stone-300 dark:text-stone-700">·</span>
                    <span>two chapters</span>
                  </div>
                  <Link
                    href="/photos"
                    className="group inline-flex items-baseline gap-2 font-serif text-xl italic text-stone-900 hover:text-rose-500 dark:text-stone-100 dark:hover:text-rose-400 sm:text-2xl"
                  >
                    See the roll
                    <ArrowRight
                      aria-hidden
                      className="h-4 w-4 translate-y-0.5 transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                </div>
              </div>
            </div>
          </Container>
        );
      })()}

      {/* Sections */}
      <Container className="border-t border-stone-200/70 py-20 dark:border-stone-900/40">
        <div className="mb-10">
          <p className="mb-1 text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
            <span className="text-rose-400">✷</span> Sections
          </p>
          <h2 className="font-serif text-3xl text-stone-900 dark:text-stone-100 sm:text-4xl">
            Poke around.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ...KINDS.map((kind, i) => ({
              index: i + 1,
              href: kindPath(kind),
              eyebrow: `${countByKind[kind]} ${countByKind[kind] === 1 ? "review" : "reviews"}`,
              title: KIND_LABEL[kind],
              description: SECTION_BLURB[kind],
            })),
            {
              index: KINDS.length + 1,
              href: "/now",
              eyebrow: "this month",
              title: "Now",
              description:
                "What I'm currently working on, listening to, thinking about, and consciously not doing.",
            },
          ].map((tile, i) => (
            <div
              key={tile.href}
              className="card-stagger-in"
              style={{ "--stagger": `${i * 35}ms` } as React.CSSProperties}
            >
              <SectionTile {...tile} />
            </div>
          ))}
        </div>
      </Container>

      <ListeningSection
        fallbackPlaylistId="37i9dQZF1EIhvQz3p7tStL"
        fallbackTitle="Ibiza Club Mix, my favorite playlist"
      />
    </>
  );
}

function StarterColumn({
  column,
}: {
  column: {
    label: string;
    href: string;
    blurb: string;
    items: ReviewSummary[];
  };
}) {
  return (
    <section className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 transition-colors hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700">
      <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-stone-200 pb-3 dark:border-stone-800">
        <h3 className="font-serif text-xl text-stone-900 dark:text-stone-100">
          {column.label}
        </h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
          {column.items.length} step{column.items.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="mb-5 font-serif text-sm italic leading-relaxed text-stone-500 dark:text-stone-400">
        {column.blurb}
      </p>
      <ol className="flex-1 space-y-3">
        {column.items.map((r, i) => (
          <li key={`${r.kind}-${r.slug}`}>
            <Link
              href={`/${r.kind}/${r.slug}`}
              className="group flex items-center gap-3 rounded-lg p-1 -m-1 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/60"
            >
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-50 font-mono text-[10px] tabular-nums text-stone-500 group-hover:border-rose-300 group-hover:text-rose-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:group-hover:border-rose-700 dark:group-hover:text-rose-400"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
                  {r.brand}
                </p>
                <p className="truncate font-serif text-[15px] leading-tight text-stone-900 group-hover:text-rose-700 dark:text-stone-100 dark:group-hover:text-rose-400">
                  {r.name}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
      <Link
        href={column.href}
        className="mt-6 inline-flex items-center gap-1.5 self-start text-[11px] uppercase tracking-[0.18em] text-stone-500 transition-colors hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400"
      >
        Full routine
        <ArrowRight className="h-3 w-3" />
      </Link>
    </section>
  );
}
