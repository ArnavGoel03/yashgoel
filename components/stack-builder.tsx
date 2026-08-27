"use client";

import Link from "next/link";
import { useClientValue } from "@/lib/use-client-value";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { safeInternalHref } from "@/lib/safe-url";

type CatalogItem = {
  kind: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  verdict?: "recommend" | "okay" | "bad";
  ingredients: string[];
  goal: string[];
};

type Window = "morning" | "midday" | "preworkout" | "postworkout" | "evening" | "bedtime";

type StackEntry = {
  id: string;
  source: "catalog" | "custom";
  window: Window;
  name: string;
  brand?: string;
  ingredients: string[];
  href?: string;
};

const WINDOWS: { id: Window; label: string; tip: string }[] = [
  { id: "morning", label: "Morning, with breakfast", tip: "Fat-soluble vitamins (A, D, E, K) absorb best with food." },
  { id: "midday", label: "Midday", tip: "B-complex hits later in the day cause sleep trouble for some." },
  { id: "preworkout", label: "Pre-workout", tip: "30-45 min before. Caffeine, citrulline, beta-alanine." },
  { id: "postworkout", label: "Post-workout", tip: "Protein within 60 min, creatine any time but PWO is the convenient slot." },
  { id: "evening", label: "Evening, with dinner", tip: "Magnesium glycinate, omega-3 with the largest fat-containing meal." },
  { id: "bedtime", label: "Bedtime", tip: "L-theanine, glycine, ashwagandha if you take it twice a day." },
];


const GOAL_OPTIONS = [
  { id: "muscle", label: "Strength + recovery" },
  { id: "sleep", label: "Sleep + stress" },
  { id: "energy", label: "Energy + cognition" },
  { id: "joints", label: "Joints + inflammation" },
  { id: "heart", label: "Cardio + lipids" },
  { id: "general", label: "General health" },
] as const;
type Goal = (typeof GOAL_OPTIONS)[number]["id"];

/**
 * Conservative supplement-conflict rules. Each rule fires when both
 * `a` and `b` are present in the stack (anywhere) or specifically in
 * the same window, depending on `scope`.
 */
const CONFLICTS: {
  a: string;
  b: string;
  scope: "stack" | "window";
  reason: string;
  severity: "warn" | "block";
}[] = [
  {
    a: "calcium",
    b: "iron",
    scope: "window",
    reason: "Calcium blocks iron absorption when taken together. Space them at least 2 hours apart.",
    severity: "block",
  },
  {
    a: "calcium",
    b: "thyroid",
    scope: "window",
    reason: "Calcium binds levothyroxine. Take thyroid med fasted, calcium at least 4 hours later.",
    severity: "block",
  },
  {
    a: "magnesium",
    b: "thyroid",
    scope: "window",
    reason: "Magnesium also binds thyroid medication. Take thyroid fasted, magnesium 4 hours later.",
    severity: "block",
  },
  {
    a: "iron",
    b: "magnesium",
    scope: "window",
    reason: "Iron and magnesium compete for the same divalent-cation transporter. Split by 2 hours.",
    severity: "warn",
  },
  {
    a: "zinc",
    b: "iron",
    scope: "window",
    reason: "Zinc and iron use overlapping transporters. Split by 2 hours.",
    severity: "warn",
  },
  {
    a: "zinc",
    b: "calcium",
    scope: "window",
    reason: "Calcium reduces zinc bioavailability. Split by 2 hours.",
    severity: "warn",
  },
  {
    a: "ashwagandha",
    b: "sedative",
    scope: "stack",
    reason: "Ashwagandha + benzos / sleep meds compounds central nervous system depression. Pick one.",
    severity: "block",
  },
  {
    a: "ashwagandha",
    b: "thyroid",
    scope: "stack",
    reason: "Ashwagandha can raise T4 levels; if you are on thyroid medication, monitor labs before adding.",
    severity: "warn",
  },
  {
    a: "tyrosine",
    b: "food",
    scope: "window",
    reason: "L-tyrosine for cognition is most effective on an empty stomach (proteins compete for transport). Take 30 min before food.",
    severity: "warn",
  },
  {
    a: "fish oil",
    b: "blood thinner",
    scope: "stack",
    reason: "High-dose fish oil + warfarin / aspirin raises bleed risk. Cap omega-3 below 3 g per day if anti-coagulated.",
    severity: "warn",
  },
  {
    a: "vitamin c",
    b: "iron",
    scope: "window",
    reason: "Vitamin C boosts iron absorption (~3x). Pair them ON purpose if you are iron-deficient.",
    severity: "warn",
  },
  {
    a: "caffeine",
    b: "ashwagandha",
    scope: "window",
    reason: "Caffeine and ashwagandha working in opposite directions in the same window cancel each other.",
    severity: "warn",
  },
  {
    a: "creatine",
    b: "caffeine",
    scope: "window",
    reason: "Older studies suggested caffeine blunts creatine; newer data does not replicate. Heads up only.",
    severity: "warn",
  },
];

