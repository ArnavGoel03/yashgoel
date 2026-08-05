import { CareRow, FitSilhouette } from "@/components/garment-icons";
import { MONTH_INITIALS, MONTH_NAMES, seasonMonths } from "@/lib/garment";
import { GARMENT_FIT_LABEL, GARMENT_SEASON_LABEL } from "@/lib/garment-types";
import type { Garment } from "@/lib/garment-types";

/**
 * The measurable half of a garment: shape, material, wearable window,
 * washing contract. Drawn rather than described, because "98% cotton
 * with 2% elastane, machine wash cold, do not tumble dry" is a spec
 * sheet pretending to be a sentence.
 */

const blockLabel =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500";

/** Stacked composition bar. The dominant fibre carries the accent. */
function FabricBar({ fabric }: { fabric: Garment["fabric"] }) {
  if (fabric.length === 0) return null;
  const ordered = [...fabric].sort((a, b) => b.percent - a.percent);
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full">
        {ordered.map((f, i) => (
          <div
            key={f.material}
            style={{ width: `${f.percent}%` }}
            className={
              i === 0
                ? "bg-rose-300 dark:bg-rose-400/70"
                : i === 1
                  ? "bg-stone-400 dark:bg-stone-500"
                  : "bg-stone-300 dark:bg-stone-700"
            }
          />
        ))}
      </div>
      <dl className="mt-3 space-y-1">
        {ordered.map((f) => (
          <div key={f.material} className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-stone-600 dark:text-stone-400">
              {f.material}
            </dt>
            <dd className="font-mono text-[11px] tabular-nums text-stone-500 dark:text-stone-400">
              {f.percent}%
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Twelve months, lit where the piece is actually wearable. */
function SeasonStrip({ season }: { season: Garment["season"] }) {
  if (season.length === 0) return null;
  const months = seasonMonths(season);
  return (
    <div>
      <div className="flex gap-[3px]">
        {MONTH_INITIALS.map((initial, i) => {
          const on = months.has(i);
          return (
            <div
              key={`${initial}-${i}`}
              title={MONTH_NAMES[i]}
              className={
                "flex-1 rounded-sm py-1.5 text-center font-mono text-[9px] leading-none " +
                (on
                  ? "bg-stone-800 text-stone-100 dark:bg-stone-200 dark:text-stone-900"
                  : "bg-stone-100 text-stone-400 dark:bg-stone-800/70 dark:text-stone-600")
              }
            >
              {initial}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-stone-600 dark:text-stone-400">
        {season.map((s) => GARMENT_SEASON_LABEL[s]).join(", ")}
      </p>
    </div>
  );
}

export function GarmentPanel({ garment }: { garment: Garment }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900 sm:p-8">
      <h2 className="mb-6 font-serif text-xl text-stone-900 dark:text-stone-100">
        The piece<span className="text-rose-400">.</span>
      </h2>

      <div className="grid gap-8 sm:grid-cols-3">
        <div>
          <p className={blockLabel}>Cut</p>
          <div className="mt-3 flex items-center gap-3">
            <FitSilhouette fit={garment.fit} className="h-16 w-14 flex-none" />
            <div>
              <p className="font-serif text-lg leading-tight text-stone-900 dark:text-stone-100">
                {GARMENT_FIT_LABEL[garment.fit]}
              </p>
              <p className="font-mono text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Size {garment.size}
              </p>
            </div>
          </div>
          {garment.sizeNote && (
            <p className="mt-2 text-xs italic leading-relaxed text-stone-500 dark:text-stone-400">
              {garment.sizeNote}
            </p>
          )}
        </div>

        {garment.fabric.length > 0 && (
          <div>
            <p className={`${blockLabel} mb-3`}>Made of</p>
            <FabricBar fabric={garment.fabric} />
          </div>
        )}

        {garment.season.length > 0 && (
          <div>
            <p className={`${blockLabel} mb-3`}>Wearable</p>
            <SeasonStrip season={garment.season} />
          </div>
        )}
      </div>

      {garment.care.length > 0 && (
        <div className="mt-8 border-t border-stone-100 pt-6 dark:border-stone-800">
          <p className={`${blockLabel} mb-4`}>Care</p>
          <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {garment.care.map((code) => (
              <CareRow key={code} code={code} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
