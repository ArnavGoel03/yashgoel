import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/container";
import { MdxContent } from "@/components/mdx-content";
import { Breadcrumb } from "@/components/breadcrumb";
import { TocNav } from "@/components/toc-nav";
import { getAdjacentPrimers, getPrimer, getPrimers } from "@/lib/content";
import { formatReadingTime } from "@/lib/reading-time";
import { PrevNext } from "@/components/prev-next";
import { CopyLink } from "@/components/copy-link";
import { ReadingProgress } from "@/components/reading-progress";
import { findGlossaryEntry } from "@/lib/glossary";
import type { PrimerDomain } from "@/lib/types";

const DOMAIN_LABEL: Record<PrimerDomain, string> = {
  supplement: "Health",
  skincare: "Skincare",
  oral: "Oral care",
  meta: "Label literacy",
};

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getPrimers().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const primer = getPrimer(slug);
  if (!primer) return {};
  const description = primer.subtitle ?? `${primer.title} · a primer.`;
  return {
    title: `${primer.title} · Primer`,
    description,
    alternates: { canonical: `/primers/${primer.slug}` },
    openGraph: {
      type: "article",
      title: primer.title,
      description,
      publishedTime: primer.datePublished,
    },
  };
}

export default async function PrimerPage({ params }: Props) {
  const { slug } = await params;
  const primer = getPrimer(slug);
  if (!primer) notFound();
  const { prev, next } = getAdjacentPrimers(primer.slug);
  const glossaryEntry =
    findGlossaryEntry(primer.slug) ?? findGlossaryEntry(primer.title);

  return (
    <article>
      <ReadingProgress />
      <Container className="max-w-4xl py-10">
        <Breadcrumb
          trail={[
            { name: "Home", href: "/" },
            { name: "Primers", href: "/primers" },
            { name: primer.title, href: `/primers/${primer.slug}` },
          ]}
        />
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/primers"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
          >
            <ArrowLeft className="h-4 w-4" />
            All primers
          </Link>
          <CopyLink path={`/primers/${primer.slug}`} />
        </div>

        <header className="mt-8 border-b border-stone-300 pb-10 dark:border-stone-800">
          <div className="mb-4 flex items-baseline justify-between gap-4 text-[11px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
            <span className="flex items-baseline gap-2">
              <span className="text-rose-400">❋</span>
              <span>
                {DOMAIN_LABEL[primer.domain]} ·{" "}
                {primer.kind === "stack" ? "Stack" : "Ingredient"}
              </span>
            </span>
            <span className="flex items-baseline gap-3 font-mono text-stone-400 dark:text-stone-500">
              <span>{formatReadingTime(primer.body)}</span>
              <span className="text-stone-300 dark:text-stone-700">·</span>
              <span>
                {new Date(primer.datePublished).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </span>
            </span>
          </div>

          <h1 className="font-serif text-4xl leading-[1.02] tracking-tight text-stone-900 dark:text-stone-100 sm:text-6xl">
            {primer.title}
            <span className="text-rose-400">.</span>
          </h1>

          {primer.subtitle && (
            <p className="mt-6 max-w-2xl font-serif text-xl italic leading-snug text-stone-600 dark:text-stone-300 sm:text-2xl">
              {primer.subtitle}
            </p>
          )}

          {glossaryEntry && (
            <p className="mt-6 inline-flex items-baseline gap-2 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
              <span className="text-rose-400">❋</span>
              <span>Quick definition</span>
              <span className="text-stone-300 dark:text-stone-700">·</span>
              <Link
                href={`/glossary#${glossaryEntry.slug}`}
                className="text-stone-700 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-stone-900 hover:decoration-rose-400 dark:text-stone-200 dark:decoration-stone-700"
              >
                Glossary entry
              </Link>
            </p>
          )}

          {primer.stack.length > 0 && (
            <div className="mt-8 border-y border-stone-200 py-4 dark:border-stone-800">
              <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
                {primer.kind === "stack" ? "The stack" : "Covered"}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 font-serif text-base text-stone-700 dark:text-stone-300">
                {primer.stack.map((s, i) => (
                  <span key={s}>
                    {i > 0 && (
                      <span
                        className="mr-3 text-stone-300 dark:text-stone-700"
                        aria-hidden
                      >
                        ·
                      </span>
                    )}
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </header>

        <div className="mt-10 lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
          <TocNav
            body={primer.body}
            className="mb-8 hidden border-l border-stone-200 pl-4 dark:border-stone-800 lg:sticky lg:top-24 lg:mb-0 lg:block lg:self-start"
          />
          <MdxContent source={primer.body} withDropCap />
        </div>

        <PrevNext
          prev={
            prev
              ? {
                  title: prev.title,
                  subtitle: `${prev.domain} · ${prev.kind}`,
                  href: `/primers/${prev.slug}`,
                }
              : null
          }
          next={
            next
              ? {
                  title: next.title,
                  subtitle: `${next.domain} · ${next.kind}`,
                  href: `/primers/${next.slug}`,
                }
              : null
          }
          label="Primer pagination"
        />
      </Container>
    </article>
  );
}