const COMMON_TAGS = [
  "calcium",
  "magnesium",
  "iron",
  "zinc",
  "vitamin c",
  "vitamin d",
  "vitamin a",
  "vitamin k",
  "vitamin e",
  "vitamin b12",
  "b12",
  "fish oil",
  "omega",
  "creatine",
  "ashwagandha",
  "tyrosine",
  "caffeine",
  "thyroid",
  "sedative",
  "blood thinner",
  "food",
];

function lower(s: string) {
  return s.toLowerCase().trim();
}

function ingredientsHit(haystack: string[], needle: string): boolean {
  const n = lower(needle);
  return haystack.some((i) => lower(i).includes(n));
}

function nameHit(name: string, needle: string): boolean {
  return name.toLowerCase().includes(needle.toLowerCase());
}

function detectConflicts(entries: StackEntry[]) {
  const flags: { entryIds: [string, string]; reason: string; severity: "warn" | "block" }[] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const ei = entries[i];
      const ej = entries[j];
      for (const rule of CONFLICTS) {
        const inI = (n: string) =>
          ingredientsHit(ei.ingredients, n) || nameHit(ei.name, n);
        const inJ = (n: string) =>
          ingredientsHit(ej.ingredients, n) || nameHit(ej.name, n);
        const aBoth = (inI(rule.a) && inJ(rule.b)) || (inI(rule.b) && inJ(rule.a));
        if (!aBoth) continue;
        if (rule.scope === "window" && ei.window !== ej.window) continue;
        flags.push({
          entryIds: [ei.id, ej.id],
          reason: rule.reason,
          severity: rule.severity,
        });
      }
    }
  }
  return flags;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// URL serialization
type Serialized = {
  e: { i: string; s: "c" | "x"; w: Window; n: string; b?: string; g: string[]; h?: string }[];
  g: Goal[];
};

function encodeState(state: { entries: StackEntry[]; goals: Goal[] }): string {
  const s: Serialized = {
    e: state.entries.map((e) => ({
      i: e.id,
      s: e.source === "catalog" ? "c" : "x",
      w: e.window,
      n: e.name,
      b: e.brand,
      g: e.ingredients,
      h: e.href,
    })),
    g: state.goals,
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(s))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeState(raw: string | null): { entries: StackEntry[]; goals: Goal[] } | null {
  if (!raw) return null;
  try {
    const padded = raw + "==".slice(0, (4 - (raw.length % 4)) % 4);
    const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(b64)));
    const s = JSON.parse(json) as Serialized;
    return {
      entries: s.e.map((x) => ({
        id: x.i,
        source: x.s === "c" ? "catalog" : "custom",
        window: x.w,
        name: x.n,
        brand: x.b,
        ingredients: x.g ?? [],
        // Share-link payload comes from an attacker-controllable ?s= param;
        // only same-origin relative hrefs are allowed back into a <Link>.
        href: safeInternalHref(x.h),
      })),
      goals: s.g ?? [],
    };
  } catch {
    return null;
  }
}

// The share payload lives in the query string, which only exists in the
// browser. useSyncExternalStore hands back the server snapshot during
// hydration and the real one immediately after, so the hydrated HTML
// still matches the prerender and the seeding below happens on the very
// next render. `undefined` means "the client URL has not been read yet";
// `null` means "read it, there is nothing to restore".
let lastStackSearch: string | null = null;
let lastStackState: ReturnType<typeof decodeState> = null;

function stackStateFromUrl(): ReturnType<typeof decodeState> {
  const search = window.location.search;
  if (search !== lastStackSearch) {
    lastStackSearch = search;
    lastStackState = decodeState(new URLSearchParams(search).get("s"));
  }
  return lastStackState;
}

function useStackStateFromUrl() {
  return useClientValue<ReturnType<typeof decodeState> | undefined>(
    stackStateFromUrl,
    undefined,
  );
}

