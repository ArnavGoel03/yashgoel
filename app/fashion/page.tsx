import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/container";
import { SectionMasthead } from "@/components/section-masthead";
import { CategoryFilter } from "@/components/category-filter";
import { GarmentMethod } from "@/components/garment-method";
import { ItemListJsonLd } from "@/components/json-ld";
import { ListingTourMount } from "@/components/listing-tour-mount";
import { getReviews } from "@/lib/content";

const INTRO =
  "Clothes judged the same way as everything else here: after a month or more of wearing them. Fit, fabric, how they wash, and how they have aged.";

export const metadata: Metadata = {
  title: "Fashion Reviews",
  description:
    "Clothes reviewed after a month or more of wear: fit, fabric composition, care, and how each piece has aged.",
  alternates: { canonical: "/fashion" },
};

export default function FashionPage() {
  const reviews = getReviews("fashion");
  return (
    <>
      <ItemListJsonLd
        name="Fashion Reviews"
        description="Clothes reviewed after a month or more of wear: fit, fabric composition, care, and how each piece has aged."
        url="/fashion"
        items={reviews}
      />
      <Container>
        <SectionMasthead
          volume="Vol. VIII, Fashion"
          title="Fashion"
          intro={INTRO}
          reviews={reviews}
        />
      </Container>
      <Container className="py-10">
        {reviews.length > 0 ? (
          <CategoryFilter reviews={reviews} />
        ) : (
          // Honest empty state, never filler. The section is wired and
          // the method below is real; there is simply nothing that has
          // earned an entry yet.
          <div className="py-16 text-center">
            <p className="font-display text-7xl font-light leading-none tracking-tight text-stone-200 dark:text-stone-800">
              00
            </p>
            <p className="mx-auto mt-4 max-w-md font-serif text-lg italic leading-relaxed text-stone-500 dark:text-stone-400">
              Nothing published yet. A piece appears here once it has been
              worn for a month or more and its record is filled in from the
              garment itself.
            </p>
          </div>
        )}
      </Container>
      <Container className="pb-24">
        <GarmentMethod />
      </Container>
      <Suspense fallback={null}>
        <ListingTourMount />
      </Suspense>
    </>
  );
}
