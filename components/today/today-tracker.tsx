"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useClientValue } from "@/lib/use-client-value";
import Link from "next/link";
import { toast } from "@/lib/toast";
import {
  ALL_WEEKDAYS,
  HABIT_WINDOWS,
  WINDOW_BLURBS,
  WINDOW_LABELS,
  addHabit,
  dayProgress,
  defaultState,
  deleteHabit,
  exportData,
  habitStreaks,
  habitsForDay,
  heatmap,
  importData,
  isDone,
  loadState,
  reorderHabit,
  saveState,
  toggle,
  todayISO,
  updateHabit,
  type Habit,
  type HabitState,
  type HabitWindow,
  type Weekday,
} from "@/lib/habits";

const WEEKDAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ── State reducer. All mutations route through the pure lib so the
// reducer stays a thin dispatcher; the effect below persists every
// change to localStorage (optimistic, UI updates first, write after).
type Action =
  | { type: "hydrate"; state: HabitState }
  | { type: "toggle"; iso: string; id: string }
  | { type: "add"; habit: Partial<Habit> }
  | { type: "update"; id: string; patch: Partial<Habit> }
  | { type: "delete"; id: string }
  | { type: "reorder"; id: string; dir: "up" | "down" }
  | { type: "replace"; state: HabitState };

function reducer(state: HabitState, action: Action): HabitState {
  switch (action.type) {
    case "hydrate":
    case "replace":
      return action.state;
    case "toggle":
      return toggle(state, action.iso, action.id);
    case "add":
      return addHabit(state, action.habit);
    case "update":
      return updateHabit(state, action.id, action.patch);
    case "delete":
      return deleteHabit(state, action.id);
    case "reorder":
      return reorderHabit(state, action.id, action.dir);
    default:
      return state;
  }
}

export function TodayTracker() {
  // First render uses the seed so the markup matches the server-rendered
  // fallback (no hydration mismatch); a layout effect swaps in the real
  // localStorage state before paint, so there's no flash of seed data.
  const [state, dispatch] = useReducer(reducer, undefined, defaultState);
  // false on the server, true from the client's first render, so the
  // persist effect below still cannot fire before the real state arrives.
  const hydrated = useClientValue(() => true, false);
  const [iso] = useState(() => todayISO());
  const [manageOpen, setManageOpen] = useState(false);

  // dispatch stays in an effect on purpose: the server cannot read
  // localStorage, so the reducer seeds with defaults, matches the
  // server HTML, and the real state is swapped in after mount.
  useEffect(() => {
    dispatch({ type: "hydrate", state: loadState() });
  }, []);

  // Persist after every change, but only once we've hydrated (so the
  // initial seed never overwrites real saved data).
  useEffect(() => {
    if (!hydrated) return;
    saveState(state);
  }, [state, hydrated]);

  const dayHabits = useMemo(() => habitsForDay(state, iso), [state, iso]);
  const progress = useMemo(() => dayProgress(state, iso), [state, iso]);

  const grouped = useMemo(() => {
    const map = new Map<HabitWindow, Habit[]>();
    for (const w of HABIT_WINDOWS) {
      const items = dayHabits.filter((h) => h.window === w);
      if (items.length) map.set(w, items);
    }
    return map;
  }, [dayHabits]);

  const onToggle = useCallback(
    (id: string) => dispatch({ type: "toggle", iso, id }),
    [iso],
  );

  return (
    <div suppressHydrationWarning>
      <ProgressBanner progress={progress} />

      <div className="mt-10 space-y-10">
        {[...grouped.entries()].map(([window, items]) => (
          <WindowSection
            key={window}
            window={window}
            items={items}
            state={state}
            iso={iso}
            onToggle={onToggle}
          />
        ))}
        {dayHabits.length === 0 && (
          <p className="rounded-2xl border border-dashed border-stone-300 px-5 py-8 text-center font-serif text-lg italic text-stone-500 dark:border-stone-700 dark:text-stone-400">
            Nothing scheduled today. Add a habit below.
          </p>
        )}
      </div>

      <Insights state={state} iso={iso} />

      <div className="mt-12 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setManageOpen((v) => !v)}
          aria-expanded={manageOpen}
          className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
        >
          {manageOpen ? "Done editing" : "Manage habits"}
        </button>
        <BackupControls state={state} onImport={(s) => dispatch({ type: "replace", state: s })} />
      </div>

      {manageOpen && (
        <ManagePanel
          state={state}
          dispatch={dispatch}
        />
      )}

      <RoutineLinks />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────

function ProgressBanner({
  progress,
}: {
  progress: { done: number; total: number; perfect: boolean };
}) {
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white/60 px-6 py-5 dark:border-stone-800 dark:bg-stone-900/40">
      <div className="flex items-baseline justify-between gap-4">
        <p
          className="font-serif text-2xl text-stone-900 dark:text-stone-100"
          aria-live="polite"
        >
          {progress.perfect ? (
            <span>
              Perfect day <span className="text-rose-500">❋</span>
            </span>
          ) : (
            <span>
              <span className="tabular-nums">{progress.done}</span> of{" "}
              <span className="tabular-nums">{progress.total}</span> done
            </span>
          )}
        </p>
        <span className="font-mono text-sm text-stone-400 tabular-nums dark:text-stone-500">
          {pct}%
        </span>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Today's completion"
      >
        <div
          className="h-full rounded-full bg-rose-400 transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function WindowSection({
  window,
  items,
  state,
  iso,
  onToggle,
}: {
  window: HabitWindow;
  items: Habit[];
  state: HabitState;
  iso: string;
  onToggle: (id: string) => void;
}) {
  return (
    <section aria-labelledby={`win-${window}`}>
      <div className="mb-3 flex items-baseline gap-3">
        <h2
          id={`win-${window}`}
          className="font-serif text-lg tracking-tight text-stone-900 dark:text-stone-100"
        >
          {WINDOW_LABELS[window]}
        </h2>
        <span className="text-[11px] uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
          {WINDOW_BLURBS[window]}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((h) => (
          <HabitRow
            key={h.id}
            habit={h}
            done={isDone(state, iso, h.id)}
            streak={habitStreaks(state, h, iso).current}
            onToggle={() => onToggle(h.id)}
          />
        ))}
      </ul>
    </section>
  );
}