export function StackBuilder({ catalog }: { catalog: CatalogItem[] }) {
  const [entries, setEntries] = useState<StackEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [shareToast, setShareToast] = useState(false);

  // Seeding during render rather than from an effect matters here: React
  // finishes the re-render before committing, so the URL-writeback effect
  // below never sees an empty stack with `hydrated` already true and
  // never blanks the share link it was restoring from.
  const fromUrl = useStackStateFromUrl();
  const [hydrated, setHydrated] = useState(false);
  if (!hydrated && fromUrl !== undefined) {
    setHydrated(true);
    if (fromUrl) {
      setEntries(fromUrl.entries);
      setGoals(fromUrl.goals);
    }
  }

  useEffect(() => {
    if (!hydrated) return;
    const next =
      entries.length === 0
        ? "/build?tool=stack"
        : `/build?tool=stack&s=${encodeState({ entries, goals })}`;
    window.history.replaceState(null, "", next);
  }, [entries, goals, hydrated]);

  const conflicts = useMemo(() => detectConflicts(entries), [entries]);

  const grouped = useMemo(() => {
    const map = new Map<Window, StackEntry[]>();
    for (const w of WINDOWS) map.set(w.id, []);
    for (const e of entries) {
      map.get(e.window)?.push(e);
    }
    return WINDOWS.map((w) => ({ ...w, entries: map.get(w.id) ?? [] }));
  }, [entries]);

  function addEntry(e: Omit<StackEntry, "id">) {
    setEntries((prev) => [...prev, { ...e, id: makeId() }]);
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function moveEntry(id: string, window: Window) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, window } : e)));
  }

  function clearAll() {
    setEntries([]);
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2200);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_360px]">
      <div className="space-y-10">
        <Goals goals={goals} setGoals={setGoals} />
        <AddSupplement
          catalog={catalog}
          onAdd={addEntry}
          alreadyAdded={entries}
        />
        <Stack
          grouped={grouped}
          conflicts={conflicts}
          onRemove={removeEntry}
          onMove={moveEntry}
        />
        {entries.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-t border-stone-200 pt-6 dark:border-stone-800">
            <button
              type="button"
              onClick={copyShareLink}
              className="rounded-full bg-stone-900 px-5 py-2 text-sm text-white transition-colors hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
            >
              {shareToast ? "Link copied ❋" : "Copy share link"}
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-sm text-stone-500 underline-offset-4 transition-colors hover:text-rose-700 hover:underline dark:text-stone-400 dark:hover:text-rose-400"
            >
              Clear stack
            </button>
            <span className="ml-auto text-xs italic text-stone-400 dark:text-stone-500">
              Auto-saved to the URL.
            </span>
          </div>
        )}
      </div>

      <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <SidebarGuide goals={goals} />
      </aside>
    </div>
  );
}

function chipClass(on: boolean): string {
  return (
    "rounded-full border px-4 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 " +
    (on
      ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
      : "border-stone-200 bg-white text-stone-600 hover:border-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:border-stone-600")
  );
}

