import type { Metadata } from "next";
import { Container } from "@/components/container";
import { SpotifyEmbed } from "@/components/spotify-embed";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Now",
  description: `What ${site.shortName} is working on, listening to, and thinking about right now.`,
  alternates: { canonical: "/now" },
};

const lastUpdated = "2026-04-23";

const sections = [
  { num: "01", label: "Working on" },
  { num: "02", label: "Listening to" },
  { num: "03", label: "Thinking about" },
  { num: "04", label: "Not doing" },
] as const;

function NumberedHeading({ num, label }: { num: string; label: string }) {
  return (
    <div className="mb-5 flex items-baseline gap-4 border-b border-stone-200 pb-2 dark:border-stone-800">
      <span className="font-display text-3xl font-light tabular-nums text-stone-300 dark:text-stone-700">
        {num}
      </span>
      <h2 className="font-serif text-2xl italic text-stone-900 sm:text-3xl dark:text-stone-100">
        {label}
      </h2>
    </div>
  );
}

export default function NowPage() {
  const issued = new Date(lastUpdated).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <div className="mb-8 flex items-baseline justify-between gap-4 text-[11px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
        <span className="flex items-baseline gap-2">
          <span className="text-rose-400">❋</span>
          <span>From the desk of -</span>
        </span>
        <span className="font-mono text-stone-400 dark:text-stone-500">Issued {issued}</span>
      </div>

      <h1 className="font-serif text-[12vw] leading-[0.92] tracking-[-0.04em] text-stone-900 sm:text-8xl dark:text-stone-100">
        Now<span className="text-rose-400">.</span>
      </h1>

      <p className="mt-6 max-w-2xl font-serif text-xl leading-snug text-stone-600 sm:text-2xl dark:text-stone-300">
        <span className="float-left mr-2 mt-1 font-display text-6xl font-light leading-[0.8] text-stone-900 sm:text-7xl dark:text-stone-100">
          T
        </span>
        his page exists because a feed will not. Five sections, what I&apos;m
        making, taking in, thinking through, and saying no to, refreshed
        whenever the truth changes.
      </p>

      <div className="mt-16 space-y-14 border-t border-stone-300 pt-12 dark:border-stone-800">
        <section>
          <NumberedHeading num={sections[0].num} label={sections[0].label} />
          <ul className="space-y-4 text-stone-700 dark:text-stone-300">
            <li>
              <strong className="font-serif text-stone-900 dark:text-stone-100">Buzz</strong>, a
              native iOS event discovery app for college students, starting with
              my own campus. SwiftUI, polish-focused.
            </li>
            <li>
              <strong className="font-serif text-stone-900 dark:text-stone-100">This site</strong>{" "}
             , you&apos;re on it. Plan is to add a real review every other day
              and refresh this page once a month.
            </li>
          </ul>
        </section>

        <section>
          <NumberedHeading num={sections[1].num} label={sections[1].label} />
          <p className="mb-4 font-serif italic text-stone-600 dark:text-stone-300">
            Ibiza Club Mix on repeat. Plays in the background more than I&apos;d
            like to admit.
          </p>
          <SpotifyEmbed
            playlistId="37i9dQZF1EIhvQz3p7tStL"
            title="Ibiza Club Mix"
          />
        </section>

        <section>
          <NumberedHeading num={sections[2].num} label={sections[2].label} />
          <ul className="space-y-3 text-stone-700 dark:text-stone-300">
            <li>
              How to make software that feels quiet, that does its job and
              gets out of the way.
            </li>
            <li>What to cook this week.</li>
          </ul>
        </section>

        <section>
          <NumberedHeading num={sections[3].num} label={sections[3].label} />
          <ul className="space-y-3 text-stone-700 dark:text-stone-300">
            <li>
              Anything involving LeetCode grinds. Anything that doesn&apos;t
              excite me.
            </li>
          </ul>
        </section>
      </div>

      <div className="mt-20 border-t border-stone-200 pt-8 text-center dark:border-stone-800">
        <p className="font-serif text-3xl italic text-stone-700 dark:text-stone-300">- Yash</p>
        <p className="mt-3 text-[10px] uppercase tracking-[0.22em] text-stone-400 dark:text-stone-500">
          inspired by{" "}
          <a
            href="https://nownownow.com/about"
            className="underline decoration-stone-300 underline-offset-4 hover:text-stone-700"
          >
            Derek Sivers&apos; /now movement
          </a>
        </p>
      </div>
    </Container>
  );
}