function HabitRow({
  habit,
  done,
  streak,
  onToggle,
}: {
  habit: Habit;
  done: boolean;
  streak: number;
  onToggle: () => void;
}) {
  return (
    <li>
      <div
        className={`flex items-center gap-4 rounded-2xl border px-4 py-4 transition-colors ${
          done
            ? "border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/20"
            : "border-stone-200 bg-white/50 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900/30 dark:hover:border-stone-700"
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          role="checkbox"
          aria-checked={done}
          aria-label={`${habit.name}${done ? ", done" : ", not done"}`}
          className="flex flex-1 items-center gap-4 text-left"
        >
          <span
            aria-hidden
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
              done
                ? "border-rose-400 bg-rose-400 text-white"
                : "border-stone-300 dark:border-stone-600"
            }`}
          >
            {done ? "✓" : ""}
          </span>
          {habit.emoji && (
            <span aria-hidden className="text-xl leading-none">
              {habit.emoji}
            </span>
          )}
          <span
            className={`font-serif text-lg ${
              done
                ? "text-stone-400 line-through dark:text-stone-500"
                : "text-stone-900 dark:text-stone-100"
            }`}
          >
            {habit.name}
          </span>
        </button>

        {streak > 1 && (
          <span
            className="shrink-0 font-mono text-xs text-rose-500 tabular-nums"
            title={`${streak}-day streak`}
            aria-label={`${streak} day streak`}
          >
            🔥{streak}
          </span>
        )}
        {habit.reviewHref && (
          <Link
            href={habit.reviewHref}
            className="shrink-0 text-[11px] uppercase tracking-[0.16em] text-stone-400 underline-offset-4 hover:text-rose-500 hover:underline dark:text-stone-500"
          >
            Review
          </Link>
        )}
      </div>
    </li>
  );
}

// ── Insights: heatmap + weekly % + best streak ──────────────────────

