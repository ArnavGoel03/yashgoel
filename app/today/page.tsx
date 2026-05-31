import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { site } from "@/lib/site";
import { TodayTracker } from "@/components/today/today-tracker";
import { TODAY_VERSION, SCHEMA_VERSION } from "@/lib/habits";

export const metadata: Metadata = {
  title: "Today",
  description:
    "A private, offline-first daily habit tracker, brush, floss, skincare, sunscreen, supplements, shower. Lives on your device.",
  alternates: { canonical: "/today" },
  // The tracker is a personal tool, not editorial content. Keep it out
  // of the index so it doesn't compete with the reviews in search.
  robots: { index: false, follow: true },
};

// Static shell + client island. The shell prerenders under
// cacheComponents (no dynamic APIs); the tracker hydrates instantly
// from localStorage, so there's no blocking fetch and no layout shift.
export default function TodayPage() {
  return (
    <Container className="max-w-2xl py-12 sm:py-16">
      <div className="mb-8 flex items-baseline justify-between gap-4 text-[11px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
        <span className="flex items-baseline gap-2">
          <span className="text-rose-400">❋</span>
          <span>Daily tracker</span>
        </span>
        <Link
          href="/routine"
          className="font-mono text-stone-400 underline-offset-4 hover:text-rose-500 hover:underline dark:text-stone-500"
        >
          ← Routines
        </Link>
      </div>

      <h1 className="font-serif text-[12vw] leading-[0.92] tracking-[-0.04em] text-stone-900 sm:text-7xl dark:text-stone-100">
        Today<span className="text-rose-400">.</span>
      </h1>
      <p className="mt-6 max-w-xl font-serif text-xl italic leading-snug text-stone-600 sm:text-2xl dark:text-stone-300">
        The routines say what I do, in order. This is the checklist I run
        against them, every day, on my phone, offline.
      </p>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        Everything lives on this device only. Nothing is sent anywhere.
        Use <span className="font-medium text-stone-700 dark:text-stone-200">Export backup</span> to
        carry your history to another phone, and add {site.shortName}&apos;s site to your home
        screen to open straight here.
      </p>

      <div className="mt-12">
        <TodayTracker />
      </div>

      <p className="mt-16 text-center font-mono text-[11px] tracking-wide text-stone-400 dark:text-stone-600">
        Today v{TODAY_VERSION} · data schema v{SCHEMA_VERSION} · offline-first ·
        stored on this device
      </p>
    </Container>
  );
}
