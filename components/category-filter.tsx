"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useClientValue } from "@/lib/use-client-value";
import { Check, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "./product-card";
import { cn } from "@/lib/utils";
import { costPerDay, parsePrice } from "@/lib/cost";
import { defaultPrice, priceFor } from "@/lib/price";
import { availableInRegion, type Region } from "@/lib/retailers";
import type { ReviewSummary } from "@/lib/types";

type RegionFilter = "all" | Region;
type SortKey = "recent" | "verdict" | "price" | "cost-per-day";

const verdictRank: Record<string, number> = {
  recommend: 0,
  okay: 1,
  bad: 2,
};

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "recent", label: "Recent" },
  { id: "verdict", label: "Verdict" },
  { id: "price", label: "Price" },
  { id: "cost-per-day", label: "Cost / day" },
];

const URL_KEY = {
  category: "c",
  sort: "sort",
  region: "region",
  brand: "brand",
  ingredient: "ing",
} as const;

const VALID_SORTS = new Set<SortKey>([
  "recent",
  "verdict",
  "price",
  "cost-per-day",
]);
const VALID_REGIONS = new Set<RegionFilter>(["all", "india", "usa", "uk"]);

type InitialFilters = {
  category: string | null;
  sort: SortKey | null;
  region: RegionFilter | null;
  brand: string | null;
  ingredient: string | null;
};

// The URL, localStorage and the reader's time zone are all browser-only,
// so they are read through useSyncExternalStore rather than written into
// state by a mount effect. The result is cached against the query string
// because the snapshot is compared by identity on every render.
let lastFilterSearch: string | null = null;
let lastFilterInit: InitialFilters | null = null;

function readInitialFilters(): InitialFilters {
  const search = window.location.search;
  if (search === lastFilterSearch && lastFilterInit) return lastFilterInit;
  const sp = new URLSearchParams(search);
  const s = sp.get(URL_KEY.sort);
  const r = sp.get(URL_KEY.region);

  let region: RegionFilter | null = null;
  if (r && VALID_REGIONS.has(r as RegionFilter)) {
    region = r as RegionFilter;
  } else {
    // No URL preference: try a saved preference, then fall back
    // to a one-time timezone inference. The point is so an Indian
    // visitor lands on the rupee price instantly instead of the
    // dollar one; we don't want to be sticky beyond the first visit,
    // so the saved preference wins on the second.
    try {
      const stored = localStorage.getItem("yashgoel-region-v1");
      if (stored && VALID_REGIONS.has(stored as RegionFilter)) {
        region = stored as RegionFilter;
      }
    } catch {
      // ignore
    }
    if (!region) {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        // Conservative mapping, only obvious country-level matches.
        // Mismatches are cheap (the reader can pick from the chips
        // and that pick is then persisted), missed matches just
        // leave the default "all" alone.
        if (/^Asia\/(Kolkata|Calcutta|Colombo)$/.test(tz)) region = "india";
        else if (/^Europe\/(London|Belfast|Isle_of_Man|Edinburgh|Cardiff|Dublin)$/.test(tz)) region = "uk";
        else if (/^America\/(New_York|Detroit|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Indianapolis|Indiana\/.+|Kentucky\/.+|North_Dakota\/.+|Boise|Juneau|Adak|Sitka|Yakutat|Nome|Metlakatla|Menominee|Honolulu)$/.test(tz)) region = "usa";
      } catch {
        // ignore
      }
    }
  }

  lastFilterSearch = search;
  lastFilterInit = {
    category: sp.get(URL_KEY.category),
    sort: s && VALID_SORTS.has(s as SortKey) ? (s as SortKey) : null,
    region,
    brand: sp.get(URL_KEY.brand),
    ingredient: sp.get(URL_KEY.ingredient),
  };
  return lastFilterInit;
}

function useInitialFilters() {
  return useClientValue<InitialFilters | undefined>(
    readInitialFilters,
    undefined,
  );
}

