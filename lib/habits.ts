// Habit-tracker domain logic for /today.
//
// This is the *pure* layer: types, the default seed, localStorage
// read/write, streak/heatmap math, and export/import. It carries no
// React and no DOM dependency beyond `localStorage` (guarded), so it
// unit-tests cleanly and the client island stays thin.
//
// Everything the tracker knows lives in a single localStorage key
// (`HABITS_STORAGE_KEY`). There is no backend, no auth, no per-user DB -
// this is Yash's personal tracker and it must work instantly and
// offline. Data is per-device; JSON export/import is the portability
// story (see exportData / importData).

// ────────────────────────────────────────────────────────────────────
// Windows, reuse the site's existing routine vocabulary exactly.
// `morning` / `evening` / `shower` / `oral` mirror lib/routines.ts
// (RoutineSlug). `anytime` is the catch-all for habits that aren't
// pinned to one of the site's routine windows (e.g. supplements taken
// with whatever meal). `stack` is intentionally NOT a window here -
// stack is a supplement *protocol*, not a time-of-day; its members
// surface under morning/evening/anytime instead.
// ────────────────────────────────────────────────────────────────────

export const HABIT_WINDOWS = [
  "morning",
  "evening",
  "shower",
  "oral",
  "anytime",
] as const;

export type HabitWindow = (typeof HABIT_WINDOWS)[number];

export const WINDOW_LABELS: Record<HabitWindow, string> = {
  morning: "Morning",
  evening: "Evening",
  shower: "Shower",
  oral: "Oral",
  anytime: "Anytime",
};

export const WINDOW_BLURBS: Record<HabitWindow, string> = {
  morning: "First hour of the day.",
  evening: "The night shift.",
  shower: "Under running water.",
  oral: "Twice a day, same order.",
  anytime: "Whenever it fits.",
};

// Weekday indices match Date.getDay(): 0 = Sunday … 6 = Saturday.
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const ALL_WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export type Habit = {
  id: string;
  name: string;
  /** Optional single-character emoji shown on the row. */
  emoji?: string;
  window: HabitWindow;
  /** Which weekdays this habit applies to. Empty/all = every day. */
  days: Weekday[];
  /**
   * Optional deep link to a review on the site (e.g.
   * `/skincare/some-slug`). Lightweight, lets a tracked habit jump to
   * the product it corresponds to. Never required.
   */
  reviewHref?: string;
  /** Sort order within (and across) windows. */
  order: number;
};

/**
 * Completion log. Keys are ISO dates (`YYYY-MM-DD`); each value is the
 * set of habit ids checked off that day, as an array (JSON-friendly).
 * A habit id present === done. Absent === not done.
 */
export type CompletionLog = Record<string, string[]>;

export type HabitState = {
  version: 1;
  habits: Habit[];
  log: CompletionLog;
};

export const HABITS_STORAGE_KEY = "yashgoel.today.v1";

// User-facing app version for the /today tracker. Surfaced on the page
// and stamped into every backup so you can tell which build produced a
// file and confirm a PWA update actually landed on your phone. Bump this
// on any meaningful tracker change. NOTE: the `version: 1` on HabitState
// is the *data-schema* version (bump only on a breaking state-shape
// change + a migration); TODAY_VERSION is the *app* version.
export const TODAY_VERSION = "1.0.0";
export const SCHEMA_VERSION = 1 as const;

// ────────────────────────────────────────────────────────────────────
// Default seed, shipped on first run, everything editable afterward.
// Matches the brief: Brush AM, Brush PM, Floss, Skincare AM, Skincare
// PM, Sunscreen, Supplements, Shower.
// ────────────────────────────────────────────────────────────────────

export function defaultHabits(): Habit[] {
  const seed: Omit<Habit, "order">[] = [
    { id: "brush-am", name: "Brush teeth (AM)", emoji: "🪥", window: "oral", days: ALL_WEEKDAYS },
    { id: "brush-pm", name: "Brush teeth (PM)", emoji: "🪥", window: "oral", days: ALL_WEEKDAYS },
    { id: "floss", name: "Floss", emoji: "🧵", window: "oral", days: ALL_WEEKDAYS },
    { id: "skincare-am", name: "Skincare (AM)", emoji: "🧴", window: "morning", days: ALL_WEEKDAYS },
    { id: "skincare-pm", name: "Skincare (PM)", emoji: "🌙", window: "evening", days: ALL_WEEKDAYS },
    { id: "sunscreen", name: "Sunscreen", emoji: "☀️", window: "morning", days: ALL_WEEKDAYS },
    { id: "supplements", name: "Supplements", emoji: "💊", window: "anytime", days: ALL_WEEKDAYS },
    { id: "shower", name: "Shower", emoji: "🚿", window: "shower", days: ALL_WEEKDAYS },
  ];
  return seed.map((h, i) => ({ ...h, order: i }));
}

export function defaultState(): HabitState {
  return { version: 1, habits: defaultHabits(), log: {} };
}

// ────────────────────────────────────────────────────────────────────
// Date helpers, local-time ISO (YYYY-MM-DD), never UTC, so "today"
// lines up with the user's wall clock and not a timezone boundary.
// ────────────────────────────────────────────────────────────────────

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

