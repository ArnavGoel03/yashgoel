"use client";

import { useEffect, useState } from "react";
import { useClientValue } from "@/lib/use-client-value";
import {
  audioCuesEnabled,
  playBell,
  setAudioCues,
} from "@/lib/sounds";

/**
 * Mounts once in layout.tsx.
 *
 * Behaviour:
 *   - On first mount (page-load), plays a soft bell if audio cues are
 *     enabled.
 *   - Both are no-ops when audio is disabled (default OFF).
 *
 * The route-change click that used to live here was removed , even at
 * low volume it fired on every navigation, which read as a UI tick on
 * every link instead of a calm cue. The bell stays for opt-in users.
 *
 * The component renders nothing visible , the footer toggle is a
 * separate export `AudioToggle` that the Footer component can import.
 */
export function AudioCues() {
  useEffect(() => {
    // Small defer so the AudioContext isn't created during the very
    // first synchronous render , some browsers need a user gesture
    // first. The tiny delay also lets the browser settle the page
    // before the bell plays.
    const t = setTimeout(() => playBell(), 300);
    return () => clearTimeout(t);
  }, []);
  return null;
}

/**
 * Footer toggle: a tiny text button that persists the user's preference
 * in localStorage. Renders the current state from localStorage so it's
 * always accurate after a page reload.
 */
export function AudioToggle() {
  // null until the browser has been read, which is what keeps the label
  // from flashing the wrong word. The stored value is read rather than
  // copied into state on mount; a click takes precedence over it.
  const stored = useClientValue<boolean | null>(audioCuesEnabled, null);
  const [override, setOverride] = useState<boolean | null>(null);
  const enabled = override ?? stored;

  function toggle() {
    const next = !enabled;
    setOverride(next);
    setAudioCues(next);
  }

  // Don't render until we've read localStorage so the label is correct.
  if (enabled === null) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className="transition-colors hover:text-stone-700 dark:hover:text-stone-200"
      aria-pressed={enabled}
      aria-label={enabled ? "Disable sound" : "Enable sound"}
    >
      {enabled ? "Sound on" : "Sound off"}
    </button>
  );
}
