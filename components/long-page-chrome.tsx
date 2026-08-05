"use client";

import { usePathname } from "next/navigation";
import { ReadingProgress } from "@/components/reading-progress";
import { BackToTop } from "@/components/back-to-top";
import { KINDS, kindPath } from "@/lib/types";

// Pathname prefixes that warrant the long-page chrome (top reading
// progress bar + back-to-top FAB). Anything not in this list (home,
// category indexes, /about, /now, /admin, etc.) is short enough that
// the chrome would just add listeners for no real benefit.
const LONG_PREFIXES = [
  "/primers/",
  "/reading/",
  "/watching/",
  "/photos",
  "/routine/",
  // Every review detail page, derived so a new kind is covered the
  // day it ships.
  ...KINDS.map((kind) => `${kindPath(kind)}/`),
];

function isLong(path: string): boolean {
  return LONG_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function LongPageChrome() {
  const path = usePathname() ?? "/";
  if (!isLong(path)) return null;
  return (
    <>
      <ReadingProgress />
      <BackToTop />
    </>
  );
}