export function CategoryFilter({ reviews }: { reviews: ReviewSummary[] }) {
  const [active, setActive] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [region, setRegion] = useState<RegionFilter>("all");
  const [ingredient, setIngredient] = useState<string>("all");
  const [brand, setBrand] = useState<string>("all");
  const [sheetOpen, setSheetOpen] = useState(false);

  // Applied during render, so the two persistence effects below never
  // observe the pre-hydration defaults with `hydrated` already true and
  // write "all" over the reader's saved region.
  const initial = useInitialFilters();
  const [hydrated, setHydrated] = useState(false);
  if (!hydrated && initial !== undefined) {
    setHydrated(true);
    if (initial.category) setActive(initial.category);
    if (initial.sort) setSort(initial.sort);
    if (initial.region) setRegion(initial.region);
    if (initial.brand) setBrand(initial.brand);
    if (initial.ingredient) setIngredient(initial.ingredient);
  }

  // Persist the visitor's region pick once they've made one. Stored
  // separately from the URL so the preference survives across pages
  // even when the URL itself doesn't carry a region param.
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (region === "all") localStorage.removeItem("yashgoel-region-v1");
      else localStorage.setItem("yashgoel-region-v1", region);
    } catch {
      // ignore
    }
  }, [region, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const sp = new URLSearchParams();
    if (active !== "all") sp.set(URL_KEY.category, active);
    if (sort !== "recent") sp.set(URL_KEY.sort, sort);
    if (region !== "all") sp.set(URL_KEY.region, region);
    if (brand !== "all") sp.set(URL_KEY.brand, brand);
    if (ingredient !== "all") sp.set(URL_KEY.ingredient, ingredient);
    const qs = sp.toString();
    const next = qs
      ? `${window.location.pathname}?${qs}${window.location.hash}`
      : `${window.location.pathname}${window.location.hash}`;
    if (
      next !==
      window.location.pathname + window.location.search + window.location.hash
    ) {
      window.history.replaceState(null, "", next);
    }
  }, [active, sort, region, brand, ingredient, hydrated]);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSheetOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  const categories = useMemo(() => {
    const set = new Set(reviews.map((r) => r.category));
    return ["all", ...Array.from(set).sort()];
  }, [reviews]);

  const ingredients = useMemo(() => {
    const set = new Set<string>();
    for (const r of reviews) for (const i of r.ingredients ?? []) set.add(i);
    return ["all", ...Array.from(set).sort()];
  }, [reviews]);

  const brands = useMemo(() => {
    const set = new Set(reviews.map((r) => r.brand));
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [reviews]);

  const counts = useMemo(
    () => ({
      india: reviews.filter((r) => availableInRegion(r, "india")).length,
      usa: reviews.filter((r) => availableInRegion(r, "usa")).length,
      uk: reviews.filter((r) => availableInRegion(r, "uk")).length,
    }),
    [reviews],
  );

  const filtered = useMemo(() => {
    let base =
      active === "all" ? reviews : reviews.filter((r) => r.category === active);
    if (region !== "all") {
      base = base.filter((r) => availableInRegion(r, region));
    }
    if (ingredient !== "all") {
      base = base.filter((r) => (r.ingredients ?? []).includes(ingredient));
    }
    if (brand !== "all") {
      base = base.filter((r) => r.brand === brand);
    }
    if (sort === "verdict") {
      return [...base].sort(
        (a, b) =>
          (verdictRank[a.verdict ?? "z"] ?? 3) -
          (verdictRank[b.verdict ?? "z"] ?? 3),
      );
    }
    if (sort === "price") {
      return [...base].sort((a, b) => {
        const priceStr = (r: ReviewSummary) =>
          region === "all" ? defaultPrice(r.price) : priceFor(r.price, region);
        const pa = parsePrice(priceStr(a));
        const pb = parsePrice(priceStr(b));
        if (pa === null && pb === null) return 0;
        if (pa === null) return 1;
        if (pb === null) return -1;
        return pa - pb;
      });
    }
    if (sort === "cost-per-day") {
      return [...base].sort((a, b) => {
        const ctx = region === "all" ? undefined : region;
        const ca = costPerDay(a, ctx);
        const cb = costPerDay(b, ctx);
        if (ca === null && cb === null) return 0;
        if (ca === null) return 1;
        if (cb === null) return -1;
        return ca - cb;
      });
    }
    return base;
  }, [reviews, active, sort, region, ingredient, brand]);

  const activeFilterCount =
    (sort !== "recent" ? 1 : 0) +
    (region !== "all" ? 1 : 0) +
    (brand !== "all" ? 1 : 0) +
    (ingredient !== "all" ? 1 : 0);

  function resetAll() {
    setActive("all");
    setSort("recent");
    setRegion("all");
    setBrand("all");
    setIngredient("all");
  }

  const showBrandFilter = brands.length > 2;
  const showIngredientFilter = ingredients.length > 2;

  return (
    <div className="space-y-5">
      {/* Row 1: category pills.
          Mobile (< sm): one-line, horizontal scroll with snap, no
          scrollbar. Items keep their natural width.
          sm+: existing wrap behaviour. */}
      <div
        data-tour-listing="categories"
        className={cn(
          "flex gap-2",
          // Mobile horizontal-scroll
          "-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "snap-x snap-mandatory",
          // sm+ wrap
          "sm:mx-0 sm:flex-wrap sm:overflow-x-visible sm:px-0 sm:snap-none",
        )}
      >
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={cn(
              "shrink-0 snap-start whitespace-nowrap rounded-full border px-3 py-1 text-sm capitalize transition-colors",
              active === c
                ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-100",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Row 2 desktop: secondary-filter toolbar inline.
          Hidden below sm; mobile uses the bottom-sheet trigger instead. */}
      <div className="hidden flex-wrap items-center gap-x-5 gap-y-3 border-y border-stone-200 py-3 text-sm sm:flex dark:border-stone-800">
        <SortControls sort={sort} setSort={setSort} />
        <span aria-hidden className="hidden h-4 w-px bg-stone-200 dark:bg-stone-800 sm:inline" />
        <RegionControls
          region={region}
          setRegion={setRegion}
          counts={counts}
          totalCount={reviews.length}
        />
        {showBrandFilter && (
          <>
            <span aria-hidden className="hidden h-4 w-px bg-stone-200 dark:bg-stone-800 sm:inline" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
                Brand
              </span>
              <IngredientPicker
                options={brands}
                value={brand}
                onChange={setBrand}
                placeholder="Any"
              />
            </div>
          </>
        )}
        {showIngredientFilter && (
          <>
            <span aria-hidden className="hidden h-4 w-px bg-stone-200 dark:bg-stone-800 sm:inline" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
                Ingredient
              </span>
              <IngredientPicker
                options={ingredients}
                value={ingredient}
                onChange={setIngredient}
              />
            </div>
          </>
        )}

        {activeFilterCount > 0 && (
          <button
            onClick={resetAll}
            className="ml-auto inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-stone-500 transition-colors hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400"
          >
            Reset
            <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] tabular-nums text-stone-700 dark:bg-stone-800 dark:text-stone-200">
              {activeFilterCount}
            </span>
          </button>
        )}
      </div>

      {/* Row 2 mobile: single Filters trigger + count badge. */}
      <div className="flex items-center justify-between border-y border-stone-200 py-3 sm:hidden dark:border-stone-800">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-stone-700 transition-colors hover:border-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-stone-600"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-stone-900 px-1.5 py-0.5 text-[10px] tabular-nums text-white dark:bg-stone-100 dark:text-stone-900">
              {activeFilterCount}
            </span>
          )}
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
          {filtered.length} of {reviews.length}
        </span>
      </div>

      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {filtered.length === 0
          ? "No products match the current filters."
          : `${filtered.length} ${filtered.length === 1 ? "product" : "products"} shown.`}
      </p>

      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-display text-7xl font-light leading-none tracking-tight text-stone-200 dark:text-stone-800">
            00
          </p>
          <p className="mt-4 font-serif text-lg italic text-stone-500 dark:text-stone-400">
            Nothing here under that lens. Widen the filter a little.
          </p>
          <button
            type="button"
            onClick={resetAll}
            className="mt-5 inline-flex items-center gap-1 rounded-full border border-stone-200 px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-stone-600 transition-colors hover:border-stone-900 hover:text-stone-900 dark:border-stone-800 dark:text-stone-300 dark:hover:border-stone-400 dark:hover:text-stone-100"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <ListingGrid
          filtered={filtered}
          priceRegion={region === "all" ? undefined : region}
        />
      )}

      {/* Mobile filter sheet. Slide-up bottom drawer with scroll, dim
          backdrop, sticky footer with reset + apply. */}
      {sheetOpen && (
        <FilterSheet
          onClose={() => setSheetOpen(false)}
          activeCount={activeFilterCount}
          resetAll={resetAll}
          sort={sort}
          setSort={setSort}
          region={region}
          setRegion={setRegion}
          counts={counts}
          totalCount={reviews.length}
          brands={brands}
          brand={brand}
          setBrand={setBrand}
          showBrandFilter={showBrandFilter}
          ingredients={ingredients}
          ingredient={ingredient}
          setIngredient={setIngredient}
          showIngredientFilter={showIngredientFilter}
          resultCount={filtered.length}
        />
      )}
    </div>
  );
}