function Goals({
  goals,
  setGoals,
}: {
  goals: Goal[];
  setGoals: (g: Goal[]) => void;
}) {
  return (
    <fieldset className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
      <legend className="px-2 text-[10px] uppercase tracking-[0.22em] text-stone-400 dark:text-stone-500">
        Step 1 · Goals
      </legend>
      <p className="mt-2 mb-3 font-serif text-sm italic text-stone-600 dark:text-stone-400">
        Pick any number. Drives the cheat sheet on the right.
      </p>
      <div className="flex flex-wrap gap-2">
        {GOAL_OPTIONS.map((g) => {
          const on = goals.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setGoals(on ? goals.filter((x) => x !== g.id) : [...goals, g.id])
              }
              className={chipClass(on)}
            >
              {g.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function AddSupplement({
  catalog,
  onAdd,
  alreadyAdded,
}: {
  catalog: CatalogItem[];
  onAdd: (e: Omit<StackEntry, "id">) => void;
  alreadyAdded: StackEntry[];
}) {
  const [query, setQuery] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [customWindow, setCustomWindow] = useState<Window>("morning");
  const [customTags, setCustomTags] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = lower(query);
    if (q.length < 2) return [] as CatalogItem[];
    const addedKeys = new Set(
      alreadyAdded.filter((e) => e.source === "catalog").map((e) => e.href),
    );
    return catalog
      .filter((c) => {
        if (addedKeys.has(`/${c.kind}/${c.slug}`)) return false;
        return (
          c.name.toLowerCase().includes(q) ||
          c.brand.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.ingredients.some((i) => i.toLowerCase().includes(q))
        );
      })
      .slice(0, 8);
  }, [query, catalog, alreadyAdded]);

  function commitCatalog(c: CatalogItem) {
    const window = inferWindow(c);
    onAdd({
      source: "catalog",
      window,
      name: c.name,
      brand: c.brand,
      ingredients: c.ingredients,
      href: `/${c.kind}/${c.slug}`,
    });
    setQuery("");
    inputRef.current?.focus();
  }

  function commitCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!customName.trim()) return;
    onAdd({
      source: "custom",
      window: customWindow,
      name: customName.trim(),
      brand: customBrand.trim() || undefined,
      ingredients: customTags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setCustomName("");
    setCustomBrand("");
    setCustomTags("");
    setCustomWindow("morning");
    setShowCustom(false);
  }

  return (
    <fieldset className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
      <legend className="px-2 text-[10px] uppercase tracking-[0.22em] text-stone-400 dark:text-stone-500">
        Step 2 · Add to stack
      </legend>
      <label className="mt-2 block">
        <span className="sr-only">Search supplements</span>
        <span className="relative block">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500"
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search supplements (creatine, magnesium, omega…)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full border border-stone-200 bg-white py-2.5 pl-11 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500"
          />
        </span>
      </label>
      {matches.length > 0 && (
        <ul className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 dark:divide-stone-800 dark:border-stone-800">
          {matches.map((c) => (
            <li key={`${c.kind}-${c.slug}`}>
              <button
                type="button"
                onClick={() => commitCatalog(c)}
                className="flex w-full items-baseline justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                <span className="min-w-0">
                  <span className="block truncate font-serif text-base text-stone-900 dark:text-stone-100">
                    {c.name}
                  </span>
                  <span className="block truncate text-[10px] uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                    {c.brand} · {c.category}
                  </span>
                </span>
                <Plus className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!showCustom ? (
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          className="mt-4 text-sm italic text-stone-500 underline-offset-4 transition-colors hover:text-stone-900 hover:underline dark:text-stone-400 dark:hover:text-stone-100"
        >
          Add a supplement not in the catalog →
        </button>
      ) : (
        <form
          onSubmit={commitCustom}
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <input
            type="text"
            required
            placeholder="Supplement name *"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm focus:border-stone-400 focus:outline-none dark:border-stone-800 dark:bg-stone-900"
          />
          <input
            type="text"
            placeholder="Brand (optional)"
            value={customBrand}
            onChange={(e) => setCustomBrand(e.target.value)}
            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm focus:border-stone-400 focus:outline-none dark:border-stone-800 dark:bg-stone-900"
          />
          <select
            value={customWindow}
            onChange={(e) => setCustomWindow(e.target.value as Window)}
            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm focus:border-stone-400 focus:outline-none dark:border-stone-800 dark:bg-stone-900"
          >
            {WINDOWS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Tags (e.g. magnesium, glycine, sleep)"
            value={customTags}
            onChange={(e) => setCustomTags(e.target.value)}
            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm focus:border-stone-400 focus:outline-none dark:border-stone-800 dark:bg-stone-900"
            list="stack-tag-options"
          />
          <datalist id="stack-tag-options">
            {COMMON_TAGS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <div className="col-span-full flex items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-stone-900 px-5 py-2 text-sm text-white transition-colors hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
            >
              Add to stack
            </button>
            <button
              type="button"
              onClick={() => setShowCustom(false)}
              className="text-sm text-stone-500 underline-offset-4 transition-colors hover:text-stone-900 hover:underline dark:text-stone-400 dark:hover:text-stone-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </fieldset>
  );
}

function inferWindow(c: CatalogItem): Window {
  const haystack = (
    c.name +
    " " +
    c.category +
    " " +
    (c.ingredients ?? []).join(" ") +
    " " +
    (c.goal ?? []).join(" ")
  ).toLowerCase();
  if (/sleep|magnesium|melatonin|glycine|theanine|ashwagandha/.test(haystack)) {
    return "evening";
  }
  if (/protein|creatine|whey|isolate|bcaa/.test(haystack)) return "postworkout";
  if (/caffeine|preworkout|pre.workout|citrulline|beta.alanine/.test(haystack))
    return "preworkout";
  if (/omega|fish oil|epa|dha|d3/.test(haystack)) return "evening";
  return "morning";
}

function Stack({
  grouped,
  conflicts,
  onRemove,
  onMove,
}: {
  grouped: ({ id: Window; label: string; tip: string; entries: StackEntry[] })[];
  conflicts: { entryIds: [string, string]; reason: string; severity: "warn" | "block" }[];
  onRemove: (id: string) => void;
  onMove: (id: string, w: Window) => void;
}) {
  const totalEntries = grouped.reduce((n, g) => n + g.entries.length, 0);
  if (totalEntries === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-12 text-center dark:border-stone-700 dark:bg-stone-900">
        <p className="font-serif text-xl italic text-stone-500 dark:text-stone-400">
          Your stack is clear. Add something above when you&apos;re ready.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {conflicts.length > 0 && (
        <div className="space-y-2">
          {conflicts.map((c, i) => (
            <p
              key={i}
              role="alert"
              className={
                "flex items-baseline gap-3 rounded-xl border px-4 py-3 text-sm " +
                (c.severity === "block"
                  ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
                  : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200")
              }
            >
              <span aria-hidden className="text-rose-400">❋</span>
              <span>
                <strong className="font-medium">
                  {c.severity === "block" ? "Conflict" : "Heads up"}:
                </strong>{" "}
                {c.reason}
              </span>
            </p>
          ))}
        </div>
      )}

      {grouped
        .filter((g) => g.entries.length > 0)
        .map((g) => (
          <section
            key={g.id}
            className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-100 pb-3 dark:border-stone-800">
              <h3 className="font-serif text-lg text-stone-900 dark:text-stone-100">
                {g.label}
              </h3>
              <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
                {g.entries.length} item{g.entries.length === 1 ? "" : "s"}
              </p>
            </div>
            <p className="mb-4 font-serif text-sm italic text-stone-500 dark:text-stone-400">
              {g.tip}
            </p>
            <ul className="space-y-3">
              {g.entries.map((e) => (
                <li key={e.id} className="flex items-baseline gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-base text-stone-900 dark:text-stone-100">
                      {e.href ? (
                        <Link
                          href={e.href}
                          className="underline decoration-stone-300 underline-offset-4 transition-colors hover:decoration-rose-400 dark:decoration-stone-700"
                        >
                          {e.name}
                        </Link>
                      ) : (
                        e.name
                      )}
                    </p>
                    {e.brand && (
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {e.brand}
                      </p>
                    )}
                  </div>
                  <select
                    aria-label={`Move ${e.name} to a different window`}
                    value={e.window}
                    onChange={(ev) => onMove(e.id, ev.target.value as Window)}
                    className="rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-stone-500 focus:border-stone-400 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
                  >
                    {WINDOWS.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label={`Remove ${e.name}`}
                    onClick={() => onRemove(e.id)}
                    className="rounded-full p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-rose-700 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-rose-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

function SidebarGuide({ goals }: { goals: Goal[] }) {
  const tips: string[] = [];
  if (goals.includes("muscle"))
    tips.push("Creatine 3-5 g daily, no loading. Whey within 60 min post-workout.");
  if (goals.includes("sleep"))
    tips.push("Magnesium glycinate 200-400 mg about 60 min before bed.");
  if (goals.includes("energy"))
    tips.push("Caffeine + L-theanine 1:2 in the morning is the cleanest stim.");
  if (goals.includes("joints"))
    tips.push("Fish oil 2-3 g EPA+DHA per day. Curcumin pairs with piperine for absorption.");
  if (goals.includes("heart"))
    tips.push("Omega-3 with the largest fat-containing meal. CoQ10 if on statins.");
  if (goals.includes("general"))
    tips.push("Vitamin D 1000-2000 IU daily; check serum 25-OH-D once a year.");

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
      <p className="text-[10px] uppercase tracking-[0.22em] text-stone-400 dark:text-stone-500">
        ❋ Cheat sheet
      </p>
      <ul className="mt-4 space-y-3 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
        {tips.length > 0 ? (
          tips.map((t, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="mt-0.5 text-rose-400">❋</span>
              <span>{t}</span>
            </li>
          ))
        ) : (
          <li className="font-serif italic text-stone-500 dark:text-stone-400">
            Pick a goal above to see specific dosing notes.
          </li>
        )}
        <li className="flex gap-2 border-t border-stone-100 pt-3 dark:border-stone-800">
          <span aria-hidden className="mt-0.5 text-rose-400">❋</span>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            Not medical advice. Run anything prescription-adjacent past a
            clinician first.
          </span>
        </li>
      </ul>
    </div>
  );
}
