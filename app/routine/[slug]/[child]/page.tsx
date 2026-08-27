import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/container";
import {
  getReviewsInSubroutine,
  getSubroutine,
  getSubroutinesList,
  type SubroutineSlug,
} from "@/lib/routines";
import type { ReviewSummary } from "@/lib/types";

type Props = { params: Promise<{ slug: string; child: string }> };

export async function generateStaticParams() {
  return getSubroutinesList().map((s) => {
    const [slug, child] = s.split("/");
    return { slug, child };
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, child } = await params;
  const def = getSubroutine(`${slug}/${child}`);
  if (!def) return {};
  return {
    title: `${def.label} routine`,
    description: def.description,
    alternates: { canonical: `/routine/${slug}/${child}` },
  };
}

const SKINCARE_ORDER: Record<string, number> = {
  "face wash": 10,
  cleanser: 11,
  "chemical exfoliant": 20,
  "chemical peel": 21,
  "face scrub": 22,
  dermaplaning: 23,
  tool: 24,
  "face mask": 30,
  "sheet mask": 31,
  toner: 40,
  patches: 50,
  serum: 60,
  prescription: 70,
  "eye cream": 80,
  moisturizer: 90,
  aftershave: 95,
  "lip scrub": 96,
  "lip balm": 97,
  sunscreen: 100,
};

export default async function SubroutinePage({ params }: Props) {
  const { slug, child } = await params;
  const def = getSubroutine(`${slug}/${child}`);
  if (!def) notFound();
  const subroutine = `${slug}/${child}` as SubroutineSlug;
  const items = getReviewsInSubroutine(subroutine);

  const skincare = items
    .filter((r) => r.kind === "skincare")
    .sort(
      (a, b) =>
        (SKINCARE_ORDER[a.category] ?? 999) -
        (SKINCARE_ORDER[b.category] ?? 999),
    );
  const supplements = items.filter((r) => r.kind === "supplements");
  const oralCare = items.filter((r) => r.kind === "oral-care");
  const hairCare = items.filter((r) => r.kind === "hair-care");
  const bodyCare = items.filter((r) => r.kind === "body-care");
  const essentials = items.filter((r) => r.kind === "essentials");
  const miscellaneous = items.filter((r) => r.kind === "miscellaneous");

  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <Link
        href={`/routine/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {slug}
      </Link>

      <div className="mt-8 border-b border-stone-300 pb-10 dark:border-stone-800">
        <div className="mb-4 flex items-baseline justify-between gap-4 text-[11px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
          <span className="flex items-baseline gap-2">
            <span className="text-rose-400">❋</span>
            <span>Subroutine</span>
          </span>
          <span className="font-mono text-stone-400 dark:text-stone-500">
            {slug} / {child}
          </span>
        </div>
        <h1 className="font-serif text-4xl leading-[1.02] tracking-tight text-stone-900 sm:text-5xl dark:text-stone-100">
          {def.label}
          <span className="text-rose-400">.</span>
        </h1>
        <p className="mt-6 max-w-2xl font-serif text-lg italic leading-snug text-stone-600 sm:text-xl dark:text-stone-300">
          {def.description}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="mt-16 py-12 text-center text-stone-500 dark:text-stone-400">
          Nothing tagged into this subroutine yet. Edit `lib/routines.ts` to
          adjust the filter, or tag the relevant products with one of:{" "}
          {def.filter.mode === "goal"
            ? def.filter.goals.join(", ")
            : "the listed slugs"}
          .
        </p>
      ) : (
        <div className="mt-12 space-y-10">
          {skincare.length > 0 && (
            <Section
              label="Skincare"
              items={skincare}
              numbered={def.numberSteps}
              caption={
                def.numberSteps
                  ? "In application order. Each step waits ~30 seconds before the next."
                  : undefined
              }
            />
          )}
          {supplements.length > 0 && (
            <Section label="Supplements" items={supplements} />
          )}
          {oralCare.length > 0 && (
            <Section label="Oral care" items={oralCare} />
          )}
          {hairCare.length > 0 && (
            <Section label="Hair care" items={hairCare} />
          )}
          {bodyCare.length > 0 && (
            <Section label="Body care" items={bodyCare} />
          )}
          {essentials.length > 0 && (
            <Section label="Essentials" items={essentials} />
          )}
          {miscellaneous.length > 0 && (
            <Section label="Miscellaneous" items={miscellaneous} />
          )}
        </div>
      )}
    </Container>
  );
}

function Section({
  label,
  items,
  numbered = false,
  caption,
}: {
  label: string;
  items: ReviewSummary[];
  numbered?: boolean;
  caption?: string;
}) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-stone-200 pb-2 dark:border-stone-800">
        <h2 className="font-display text-3xl font-light tracking-tight text-stone-900 dark:text-stone-100">
          {label}
        </h2>
        {caption && (
          <p className="hidden text-[10px] uppercase tracking-[0.2em] text-stone-500 sm:block dark:text-stone-400">
            {caption}
          </p>
        )}
      </div>
      <ol className="divide-y divide-stone-100 dark:divide-stone-800">
        {items.map((r, i) => (
          <li key={`${r.kind}-${r.slug}`} className="py-4">
            <Link
              href={`/${r.kind}/${r.slug}`}
              className="group flex items-center gap-4"
            >
              {numbered && (
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white font-mono text-[11px] tabular-nums text-stone-500 transition-colors group-hover:border-rose-300 group-hover:text-rose-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:group-hover:border-rose-700 dark:group-hover:text-rose-400"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              )}
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-800 sm:h-20 sm:w-20">
                {r.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.photo}
                    alt={`${r.brand} ${r.name}`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center font-serif text-xl text-stone-300 dark:text-stone-600">
                    {r.brand.charAt(0)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500">
                  {r.brand} · {r.category}
                </p>
                <h3 className="mt-0.5 font-serif text-lg text-stone-900 transition-colors group-hover:text-rose-700 dark:text-stone-100 dark:group-hover:text-rose-400">
                  {r.name}
                </h3>
              </div>
              <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] italic text-stone-400 dark:text-stone-500">
                {r.verdict ?? "testing"}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
