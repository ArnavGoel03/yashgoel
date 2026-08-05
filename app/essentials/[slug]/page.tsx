import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/container";
import { VerdictPill } from "@/components/verdict-pill";
import { ReviewMeta } from "@/components/review-meta";
import { RatingAxes } from "@/components/rating-axes";
import { ReviewChangelog } from "@/components/review-changelog";
import { Breadcrumb } from "@/components/breadcrumb";
import { DraftBanner } from "@/components/draft-banner";
import { ProsCons } from "@/components/pros-cons";
import { ReaderNote } from "@/components/reader-note";
import { RelatedReviews } from "@/components/related-reviews";
import { getRelatedReviews } from "@/lib/related";
import { PhotoTimeline } from "@/components/photo-timeline";
import { MdxContent } from "@/components/mdx-content";
import { ContinueReading } from "@/components/continue-reading";
import { IngredientChips } from "@/components/ingredient-chips";
import { ReviewJsonLd } from "@/components/json-ld";
import {
  getAdjacentReviews,
  getAllReviewsIncludingHidden,
  getPrimersForProduct,
  getReview,
} from "@/lib/content";
import { RelatedPrimers } from "@/components/related-primers";
import { TocNav } from "@/components/toc-nav";
import { PrevNext } from "@/components/prev-next";
import { CopyLink } from "@/components/copy-link";
import { ReadingProgress } from "@/components/reading-progress";
import { ProductHeroPhoto } from "@/components/product-hero-photo";
import { brandTextColor } from "@/lib/retailers";

type Props = { params: Promise<{ slug: string }> };

// Every MDX file in this folder gets a prerendered page, including
// drafts (`hidden: true`) and retired entries. `getReviews()` is the
// wrong set here: it drops those and adds cross-listed guests whose
// canonical URL lives under another kind. With Cache Components an
// empty result also fails the build outright.
export async function generateStaticParams() {
  return getAllReviewsIncludingHidden("essentials").map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const review = getReview("essentials", slug);
  if (!review) return {};
  const description = review.summary || `${review.brand} ${review.name} review.`;
  return {
    title: `${review.name} by ${review.brand}`,
    description,
    alternates: { canonical: `/essentials/${review.slug}` },
    // Drafts stay reachable by URL but must never be indexed or
    // surfaced as a finished review.
    robots: review.hidden ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "article",
      title: `${review.name} by ${review.brand}`,
      description,
      publishedTime: review.datePublished,
    },
  };
}

export default async function EssentialsReviewPage({ params }: Props) {
  const { slug } = await params;
  const review = getReview("essentials", slug);
  if (!review) notFound();
  const relatedPrimers = getPrimersForProduct(review.slug);
  const { prev, next } = getAdjacentReviews("essentials", review.slug);
  const related = getRelatedReviews(review);

  return (
    <article>
      <ReadingProgress />
      <ContinueReading path={`/essentials/`} />
      <ReviewJsonLd review={review} />
      <Container className="py-10">
        <Breadcrumb
          trail={[
            { name: "Home", href: "/" },
            { name: "Essentials", href: "/essentials" },
            { name: review.name, href: `/essentials/${review.slug}` },
          ]}
        />
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/essentials"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
          >
            <ArrowLeft className="h-4 w-4" />
            All essentials
          </Link>
          <CopyLink path={`/essentials/${review.slug}`} />
        </div>

        {review.hidden && <DraftBanner />}

        <header className="mt-8 border-b border-stone-200 pb-10 dark:border-stone-800">
          <p className="mb-3 text-xs uppercase tracking-[0.2em]">
            <span className={"font-medium " + brandTextColor(review.brand)}>
              {review.brand}
            </span>
            <span className="text-stone-400 dark:text-stone-500">
              {" "}
              · {review.category}
            </span>
          </p>
          <div className="flex items-start justify-between gap-6">
            <h1 className="font-serif text-4xl leading-tight text-stone-900 dark:text-stone-100 sm:text-5xl">
              {review.name}
            </h1>
            <VerdictPill verdict={review.verdict} size="lg" />
          </div>
          {review.summary && (
            <p className="mt-6 max-w-2xl text-xl leading-relaxed text-stone-600 dark:text-stone-300">
              {review.summary}
            </p>
          )}
        </header>

        <ProductHeroPhoto review={review} />

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="space-y-10">
            <MdxContent source={review.body} withDropCap />
            <PhotoTimeline review={review} />
            <ProsCons pros={review.pros} cons={review.cons} />
            <ReaderNote kind="essentials" slug={review.slug} />
          </div>
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <TocNav body={review.body} />
            <ReviewMeta review={review} />
            <RatingAxes review={review} />
            <RelatedPrimers primers={relatedPrimers} />
            <ReviewChangelog review={review} />
            <IngredientChips ingredients={review.ingredients ?? []} />
          </aside>
        </div>

        <RelatedReviews reviews={related} />
        <PrevNext
          prev={
            prev
              ? {
                  title: prev.name,
                  subtitle: `${prev.brand} · ${prev.category}`,
                  href: `/essentials/${prev.slug}`,
                }
              : null
          }
          next={
            next
              ? {
                  title: next.name,
                  subtitle: `${next.brand} · ${next.category}`,
                  href: `/essentials/${next.slug}`,
                }
              : null
          }
          label="Essentials pagination"
        />
      </Container>
    </article>
  );
}
