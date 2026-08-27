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

type RoutineEntry = {
  /** Stable key for React + URL serialization. */
  id: string;
  source: "catalog" | "custom";
  /** Used by the layout. Must be one of SKINCARE_CATEGORIES below. */
  category: string;
  name: string;
  brand?: string;
  ingredients: string[];
  /** Catalog cross-link, only set when source === 'catalog'. */
  href?: string;
};

const SKINCARE_ORDER: { id: string; label: string; tip?: string }[] = [
  { id: "face wash", label: "Face wash / oil cleanse", tip: "60 seconds, lukewarm water." },
  { id: "cleanser", label: "Second cleanse", tip: "PM only if you wore SPF or makeup." },
  { id: "chemical exfoliant", label: "Chemical exfoliant", tip: "AHA / BHA. 2-3 nights a week, never with retinoids." },
  { id: "chemical peel", label: "Peel", tip: "Once a week max. AHA 30% / BHA 2% kind." },
  { id: "toner", label: "Toner", tip: "Damp skin. Pat in." },
  { id: "essence", label: "Essence", tip: "Korean step. Hydration before serums." },
  { id: "patches", label: "Patches", tip: "On active spots before any serums." },
  { id: "serum", label: "Serum", tip: "Pea-size. Wait ~30 seconds before next layer." },
  { id: "prescription", label: "Prescription", tip: "Tret / azelaic / etc. PM only unless dermatologist says otherwise." },
  { id: "eye cream", label: "Eye cream", tip: "Ring finger, gentle dab." },
  { id: "moisturizer", label: "Moisturizer", tip: "Seals everything underneath." },
  { id: "lip balm", label: "Lip balm", tip: "Always SPF in the morning version." },
  { id: "sunscreen", label: "Sunscreen", tip: "AM only. Two finger-lengths for face + neck." },
  { id: "tool", label: "Tool", tip: "Dermaplaning blades, IPL, gua sha. Weekly cadence." },
];

const CATEGORY_META = new Map(SKINCARE_ORDER.map((c, i) => [c.id, { ...c, index: i }]));

const GOAL_OPTIONS = [
  { id: "anti-aging", label: "Anti-aging" },
  { id: "acne", label: "Acne control" },
  { id: "barrier", label: "Barrier repair" },
  { id: "brightening", label: "Brightening" },
  { id: "hydration", label: "Hydration" },
  { id: "sun", label: "UV protection" },
] as const;
type Goal = (typeof GOAL_OPTIONS)[number]["id"];

const TIME_OPTIONS = [
  { id: "morning", label: "AM" },
  { id: "evening", label: "PM" },
] as const;
type Time = (typeof TIME_OPTIONS)[number]["id"];

const CONFLICT_RULES: { a: string; b: string; reason: string; severity: "warn" | "block" }[] = [
  {
    a: "retinol",
    b: "ascorbic acid",
    reason: "Retinol + L-ascorbic acid in the same routine destabilize each other and double the irritation. Split AM/PM.",
    severity: "warn",
  },
  {
    a: "retinol",
    b: "glycolic acid",
    reason: "Retinoid + AHA in the same routine compounds the barrier hit. Alternate nights instead.",
    severity: "block",
  },
  {
    a: "retinol",
    b: "salicylic acid",
    reason: "Retinoid + BHA in the same routine is too much exfoliation in one go. Alternate nights.",
    severity: "warn",
  },
  {
    a: "tretinoin",
    b: "glycolic acid",
    reason: "Tret + AHA at the same time is the classic over-exfoliation mistake.",
    severity: "block",
  },
  {
    a: "ascorbic acid",
    b: "niacinamide",
    reason: "Old myth: pure L-ascorbic + niacinamide together can flush. Modern formulas mostly handle it, but if you flush, split them.",
    severity: "warn",
  },
  {
    a: "benzoyl peroxide",
    b: "tretinoin",
    reason: "BPO oxidizes tretinoin. If you have to use both, do BPO AM and tret PM.",
    severity: "block",
  },
];

function lower(s: string) {
  return s.toLowerCase().trim();
}

function ingredientsHit(haystack: string[], needle: string): boolean {
  const n = lower(needle);
  return haystack.some((i) => lower(i).includes(n));
}