function Insights({ state, iso }: { state: HabitState; iso: string }) {
  const cells = useMemo(() => heatmap(state, 13, iso), [state, iso]);
  const weekPct = useMemo(() => {
    // inline trailing-7 to avoid a second import surface
    let due = 0;
    let done = 0;
    for (const c of cells.slice(-7)) {
      if (c.due > 0) {
        due += c.due;
        done += c.done;
      }
    }
    return due > 0 ? Math.round((done / due) * 100) : 0;
  }, [cells]);

  const bestStreak = useMemo(() => {
    let best = 0;
    let bestName = "";
    for (const h of state.habits) {
      const { longest } = habitStreaks(state, h, iso);
      if (longest > best) {
        best = longest;
        bestName = h.name;
      }
    }
    return { best, bestName };
  }, [state, iso]);

  // Group the flat cell list into 13 week-columns of 7 (Sun..Sat).
  const columns: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));

  return (
    <section className="mt-14" aria-labelledby="insights">
      <h2
        id="insights"
        className="mb-4 font-serif text-lg tracking-tight text-stone-900 dark:text-stone-100"
      >
        The last three months
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="This week" value={`${weekPct}%`} />
        <Stat label="Today" value={`${dayProgress(state, iso).done}/${dayProgress(state, iso).total}`} />
        <Stat
          label="Best streak"
          value={bestStreak.best > 0 ? `${bestStreak.best}d` : "-"}
          sub={bestStreak.best > 0 ? bestStreak.bestName : undefined}
        />
      </div>

      <div className="mt-6 overflow-x-auto pb-2">
        <div className="flex gap-1" aria-hidden>
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {col.map((cell) => (
                <span
                  key={cell.iso}
                  title={`${cell.iso}: ${cell.ratio === null ? "nothing due" : `${cell.done}/${cell.due}`}`}
                  className="h-3 w-3 rounded-[3px]"
                  style={{ backgroundColor: heatColor(cell.ratio) }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-stone-400 dark:text-stone-500">
          <span>Less</span>
          {[null, 0, 0.34, 0.67, 1].map((r, i) => (
            <span
              key={i}
              className="h-3 w-3 rounded-[3px]"
              style={{ backgroundColor: heatColor(r as number | null) }}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </section>
  );
}

function heatColor(ratio: number | null): string {
  // Rose ramp; null (nothing due) reads as the empty stone cell.
  if (ratio === null) return "color-mix(in oklab, currentColor 8%, transparent)";
  if (ratio === 0) return "color-mix(in oklab, currentColor 12%, transparent)";
  if (ratio < 0.34) return "oklch(0.86 0.06 15)";
  if (ratio < 0.67) return "oklch(0.78 0.11 15)";
  if (ratio < 1) return "oklch(0.70 0.16 15)";
  return "oklch(0.62 0.20 15)";
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white/50 px-4 py-4 dark:border-stone-800 dark:bg-stone-900/30">
      <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
        {label}
      </p>
      <p className="mt-1 font-serif text-2xl text-stone-900 tabular-nums dark:text-stone-100">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">{sub}</p>
      )}
    </div>
  );
}

// ── Backup: export / import JSON ────────────────────────────────────

function BackupControls({
  state,
  onImport,
}: {
  state: HabitState;
  onImport: (s: HabitState) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const onExport = () => {
    const blob = new Blob([JSON.stringify(exportData(state), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `today-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Backup downloaded");
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const next = importData(String(reader.result ?? ""));
      if (!next) {
        toast("That file isn't a valid backup", { tone: "error" });
        return;
      }
      onImport(next);
      toast("Backup restored");
    };
    reader.onerror = () => toast("Couldn't read that file", { tone: "error" });
    reader.readAsText(file);
  };

  return (
    <>
      <button
        type="button"
        onClick={onExport}
        className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-900 transition-colors hover:border-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-stone-400"
      >
        Export backup
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-900 transition-colors hover:border-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-stone-400"
      >
        Import backup
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={onPick}
        className="hidden"
        aria-hidden
        tabIndex={-1}
      />
    </>
  );
}

// ── Manage panel: add / edit / delete / reorder ─────────────────────

function ManagePanel({
  state,
  dispatch,
}: {
  state: HabitState;
  dispatch: React.Dispatch<Action>;
}) {
  const ordered = [...state.habits].sort((a, b) => a.order - b.order);
  return (
    <div className="mt-6 rounded-2xl border border-stone-200 bg-white/50 p-5 dark:border-stone-800 dark:bg-stone-900/30">
      <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
        Everything is editable. Changes save to this device only, use{" "}
        <span className="font-medium text-stone-700 dark:text-stone-200">Export backup</span> to
        move your data to another phone or browser.
      </p>

      <ul className="space-y-3">
        {ordered.map((h, i) => (
          <HabitEditor
            key={h.id}
            habit={h}
            isFirst={i === 0}
            isLast={i === ordered.length - 1}
            dispatch={dispatch}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={() => dispatch({ type: "add", habit: { name: "New habit", window: "anytime" } })}
        className="mt-5 inline-flex items-center gap-2 rounded-full border border-dashed border-stone-400 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:border-rose-400 hover:text-rose-500 dark:border-stone-600 dark:text-stone-300"
      >
        + Add habit
      </button>
    </div>
  );
}

function HabitEditor({
  habit,
  isFirst,
  isLast,
  dispatch,
}: {
  habit: Habit;
  isFirst: boolean;
  isLast: boolean;
  dispatch: React.Dispatch<Action>;
}) {
  const set = (patch: Partial<Habit>) => dispatch({ type: "update", id: habit.id, patch });

  const toggleDay = (d: Weekday) => {
    const days = habit.days.includes(d)
      ? habit.days.filter((x) => x !== d)
      : [...habit.days, d].sort((a, b) => a - b);
    set({ days: days.length ? days : ALL_WEEKDAYS });
  };

  return (
    <li className="rounded-xl border border-stone-200 p-3 dark:border-stone-800">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={habit.emoji ?? ""}
          onChange={(e) => set({ emoji: e.target.value.slice(0, 2) || undefined })}
          aria-label={`Emoji for ${habit.name}`}
          placeholder="🙂"
          className="w-12 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-center text-base dark:border-stone-700 dark:bg-stone-950"
        />
        <input
          type="text"
          value={habit.name}
          onChange={(e) => set({ name: e.target.value })}
          aria-label="Habit name"
          className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
        />
        <select
          value={habit.window}
          onChange={(e) => set({ window: e.target.value as HabitWindow })}
          aria-label="Time window"
          className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
        >
          {HABIT_WINDOWS.map((w) => (
            <option key={w} value={w}>
              {WINDOW_LABELS[w]}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => dispatch({ type: "reorder", id: habit.id, dir: "up" })}
            disabled={isFirst}
            aria-label={`Move ${habit.name} up`}
            className="rounded-md px-2 py-1 text-stone-500 enabled:hover:text-stone-900 disabled:opacity-30 dark:enabled:hover:text-stone-100"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "reorder", id: habit.id, dir: "down" })}
            disabled={isLast}
            aria-label={`Move ${habit.name} down`}
            className="rounded-md px-2 py-1 text-stone-500 enabled:hover:text-stone-900 disabled:opacity-30 dark:enabled:hover:text-stone-100"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                typeof window !== "undefined" &&
                window.confirm(`Delete "${habit.name}"? Its history will be removed.`)
              ) {
                dispatch({ type: "delete", id: habit.id });
              }
            }}
            aria-label={`Delete ${habit.name}`}
            className="rounded-md px-2 py-1 text-stone-400 hover:text-rose-500"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] uppercase tracking-[0.16em] text-stone-400 dark:text-stone-500">
          Days
        </span>
        {ALL_WEEKDAYS.map((d) => {
          const on = habit.days.includes(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              aria-pressed={on}
              aria-label={WEEKDAY_FULL[d]}
              className={`h-7 w-7 rounded-full text-xs font-medium transition-colors ${
                on
                  ? "bg-rose-400 text-white"
                  : "bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
              }`}
            >
              {WEEKDAY_SHORT[d]}
            </button>
          );
        })}
      </div>
    </li>
  );
}

function RoutineLinks() {
  return (
    <div className="mt-16 border-t border-stone-200 pt-8 dark:border-stone-800">
      <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
        From the tracker, back to the writing
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <RoutineChip href="/routine" label="Routines" />
        <RoutineChip href="/build?tool=routine" label="Routine builder" />
        <RoutineChip href="/build?tool=simulator" label="Routine simulator" />
      </div>
    </div>
  );
}

function RoutineChip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 transition-colors hover:border-rose-400 hover:text-rose-500 dark:border-stone-700 dark:text-stone-300"
    >
      {label}
    </Link>
  );
}
