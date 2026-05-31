import { describe, expect, it } from "vitest";
import {
  addHabit,
  appliesOn,
  dayProgress,
  defaultHabits,
  defaultState,
  deleteHabit,
  exportData,
  habitStreaks,
  habitsForDay,
  heatmap,
  importData,
  isDone,
  normalizeState,
  reorderHabit,
  toggle,
  updateHabit,
  weeklyCompletion,
  type HabitState,
} from "./habits";

const everyday: import("./habits").Weekday[] = [0, 1, 2, 3, 4, 5, 6];

function seeded(): HabitState {
  return defaultState();
}

describe("default seed", () => {
  it("ships the eight documented habits", () => {
    const ids = defaultHabits().map((h) => h.id);
    expect(ids).toEqual([
      "brush-am",
      "brush-pm",
      "floss",
      "skincare-am",
      "skincare-pm",
      "sunscreen",
      "supplements",
      "shower",
    ]);
  });

  it("assigns sequential order", () => {
    const orders = defaultHabits().map((h) => h.order);
    expect(orders).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});

describe("toggle + isDone", () => {
  it("toggles a habit on and off, pruning empty days", () => {
    let s = seeded();
    expect(isDone(s, "2026-05-30", "floss")).toBe(false);
    s = toggle(s, "2026-05-30", "floss");
    expect(isDone(s, "2026-05-30", "floss")).toBe(true);
    s = toggle(s, "2026-05-30", "floss");
    expect(isDone(s, "2026-05-30", "floss")).toBe(false);
    expect(s.log["2026-05-30"]).toBeUndefined();
  });
});

describe("weekday filtering", () => {
  it("appliesOn respects the days list", () => {
    const wkday = { ...defaultHabits()[0], days: [1, 2, 3, 4, 5] as import("./habits").Weekday[] };
    // 2026-05-30 is a Saturday (getDay 6), 2026-06-01 a Monday.
    expect(appliesOn(wkday, "2026-05-30")).toBe(false);
    expect(appliesOn(wkday, "2026-06-01")).toBe(true);
  });

  it("empty days means every day", () => {
    const h = { ...defaultHabits()[0], days: [] as import("./habits").Weekday[] };
    expect(appliesOn(h, "2026-05-30")).toBe(true);
  });
});

describe("dayProgress", () => {
  it("counts done vs due and flags a perfect day", () => {
    let s: HabitState = {
      version: 1,
      habits: [
        { id: "a", name: "A", window: "anytime", days: everyday, order: 0 },
        { id: "b", name: "B", window: "anytime", days: everyday, order: 1 },
      ],
      log: {},
    };
    expect(dayProgress(s, "2026-05-30")).toEqual({ done: 0, total: 2, perfect: false });
    s = toggle(s, "2026-05-30", "a");
    expect(dayProgress(s, "2026-05-30")).toEqual({ done: 1, total: 2, perfect: false });
    s = toggle(s, "2026-05-30", "b");
    expect(dayProgress(s, "2026-05-30")).toEqual({ done: 2, total: 2, perfect: true });
  });
});

describe("CRUD", () => {
  it("adds, updates, deletes, and reorders", () => {
    let s = defaultState();
    const before = s.habits.length;
    s = addHabit(s, { name: "Read", window: "evening" });
    expect(s.habits.length).toBe(before + 1);
    const added = s.habits[s.habits.length - 1];
    expect(added.order).toBe(before); // max+1

    s = updateHabit(s, added.id, { name: "Read a book" });
    expect(s.habits.find((h) => h.id === added.id)?.name).toBe("Read a book");

    s = deleteHabit(s, added.id);
    expect(s.habits.find((h) => h.id === added.id)).toBeUndefined();
  });

  it("delete scrubs the habit out of the completion log", () => {
    let s = defaultState();
    s = toggle(s, "2026-05-30", "floss");
    s = deleteHabit(s, "floss");
    expect(isDone(s, "2026-05-30", "floss")).toBe(false);
  });

  it("reorder swaps adjacent order values", () => {
    let s = defaultState();
    const first = habitsForDay(s, "2026-05-30")[0];
    const second = habitsForDay(s, "2026-05-30")[1];
    s = reorderHabit(s, second.id, "up");
    const reordered = habitsForDay(s, "2026-05-30");
    expect(reordered[0].id).toBe(second.id);
    expect(reordered[1].id).toBe(first.id);
  });
});

describe("streaks", () => {
  it("counts a current and longest streak over consecutive days", () => {
    const habit = { id: "x", name: "X", window: "anytime" as const, days: everyday, order: 0 };
    let s: HabitState = { version: 1, habits: [habit], log: {} };
    for (const d of ["2026-05-28", "2026-05-29", "2026-05-30"]) {
      s = toggle(s, d, "x");
    }
    const { current, longest } = habitStreaks(s, habit, "2026-05-30");
    expect(current).toBe(3);
    expect(longest).toBe(3);
  });

  it("an unfinished reference day does not break a live streak", () => {
    const habit = { id: "x", name: "X", window: "anytime" as const, days: everyday, order: 0 };
    let s: HabitState = { version: 1, habits: [habit], log: {} };
    s = toggle(s, "2026-05-28", "x");
    s = toggle(s, "2026-05-29", "x");
    // 2026-05-30 not done yet
    const { current } = habitStreaks(s, habit, "2026-05-30");
    expect(current).toBe(2);
  });

  it("a missed earlier day caps the longest streak", () => {
    const habit = { id: "x", name: "X", window: "anytime" as const, days: everyday, order: 0 };
    let s: HabitState = { version: 1, habits: [habit], log: {} };
    s = toggle(s, "2026-05-25", "x");
    // gap on 26th
    s = toggle(s, "2026-05-27", "x");
    s = toggle(s, "2026-05-28", "x");
    const { longest } = habitStreaks(s, habit, "2026-05-28");
    expect(longest).toBe(2);
  });
});

describe("heatmap + weekly completion", () => {
  it("returns weeks*7 cells with null ratio on no-due days", () => {
    const s = defaultState();
    const cells = heatmap(s, 13, "2026-05-30");
    expect(cells.length).toBe(13 * 7);
    expect(cells[cells.length - 1].iso).toBe("2026-05-30");
  });

  it("weeklyCompletion is a 0..100 percentage", () => {
    let s: HabitState = {
      version: 1,
      habits: [{ id: "a", name: "A", window: "anytime", days: everyday, order: 0 }],
      log: {},
    };
    s = toggle(s, "2026-05-30", "a");
    const pct = weeklyCompletion(s, 7, "2026-05-30");
    // 1 done of 7 due = 14%
    expect(pct).toBe(14);
  });
});

describe("normalize + import/export", () => {
  it("normalizes garbage to the seed", () => {
    expect(normalizeState(null).habits.length).toBeGreaterThan(0);
    expect(normalizeState({ habits: "nope" }).habits.length).toBeGreaterThan(0);
  });

  it("drops invalid log dates and non-string ids", () => {
    const norm = normalizeState({
      habits: defaultHabits(),
      log: { "2026-05-30": ["floss", 5], bad: ["x"] },
    });
    expect(norm.log["2026-05-30"]).toEqual(["floss"]);
    expect(norm.log["bad"]).toBeUndefined();
  });

  it("round-trips through export/import", () => {
    let s = defaultState();
    s = toggle(s, "2026-05-30", "floss");
    const json = JSON.stringify(exportData(s));
    const back = importData(json);
    expect(back).not.toBeNull();
    expect(isDone(back!, "2026-05-30", "floss")).toBe(true);
  });

  it("imports a bare state too", () => {
    const back = importData(JSON.stringify(defaultState()));
    expect(back?.habits.length).toBe(8);
  });

  it("rejects an import with no habits", () => {
    expect(importData(JSON.stringify({ habits: [], log: {} }))).toBeNull();
    expect(importData("not json")).toBeNull();
  });
});