function detectConflicts(entries: RoutineEntry[]) {
  const flags: { entryIds: [string, string]; reason: string; severity: "warn" | "block" }[] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      for (const rule of CONFLICT_RULES) {
        const aHitI = ingredientsHit(entries[i].ingredients, rule.a);
        const bHitI = ingredientsHit(entries[i].ingredients, rule.b);
        const aHitJ = ingredientsHit(entries[j].ingredients, rule.a);
        const bHitJ = ingredientsHit(entries[j].ingredients, rule.b);
        if ((aHitI && bHitJ) || (aHitJ && bHitI)) {
          flags.push({
            entryIds: [entries[i].id, entries[j].id],
            reason: rule.reason,
            severity: rule.severity,
          });
        }
      }
    }
  }
  return flags;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── URL serialization ───────────────────────────────────────────────
//
// Routine state encoded into ?r= as a base64url JSON. Keeps the URL
// short enough to share over chat without breaking on most clients.

type SerializedState = {
  e: { i: string; s: "c" | "x"; c: string; n: string; b?: string; g: string[]; h?: string }[];
  g: Goal[];
  t: Time;
};

function encodeState(state: {
  entries: RoutineEntry[];
  goals: Goal[];
  time: Time;
}): string {
  const s: SerializedState = {
    e: state.entries.map((e) => ({
      i: e.id,
      s: e.source === "catalog" ? "c" : "x",
      c: e.category,
      n: e.name,
      b: e.brand,
      g: e.ingredients,
      h: e.href,
    })),
    g: state.goals,
    t: state.time,
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(s))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeState(raw: string | null): {
  entries: RoutineEntry[];
  goals: Goal[];
  time: Time;
} | null {
  if (!raw) return null;
  try {
    const padded = raw + "==".slice(0, (4 - (raw.length % 4)) % 4);
    const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(b64)));
    const s = JSON.parse(json) as SerializedState;
    return {
      entries: s.e.map((x) => ({
        id: x.i,
        source: x.s === "c" ? "catalog" : "custom",
        category: x.c,
        name: x.n,
        brand: x.b,
        ingredients: x.g ?? [],
        // Share-link payload comes from an attacker-controllable ?s= param;
        // only same-origin relative hrefs are allowed back into a <Link>.
        href: safeInternalHref(x.h),
      })),
      goals: s.g ?? [],
      time: s.t ?? "morning",
    };
  } catch {
    return null;
  }
}

// ── Component ───────────────────────────────────────────────────────

// The share payload lives in the query string, which only exists in the
// browser. useSyncExternalStore hands back the server snapshot during
// hydration and the real one immediately after, so the hydrated HTML
// still matches the prerender and the seeding below happens on the very
// next render. `undefined` means "the client URL has not been read yet";
// `null` means "read it, there is nothing to restore".
let lastRoutineSearch: string | null = null;
let lastRoutineState: ReturnType<typeof decodeState> = null;

function routineStateFromUrl(): ReturnType<typeof decodeState> {
  const search = window.location.search;
  if (search !== lastRoutineSearch) {
    lastRoutineSearch = search;
    lastRoutineState = decodeState(new URLSearchParams(search).get("r"));
  }
  return lastRoutineState;
}

function useRoutineStateFromUrl() {
  return useClientValue<ReturnType<typeof decodeState> | undefined>(
    routineStateFromUrl,
    undefined,
  );
}

export function RoutineBuilder({ catalog }: { catalog: CatalogItem[] }) {
  const [entries, setEntries] = useState<RoutineEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>(["hydration"]);
  const [time, setTime] = useState<Time>("morning");
  const [shareToast, setShareToast] = useState(false);

  // Seeded during render, not from an effect, so the URL-writeback effect
  // below cannot fire with an empty routine and blank the share link.
  const fromUrl = useRoutineStateFromUrl();
  const [hydrated, setHydrated] = useState(false);
  if (!hydrated && fromUrl !== undefined) {
    setHydrated(true);
    if (fromUrl) {
      setEntries(fromUrl.entries);
      setGoals(fromUrl.goals);
      setTime(fromUrl.time);
    }
  }

  // Persist to URL whenever state changes (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    const next = entries.length === 0
      ? "/build?tool=routine"
      : `/build?tool=routine&r=${encodeState({ entries, goals, time })}`;
    window.history.replaceState(null, "", next);
  }, [entries, goals, time, hydrated]);

  const conflicts = useMemo(() => detectConflicts(entries), [entries]);

  const ordered = useMemo(() => {
    return [...entries].sort((a, b) => {
      const ai = CATEGORY_META.get(a.category)?.index ?? 999;
      const bi = CATEGORY_META.get(b.category)?.index ?? 999;
      return ai - bi;
    });
  }, [entries]);

  function addEntry(e: Omit<RoutineEntry, "id">) {
    setEntries((prev) => [...prev, { ...e, id: makeId() }]);
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function clearAll() {
    setEntries([]);
  }

  async function copyShareLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2200);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_360px]">
      <div className="space-y-10">
        <Inputs
          goals={goals}
          setGoals={setGoals}
          time={time}
          setTime={setTime}
        />

        <AddProduct catalog={catalog} onAdd={addEntry} alreadyAdded={entries} />

        <Routine
          entries={ordered}
          conflicts={conflicts}
          time={time}
          onRemove={removeEntry}
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
              Clear routine
            </button>
            <span className="ml-auto text-xs italic text-stone-400 dark:text-stone-500">
              Auto-saved to the URL.
            </span>
          </div>
        )}
      </div>

      <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <SidebarGuide goals={goals} time={time} />
      </aside>
    </div>
  );
}