/** Parse an ISO date as a *local* midnight Date (avoids UTC drift). */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function weekdayOf(iso: string): Weekday {
  return fromISODate(iso).getDay() as Weekday;
}

/** Does this habit apply on the given ISO date's weekday? */
export function appliesOn(habit: Habit, iso: string): boolean {
  if (!habit.days || habit.days.length === 0) return true;
  return habit.days.includes(weekdayOf(iso));
}

// ────────────────────────────────────────────────────────────────────
// Persistence, guarded so SSR / private-mode / quota errors never
// throw into the render path. A read failure falls back to the seed.
// ────────────────────────────────────────────────────────────────────

export function loadState(): HabitState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(HABITS_STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as unknown;
    return normalizeState(parsed);
  } catch {
    return defaultState();
  }
}

export function saveState(state: HabitState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota / private mode, drop silently; the in-memory state still works.
  }
}

/**
 * Coerce arbitrary parsed JSON into a valid HabitState. Defensive so a
 * hand-edited or partially-corrupt blob (or an imported file) can never
 * crash the tracker, anything unrecognized falls back to the seed.
 */
export function normalizeState(input: unknown): HabitState {
  if (!input || typeof input !== "object") return defaultState();
  const obj = input as Record<string, unknown>;

  const rawHabits = Array.isArray(obj.habits) ? obj.habits : null;
  const habits: Habit[] = rawHabits
    ? rawHabits
        .map((h, i) => normalizeHabit(h, i))
        .filter((h): h is Habit => h !== null)
    : defaultHabits();

  const log: CompletionLog = {};
  if (obj.log && typeof obj.log === "object") {
    for (const [date, ids] of Object.entries(obj.log as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (!Array.isArray(ids)) continue;
      log[date] = ids.filter((x): x is string => typeof x === "string");
    }
  }

  return { version: 1, habits: habits.length ? habits : defaultHabits(), log };
}

function normalizeHabit(input: unknown, index: number): Habit | null {
  if (!input || typeof input !== "object") return null;
  const h = input as Record<string, unknown>;
  const id = typeof h.id === "string" && h.id ? h.id : null;
  const name = typeof h.name === "string" ? h.name.trim() : "";
  if (!id || !name) return null;

  const window: HabitWindow = (HABIT_WINDOWS as readonly string[]).includes(
    h.window as string,
  )
    ? (h.window as HabitWindow)
    : "anytime";

  const days: Weekday[] = Array.isArray(h.days)
    ? (h.days.filter(
        (d) => typeof d === "number" && d >= 0 && d <= 6,
      ) as Weekday[])
    : ALL_WEEKDAYS;

  return {
    id,
    name,
    emoji: typeof h.emoji === "string" && h.emoji ? h.emoji : undefined,
    window,
    days: days.length ? days : ALL_WEEKDAYS,
    reviewHref:
      typeof h.reviewHref === "string" && h.reviewHref.startsWith("/")
        ? h.reviewHref
        : undefined,
    order: typeof h.order === "number" ? h.order : index,
  };
}

// ────────────────────────────────────────────────────────────────────
// Mutations, pure, return a new state (immutable so React re-renders
// see a fresh reference). The caller persists.
// ────────────────────────────────────────────────────────────────────

export function isDone(state: HabitState, iso: string, habitId: string): boolean {
  return (state.log[iso] ?? []).includes(habitId);
}

export function toggle(state: HabitState, iso: string, habitId: string): HabitState {
  const current = state.log[iso] ?? [];
  const next = current.includes(habitId)
    ? current.filter((id) => id !== habitId)
    : [...current, habitId];
  const log = { ...state.log };
  if (next.length) log[iso] = next;
  else delete log[iso];
  return { ...state, log };
}

export function newHabitId(): string {
  // Crypto-random where available; deterministic-ish fallback otherwise.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addHabit(state: HabitState, partial: Partial<Habit>): HabitState {
  const maxOrder = state.habits.reduce((m, h) => Math.max(m, h.order), -1);
  const habit: Habit = {
    id: partial.id ?? newHabitId(),
    name: partial.name?.trim() || "New habit",
    emoji: partial.emoji,
    window: partial.window ?? "anytime",
    days: partial.days?.length ? partial.days : ALL_WEEKDAYS,
    reviewHref: partial.reviewHref,
    order: maxOrder + 1,
  };
  return { ...state, habits: [...state.habits, habit] };
}

export function updateHabit(
  state: HabitState,
  id: string,
  patch: Partial<Habit>,
): HabitState {
  return {
    ...state,
    habits: state.habits.map((h) =>
      h.id === id ? { ...h, ...patch, id: h.id } : h,
    ),
  };
}

export function deleteHabit(state: HabitState, id: string): HabitState {
  const log: CompletionLog = {};
  for (const [date, ids] of Object.entries(state.log)) {
    const kept = ids.filter((x) => x !== id);
    if (kept.length) log[date] = kept;
  }
  return { ...state, habits: state.habits.filter((h) => h.id !== id), log };
}

/** Move a habit one slot up/down within the full ordered list. */
export function reorderHabit(
  state: HabitState,
  id: string,
  direction: "up" | "down",
): HabitState {
  const sorted = [...state.habits].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((h) => h.id === id);
  if (idx === -1) return state;
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= sorted.length) return state;
  const a = sorted[idx];
  const b = sorted[swapWith];
  const aOrder = a.order;
  const updated = state.habits.map((h) => {
    if (h.id === a.id) return { ...h, order: b.order };
    if (h.id === b.id) return { ...h, order: aOrder };
    return h;
  });
  return { ...state, habits: updated };
}