// ── Listing grid with j/k keyboard nav ─────────────────────────────

function ListingGrid({
  filtered,
  priceRegion,
}: {
  filtered: ReviewSummary[];
  priceRegion?: Region;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  // One-time hint chip. Stored under a v1 key so we can reset later
  // by bumping the suffix. Whether it has been seen before is read from
  // storage; dismissing it this session is separate state on top.
  const hintUnseen = useClientValue(() => {
    try {
      return !localStorage.getItem("yashgoel-jk-hint-v1");
    } catch {
      // private mode etc.
      return false;
    }
  }, false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const showHint = hintUnseen && !hintDismissed;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key !== "j" && e.key !== "k") return;
      const grid = gridRef.current;
      if (!grid) return;
      const cards = Array.from(
        grid.querySelectorAll<HTMLAnchorElement>("a[data-tour-listing='card']"),
      );
      if (cards.length === 0) return;
      const focused = document.activeElement as HTMLElement | null;
      const idx = cards.findIndex((c) => c === focused);
      let next = idx;
      if (e.key === "j") next = idx < 0 ? 0 : Math.min(cards.length - 1, idx + 1);
      else next = idx <= 0 ? 0 : idx - 1;
      e.preventDefault();
      cards[next]?.focus();
      cards[next]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      // First key press also dismisses the hint.
      if (showHint) {
        setHintDismissed(true);
        try {
          localStorage.setItem("yashgoel-jk-hint-v1", "1");
        } catch {
          // ignore
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showHint]);

  return (
    <div ref={gridRef} className="relative">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r, i) => (
          <div
            key={`${r.kind}-${r.slug}`}
            className="card-stagger-in h-full"
            style={
              {
                "--stagger": `${Math.min(i * 28, 360)}ms`,
              } as React.CSSProperties
            }
          >
            <ProductCard review={r} priceRegion={priceRegion} />
          </div>
        ))}
      </div>
      {showHint && (
        <div
          aria-hidden
          className="pointer-events-none fixed bottom-4 right-4 z-30 hidden items-center gap-2 rounded-full border border-stone-200 bg-white/90 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-stone-500 shadow-sm backdrop-blur sm:flex dark:border-stone-800 dark:bg-stone-900/90 dark:text-stone-400"
        >
          <kbd className="rounded border border-stone-300 bg-stone-50 px-1.5 py-0.5 font-mono text-[10px] dark:border-stone-700 dark:bg-stone-800">
            j
          </kbd>
          <kbd className="rounded border border-stone-300 bg-stone-50 px-1.5 py-0.5 font-mono text-[10px] dark:border-stone-700 dark:bg-stone-800">
            k
          </kbd>
          <span className="normal-case tracking-normal italic">to flip cards</span>
        </div>
      )}
    </div>
  );
}