// ── UI primitives ──────────────────────────────────────────────────

function chipClass(on: boolean): string {
  return (
    "rounded-full border px-4 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 " +
    (on
      ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
      : "border-stone-200 bg-white text-stone-600 hover:border-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:border-stone-600")
  );
}

function Inputs({
  goals,
  setGoals,
  time,
  setTime,
}: {
  goals: Goal[];
  setGoals: (g: Goal[]) => void;
  time: Time;
  setTime: (t: Time) => void;
}) {
  return (
    <fieldset className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
      <legend className="px-2 text-[10px] uppercase tracking-[0.22em] text-stone-400 dark:text-stone-500">
        Step 1 · The frame
      </legend>
      <div className="mt-2 space-y-6">
        <div>
          <p className="mb-3 font-serif text-sm italic text-stone-600 dark:text-stone-400">
            Goals (pick any number)
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
                    setGoals(
                      on ? goals.filter((x) => x !== g.id) : [...goals, g.id],
                    )
                  }
                  className={chipClass(on)}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="mb-3 font-serif text-sm italic text-stone-600 dark:text-stone-400">
            Time of day
          </p>
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={time === t.id}
                onClick={() => setTime(t.id)}
                className={chipClass(time === t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </fieldset>
  );
}

function AddProduct({
  catalog,
  onAdd,
  alreadyAdded,
}: {
  catalog: CatalogItem[];
  onAdd: (e: Omit<RoutineEntry, "id">) => void;
  alreadyAdded: RoutineEntry[];
}) {
  const [query, setQuery] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [customCategory, setCustomCategory] = useState(SKINCARE_ORDER[0].id);
  const [customIngredients, setCustomIngredients] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const skincareCatalog = useMemo(
    () => catalog.filter((c) => c.kind === "skincare"),
    [catalog],
  );

  const matches = useMemo(() => {
    const q = lower(query);
    if (q.length < 2) return [] as CatalogItem[];
    const addedKeys = new Set(
      alreadyAdded
        .filter((e) => e.source === "catalog")
        .map((e) => e.href),
    );
    return skincareCatalog
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
  }, [query, skincareCatalog, alreadyAdded]);

  function commitCatalog(c: CatalogItem) {
    onAdd({
      source: "catalog",
      category: lower(c.category),
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
      category: customCategory,
      name: customName.trim(),
      brand: customBrand.trim() || undefined,
      ingredients: customIngredients
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setCustomName("");
    setCustomBrand("");
    setCustomIngredients("");
    setCustomCategory(SKINCARE_ORDER[0].id);
    setShowCustom(false);
  }

  return (
    <fieldset className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
      <legend className="px-2 text-[10px] uppercase tracking-[0.22em] text-stone-400 dark:text-stone-500">
        Step 2 · Add products
      </legend>

      <label className="mt-2 block">
        <span className="sr-only">Search the catalog</span>
        <span className="relative block">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500"
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search the catalog (e.g. niacinamide, La Roche, sunscreen)"
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
          Add a product not in the catalog →
        </button>
      ) : (
        <form
          onSubmit={commitCustom}
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr]"
        >
          <input
            type="text"
            required
            placeholder="Product name *"
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
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm focus:border-stone-400 focus:outline-none dark:border-stone-800 dark:bg-stone-900"
          >
            {SKINCARE_ORDER.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Actives, comma-separated (e.g. retinol, niacinamide)"
            value={customIngredients}
            onChange={(e) => setCustomIngredients(e.target.value)}
            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm focus:border-stone-400 focus:outline-none dark:border-stone-800 dark:bg-stone-900"
          />
          <div className="col-span-full flex items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-stone-900 px-5 py-2 text-sm text-white transition-colors hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
            >
              Add to routine
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

function Routine({
  entries,
  conflicts,
  time,
  onRemove,
}: {
  entries: RoutineEntry[];
  conflicts: { entryIds: [string, string]; reason: string; severity: "warn" | "block" }[];
  time: Time;
  onRemove: (id: string) => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-12 text-center dark:border-stone-700 dark:bg-stone-900">
        <p className="font-serif text-xl italic text-stone-500 dark:text-stone-400">
          begin where you are.
        </p>
      </div>
    );
  }

  // Filter sunscreen out of PM, exfoliants get a soft warning at AM.
  const filtered = entries.filter((e) => {
    if (time === "evening" && e.category === "sunscreen") return false;
    return true;
  });

  return (
    <div>
      {conflicts.length > 0 && (
        <div className="mb-6 space-y-2">
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
              <span aria-hidden className="font-serif text-base">
                {c.severity === "block" ? "❋" : "❋"}
              </span>
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

      <ol className="space-y-4">
        {filtered.map((e, i) => {
          const meta = CATEGORY_META.get(e.category);
          return (
            <li
              key={e.id}
              className="flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
            >
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white font-mono text-xs tabular-nums text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500">
                    {meta?.label ?? e.category}
                  </p>
                  {e.source === "custom" && (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                      Yours
                    </span>
                  )}
                </div>
                <h3 className="mt-1 font-serif text-lg text-stone-900 dark:text-stone-100">
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
                </h3>
                {e.brand && (
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    {e.brand}
                  </p>
                )}
                {meta?.tip && (
                  <p className="mt-2 font-serif text-sm italic text-stone-500 dark:text-stone-400">
                    {meta.tip}
                  </p>
                )}
                {e.ingredients.length > 0 && (
                  <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
                    {e.ingredients.slice(0, 4).join(" · ")}
                    {e.ingredients.length > 4 && " · …"}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label={`Remove ${e.name} from routine`}
                onClick={() => onRemove(e.id)}
                className="shrink-0 rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-rose-700 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-rose-400"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ol>

      {time === "evening" &&
        entries.some((e) => e.category === "sunscreen") && (
          <p className="mt-4 text-xs italic text-stone-400 dark:text-stone-500">
            Sunscreen hidden from the PM routine. Toggle to AM to see it.
          </p>
        )}
    </div>
  );
}

function SidebarGuide({ goals, time }: { goals: Goal[]; time: Time }) {
  const tips: string[] = [];
  if (time === "morning") tips.push("Sunscreen is the only step that can never be skipped.");
  if (time === "evening")
    tips.push("Double-cleanse only if you wore SPF or makeup; otherwise one pass is plenty.");
  if (goals.includes("anti-aging"))
    tips.push("Retinoids belong in PM. Pair with a barrier moisturizer for the first 8 weeks.");
  if (goals.includes("acne"))
    tips.push("BHA at night, BPO morning if your derm prescribed it, never both with retinol.");
  if (goals.includes("barrier"))
    tips.push("Cut all exfoliants for 2 weeks. Ceramide-cholesterol-fatty-acid 1:1:1 moisturizer rebuilds fastest.");
  if (goals.includes("brightening"))
    tips.push("Vitamin C in AM, niacinamide PM, both at 10% or under for the first month.");
  if (goals.includes("hydration"))
    tips.push("Hydrators (hyaluronic, glycerin) need an occlusive on top to actually hold the water.");

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
      <p className="text-[10px] uppercase tracking-[0.22em] text-stone-400 dark:text-stone-500">
        ❋ Cheat sheet
      </p>
      <ul className="mt-4 space-y-3 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
        {tips.map((t, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="mt-0.5 text-rose-400">
              ❋
            </span>
            <span>{t}</span>
          </li>
        ))}
        <li className="flex gap-2">
          <span aria-hidden className="mt-0.5 text-rose-400">
            ❋
          </span>
          <span>
            Wait ~30 seconds between layers. Patting in beats rubbing in for
            absorption.
          </span>
        </li>
      </ul>
    </div>
  );
}
