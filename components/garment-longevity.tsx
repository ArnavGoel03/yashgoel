import {
  agingElapsedLabel,
  costPerWear,
  estimatedWears,
  monthsOwned,
  ownedLabel,
} from "@/lib/garment";
import { REGION_TAG } from "@/lib/price";
import {
  GARMENT_CONDITIONS,
  GARMENT_CONDITION_LABEL,
} from "@/lib/garment-types";
import type { RegionalPrice } from "@/lib/types";
import type { Garment } from "@/lib/garment-types";

/**
 * How the piece is holding up. Longevity is the whole point of writing
 * about clothes a month or more after buying them, so it gets real
 * estate and real numbers instead of an adjective in the prose.
 *
 * Every figure here is derived at build time from `firstWorn`,
 * `wearsPerMonth` and `price`. Anything the author has not stated
 * simply does not render.
 */

const statLabel =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500";
const statValue =
  "mt-1 font-display text-2xl font-light leading-none tabular-nums text-stone-900 dark:text-stone-100";

/** Five-stage wear track. Position, never a score. */
function ConditionMeter({ condition }: { condition: Garment["condition"] }) {
  const activeIndex = GARMENT_CONDITIONS.indexOf(condition);
  return (
    <div>
      <p className={statLabel}>Condition</p>
      <ol className="mt-3 flex items-stretch gap-1">
        {GARMENT_CONDITIONS.map((stage, i) => {
          const reached = i <= activeIndex;
          const current = i === activeIndex;
          return (
            <li key={stage} className="flex-1">
              <div
                className={
                  "h-1.5 rounded-full " +
                  (current
                    ? "bg-rose-400"
                    : reached
                      ? "bg-stone-400 dark:bg-stone-500"
                      : "bg-stone-200 dark:bg-stone-800")
                }
              />
              <p
                className={
                  "mt-2 text-center font-mono text-[9px] uppercase leading-tight tracking-wider " +
                  (current
                    ? "text-stone-900 dark:text-stone-100"
                    : "text-stone-400 dark:text-stone-600")
                }
              >
                {GARMENT_CONDITION_LABEL[stage]}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function GarmentLongevity({
  garment,
  price,
}: {
  garment: Garment;
  price?: string | RegionalPrice;
}) {
  const months = monthsOwned(garment.firstWorn);
  const wears = estimatedWears(garment);
  const perWear = costPerWear(price, garment);

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900 sm:p-8">
      <h2 className="mb-6 font-serif text-xl text-stone-900 dark:text-stone-100">
        How it is holding up<span className="text-rose-400">.</span>
      </h2>

      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <p className={statLabel}>Owned</p>
          <p className={statValue}>{ownedLabel(months)}</p>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">
            First worn {garment.firstWorn}
          </p>
        </div>
        <div>
          <p className={statLabel}>Wears, estimated</p>
          <p className={statValue}>{wears ?? "Not counted"}</p>
          {typeof garment.wearsPerMonth === "number" && (
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">
              About {garment.wearsPerMonth} a month
            </p>
          )}
        </div>
        <div>
          <p className={statLabel}>Cost per wear</p>
          {perWear.length > 0 ? (
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {perWear.map((p) => (
                <span key={p.region} className="flex items-baseline gap-1">
                  <span className="font-display text-2xl font-light leading-none tabular-nums text-stone-900 dark:text-stone-100">
                    {p.value}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    {REGION_TAG[p.region]}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm italic text-stone-500 dark:text-stone-400">
              Needs a price and a wear rate.
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 border-t border-stone-100 pt-6 dark:border-stone-800">
        <ConditionMeter condition={garment.condition} />
      </div>

      {garment.aging.length > 0 && (
        <div className="mt-8 border-t border-stone-100 pt-6 dark:border-stone-800">
          <p className={statLabel}>The record</p>
          <ol className="mt-4 space-y-0">
            {garment.aging.map((entry, i) => (
              <li
                key={`${entry.date}-${i}`}
                className="relative border-l border-stone-200 pb-5 pl-5 last:pb-0 dark:border-stone-800"
              >
                <span
                  aria-hidden
                  className="absolute -left-[3px] top-1.5 h-1.5 w-1.5 rounded-full bg-rose-400"
                />
                <p className="font-mono text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  {entry.date} · {agingElapsedLabel(garment.firstWorn, entry.date)}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                  {entry.note}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
