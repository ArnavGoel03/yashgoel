"use client";

import { useEffect, useState } from "react";
import { useClientValue } from "@/lib/use-client-value";

/** Returns a calm greeting based on the browser's current hour. */
function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "good morning";
  if (hour >= 12 && hour < 17) return "good afternoon";
  if (hour >= 17 && hour < 21) return "good evening";
  return "good night";
}

const VISIT_KEY = "yashgoel-last-visit-v1";
const RETURNING_WINDOW_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

/**
 * Reads/writes a tiny "you were here" timestamp so we can warm up the
 * greeting for returning readers. Only the timestamp is stored , no
 * pageviews, no fingerprint, no remote sync. If the visitor cleared
 * site data we fall back to the time-of-day greeting like a first-
 * timer, which is the right behavior.
 */
function readReturning(): boolean {
  try {
    const raw = localStorage.getItem(VISIT_KEY);
    if (!raw) return false;
    const t = Number(raw);
    if (!Number.isFinite(t)) return false;
    const age = Date.now() - t;
    return age > 5 * 60 * 1000 && age < RETURNING_WINDOW_MS;
  } catch {
    return false;
  }
}

function markVisit() {
  try {
    localStorage.setItem(VISIT_KEY, String(Date.now()));
  } catch {
    // ignore quota errors
  }
}

/**
 * Open-Meteo weather codes → calm-tone English. Limited vocabulary on
 * purpose; the masthead is not a forecast, it's atmosphere.
 * Reference: https://open-meteo.com/en/docs (WMO weather codes)
 */
function weatherFromCode(code: number): string | null {
  if (code === 0) return "clear skies";
  if (code === 1 || code === 2) return "fair";
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 61 && code <= 65) return "rain";
  if (code >= 66 && code <= 67) return "freezing rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "showers";
  if (code === 85 || code === 86) return "snow showers";
  if (code === 95) return "thunder";
  if (code === 96 || code === 99) return "thunder, hail";
  return null;
}

const CACHE_KEY = "yashgoel-weather-v1";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// San Diego, CA , site.location is anchored to the author's city, so
// the weather here mirrors his sky, not the visitor's.
const LAT = 32.7157;
const LON = -117.1611;

async function fetchWeather(): Promise<string | null> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { phrase, t } = JSON.parse(cached);
      if (Date.now() - t < CACHE_TTL_MS && typeof phrase === "string") {
        return phrase;
      }
    }
  } catch {
    // ignore parse errors
  }
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=weather_code`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const code: number | undefined = json?.current?.weather_code;
    if (typeof code !== "number") return null;
    const phrase = weatherFromCode(code);
    if (phrase) {
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ phrase, t: Date.now() }),
        );
      } catch {
        // ignore quota errors
      }
    }
    return phrase;
  } catch {
    return null;
  }
}

/**
 * A very quiet single line that greets the visitor based on their
 * local clock and pairs it with a one-word San Diego sky reading.
 * Reads as: "good night, light fog · ".
 *
 * Renders nothing on the server (SSR) so hydration never mismatches;
 * the greeting fades in once the browser clock lands, the weather
 * appends a moment later if the API responds.
 */
// markVisit() below writes the marker that readReturning() reads, so the
// answer has to be latched at the first read. Without the latch the
// snapshot would flip once the visit was recorded and the greeting would
// change under the reader mid-session.
let returningLatch: boolean | null = null;

function readReturningOnce(): boolean {
  if (returningLatch === null) returningLatch = readReturning();
  return returningLatch;
}

export function TimeGreeting() {
  // Both of these are browser reads, the clock and localStorage. They are
  // read on the first render instead of being written into state by an
  // effect afterwards; only the weather, which is genuinely async, stays
  // in state.
  const greeting = useClientValue<string | null>(
    () => getGreeting(new Date().getHours()),
    null,
  );
  const returning = useClientValue(readReturningOnce, false);
  const [weather, setWeather] = useState<string | null>(null);

  useEffect(() => {
    markVisit();
    let cancelled = false;
    fetchWeather().then((phrase) => {
      if (!cancelled) setWeather(phrase);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!greeting) return null;

  return (
    <span
      className="whitespace-nowrap"
      style={{ opacity: greeting ? 1 : 0, transition: "opacity 600ms" }}
    >
      {returning ? "welcome back" : greeting}
      {weather && <span>, {weather}</span>}
      <span aria-hidden className="ml-1 text-rose-400/70">
        ·
      </span>
    </span>
  );
}