// ── Sub-components shared between desktop bar and mobile sheet ─────

function SortControls({
  sort,
  setSort,
  vertical = false,
}: {
  sort: SortKey;
  setSort: (s: SortKey) => void;
  vertical?: boolean;
}) {
  return (
    <div
      data-tour-listing="sort"
      className={cn(
        "flex gap-1 text-stone-500 dark:text-stone-400",
        vertical ? "flex-wrap items-center" : "flex-wrap items-center",
      )}
    >
      <span className="mr-1 text-xs uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
        Sort
      </span>
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          onClick={() => setSort(opt.id)}
          className={cn(
            "rounded-full px-2.5 py-0.5 transition-colors",
            sort === opt.id
              ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100"
              : "hover:text-stone-900 dark:hover:text-stone-100",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function RegionControls({
  region,
  setRegion,
  counts,
  totalCount,
}: {
  region: RegionFilter;
  setRegion: (r: RegionFilter) => void;
  counts: { india: number; usa: number; uk: number };
  totalCount: number;
}) {
  return (
    <div
      data-tour-listing="region"
      className="flex flex-wrap items-center gap-1.5"
    >
      <span className="mr-1 text-xs uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
        Region
      </span>
      {(
        [
          { id: "all", label: "All", count: totalCount },
          { id: "india", label: "India", count: counts.india },
          { id: "usa", label: "USA", count: counts.usa },
          { id: "uk", label: "UK", count: counts.uk },
        ] as const
      ).map((r) => (
        <button
          key={r.id}
          onClick={() => setRegion(r.id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 transition-colors",
            region === r.id
              ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
              : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-100",
          )}
        >
          {r.label}
          <span
            className={cn(
              "text-[10px] tabular-nums",
              region === r.id
                ? "text-stone-300 dark:text-stone-500"
                : "text-stone-400 dark:text-stone-500",
            )}
          >
            {r.count}
          </span>
        </button>
      ))}
    </div>
  );
}

function FilterSheet(props: {
  onClose: () => void;
  activeCount: number;
  resetAll: () => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  region: RegionFilter;
  setRegion: (r: RegionFilter) => void;
  counts: { india: number; usa: number; uk: number };
  totalCount: number;
  brands: string[];
  brand: string;
  setBrand: (b: string) => void;
  showBrandFilter: boolean;
  ingredients: string[];
  ingredient: string;
  setIngredient: (i: string) => void;
  showIngredientFilter: boolean;
  resultCount: number;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Filters"
      className="fixed inset-0 z-50 sm:hidden"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close filters"
        onClick={props.onClose}
        className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm animate-[fade-in_120ms_ease-out]"
      />
      {/* Sheet */}
      <div
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-hidden rounded-t-2xl border-t border-stone-200 bg-white shadow-2xl animate-[sheet-up_220ms_cubic-bezier(0.22,1,0.36,1)] dark:border-stone-800 dark:bg-stone-950"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
            Filters
            {props.activeCount > 0 && (
              <span className="ml-2 rounded-full bg-stone-900 px-1.5 py-0.5 text-[9px] text-white dark:bg-stone-100 dark:text-stone-900">
                {props.activeCount}
              </span>
            )}
          </p>
          <button
            type="button"
            aria-label="Close filters"
            onClick={props.onClose}
            className="-mr-1 flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="space-y-7 overflow-y-auto px-4 py-5"
          style={{ maxHeight: "calc(85dvh - 7.5rem)" }}
        >
          <SortControls sort={props.sort} setSort={props.setSort} vertical />
          <RegionControls
            region={props.region}
            setRegion={props.setRegion}
            counts={props.counts}
            totalCount={props.totalCount}
          />
          {props.showBrandFilter && (
            <div className="flex items-center gap-1.5">
              <span className="mr-1 text-xs uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
                Brand
              </span>
              <IngredientPicker
                options={props.brands}
                value={props.brand}
                onChange={props.setBrand}
                placeholder="Any"
              />
            </div>
          )}
          {props.showIngredientFilter && (
            <div className="flex items-center gap-1.5">
              <span className="mr-1 text-xs uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
                Ingredient
              </span>
              <IngredientPicker
                options={props.ingredients}
                value={props.ingredient}
                onChange={props.setIngredient}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-900">
          <button
            type="button"
            onClick={props.resetAll}
            disabled={props.activeCount === 0}
            className="text-xs uppercase tracking-[0.18em] text-stone-500 transition-colors hover:text-rose-600 disabled:opacity-40 dark:text-stone-400 dark:hover:text-rose-400"
          >
            Reset all
          </button>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full bg-stone-900 px-5 py-2 text-sm text-white transition-colors hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
          >
            Show {props.resultCount} {props.resultCount === 1 ? "product" : "products"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Editorial pill dropdown for ingredient/brand filtering.
 * Replaces the native <select>. Closes on outside-click and Escape.
 */
function IngredientPicker({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = value === "all" ? (placeholder ?? "Any") : value;

  return (
    <div className="relative inline-block" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
          value === "all"
            ? "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-stone-600 dark:hover:text-stone-100"
            : "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900",
        )}
      >
        <span>{label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            open ? "rotate-180" : "",
          )}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-30 mt-2 max-h-64 w-56 overflow-y-auto rounded-2xl border border-stone-200 bg-white py-2 shadow-lg dark:border-stone-800 dark:bg-stone-900"
        >
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <li key={opt}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition-colors",
                    selected
                      ? "text-rose-700 dark:text-rose-400"
                      : "text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800",
                  )}
                >
                  <span>{opt === "all" ? (placeholder ?? "Any") : opt}</span>
                  {selected && <Check className="h-3.5 w-3.5" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