// ────────────────────────────────────────────────────────────────────
// Derived views.
// ────────────────────────────────────────────────────────────────────

export function habitsForDay(state: HabitState, iso: string): Habit[] {
  return [...state.habits]
    .filter((h) => appliesOn(h, iso))
    .sort((a, b) => a.order - b.order);
}

export function dayProgress(
  state: HabitState,
  iso: string,
): { done: number; total: number; perfect: boolean } {
  const due = habitsForDay(state, iso);
  const done = due.filter((h) => isDone(state, iso, h.id)).length;
  return { done, total: due.length, perfect: due.length > 0 && done === due.length };
}

/**
 * Streaks for a single habit, counted only over the days the habit
 * actually applies to (a weekday-restricted habit doesn't break its
 * chain on a day it was never due). `current` walks backward from the
 * reference date; `longest` scans the whole due-day history.
 */
export function habitStreaks(
  state: HabitState,
  habit: Habit,
  refISO: string = todayISO(),
): { current: number; longest: number } {
  // Build the sorted set of due dates from the earliest log entry (or
  // today) up to the reference date.
  const logDates = Object.keys(state.log);
  const earliest =
    logDates.length > 0
      ? logDates.reduce((min, d) => (d < min ? d : min), refISO)
      : refISO;

  const start = fromISODate(earliest);
  const end = fromISODate(refISO);
  const dueDays: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = toISODate(d);
    if (appliesOn(habit, iso)) dueDays.push(iso);
  }

  let longest = 0;
  let run = 0;
  for (const iso of dueDays) {
    if (isDone(state, iso, habit.id)) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  // Current streak: walk due-days backward from the reference date.
  // The reference day not being done yet does NOT break a streak that
  // was alive yesterday (you still have today to do it), so we skip a
  // not-yet-done reference day before counting.
  let current = 0;
  for (let i = dueDays.length - 1; i >= 0; i--) {
    const iso = dueDays[i];
    const done = isDone(state, iso, habit.id);
    if (i === dueDays.length - 1 && iso === refISO && !done) continue;
    if (done) current += 1;
    else break;
  }

  return { current, longest };
}

/**
 * Heatmap cells for the last `weeks` weeks ending today, GitHub-style:
 * one cell per day, value = fraction of due habits completed (0..1),
 * or null when nothing was due that day.
 */
export type HeatCell = { iso: string; ratio: number | null; due: number; done: number };

export function heatmap(
  state: HabitState,
  weeks = 13,
  refISO: string = todayISO(),
): HeatCell[] {
  const end = fromISODate(refISO);
  const cells: HeatCell[] = [];
  const totalDays = weeks * 7;
  const start = new Date(end);
  start.setDate(start.getDate() - (totalDays - 1));
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = toISODate(d);
    const { done, total } = dayProgress(state, iso);
    cells.push({
      iso,
      done,
      due: total,
      ratio: total > 0 ? done / total : null,
    });
  }
  return cells;
}

/** Completion % over the trailing `days` window (default 7). */
export function weeklyCompletion(
  state: HabitState,
  days = 7,
  refISO: string = todayISO(),
): number {
  const end = fromISODate(refISO);
  let due = 0;
  let done = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const p = dayProgress(state, toISODate(d));
    due += p.total;
    done += p.done;
  }
  return due > 0 ? Math.round((done / due) * 100) : 0;
}

// ────────────────────────────────────────────────────────────────────
// Export / import, the portability story for a per-device store.
// ────────────────────────────────────────────────────────────────────

export type ExportEnvelope = {
  app: "yashgoel-today";
  /** Data-schema version (matches HabitState.version). */
  version: 1;
  /** App/build version that produced this backup (TODAY_VERSION). */
  appVersion: string;
  exportedAt: string;
  state: HabitState;
};

export function exportData(state: HabitState): ExportEnvelope {
  return {
    app: "yashgoel-today",
    version: SCHEMA_VERSION,
    appVersion: TODAY_VERSION,
    exportedAt: new Date().toISOString(),
    state,
  };
}

/**
 * Accepts either a bare HabitState or an ExportEnvelope (from
 * exportData). Returns a normalized state, or null when the blob is
 * unrecognizable.
 */
export function importData(raw: string): HabitState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const candidate =
    obj.app === "yashgoel-today" && obj.state ? obj.state : parsed;
  const normalized = normalizeState(candidate);
  // Guard against an empty import overwriting real data with nothing:
  // an import with no habits is treated as invalid.
  if (!normalized.habits.length) return null;
  return normalized;
}
