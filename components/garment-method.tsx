import {
  CareSymbol,
  FitSilhouette,
  hasAstmVariant,
} from "@/components/garment-icons";
import {
  careRegionDetail,
  GARMENT_CARE_FAMILIES,
  GARMENT_CARE_LABEL,
  GARMENT_CARE_STANDARD_LABEL,
  GARMENT_CONDITIONS,
  GARMENT_CONDITION_LABEL,
  GARMENT_FITS,
  GARMENT_FIT_LABEL,
} from "@/lib/garment-types";
import type { GarmentCareCode } from "@/lib/garment-types";

/**
 * The key to the /fashion section: the four things every entry records
 * and the symbols used to record them. It is a legend, not an opinion,
 * so it stands on its own before a single garment is published, and it
 * stays useful afterwards as the reference for what the diagrams on a
 * detail page mean.
 */

const label =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500";
const note = "mt-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400";

/**
 * One symbol in the key. Where ISO 3758 and ASTM D5489 draw the same
 * instruction differently, both drawings are shown, GINETEX first,
 * because that is the one on a label bought in India.
 */
function CareKeyRow({ code }: { code: GarmentCareCode }) {
  const detail = careRegionDetail(code);
  const dual = hasAstmVariant(code);
  return (
    <li className="flex items-start gap-2.5">
      <span className="flex flex-none items-center gap-1 pt-px">
        <CareSymbol
          code={code}
          className="h-7 w-7 text-stone-700 dark:text-stone-300"
        />
        {dual && (
          <>
            <span
              aria-hidden
              className="h-4 w-px bg-stone-200 dark:bg-stone-700"
            />
            <CareSymbol
              code={code}
              standard="astm"
              className="h-7 w-7 text-stone-700 dark:text-stone-300"
            />
          </>
        )}
      </span>
      <span className="min-w-0 pt-1">
        <span className="block text-[11px] leading-tight text-stone-600 dark:text-stone-400">
          {GARMENT_CARE_LABEL[code]}
        </span>
        {detail && (
          <span className="mt-1 block font-mono text-[9px] uppercase leading-tight tracking-wider text-stone-400 dark:text-stone-500">
            {detail}
          </span>
        )}
      </span>
    </li>
  );
}

export function GarmentMethod() {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900 sm:p-8">
      <h2 className="font-serif text-2xl text-stone-900 dark:text-stone-100">
        What every entry records<span className="text-rose-400">.</span>
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-400">
        A garment is judged on four things that a paragraph describes
        badly, so each one is stored as data and drawn: the cut, the
        blend, the washing contract, and how the piece has aged since
        the first wear.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <div>
          <p className={label}>01, the cut</p>
          <div className="mt-4 flex items-end justify-between gap-2">
            {GARMENT_FITS.map((fit) => (
              <figure key={fit} className="flex-1">
                <FitSilhouette fit={fit} muted className="h-20 w-full" />
                <figcaption className="mt-1 text-center font-mono text-[9px] uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  {GARMENT_FIT_LABEL[fit]}
                </figcaption>
              </figure>
            ))}
          </div>
          <p className={note}>
            Drawn to one scale against the same centre line, so a
            relaxed cut is visibly wider than a slim one rather than a
            different word for the same shape. The labelled size sits
            next to it, because a size is only meaningful with the
            brand attached.
          </p>
        </div>

        <div>
          <p className={label}>02, the blend</p>
          <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full">
            <div className="w-[70%] bg-rose-300 dark:bg-rose-400/70" />
            <div className="w-[22%] bg-stone-400 dark:bg-stone-500" />
            <div className="w-[8%] bg-stone-300 dark:bg-stone-700" />
          </div>
          <p className={note}>
            Every fibre off the care label, largest first, adding up to
            100 percent. The bar above is a blank key, not a real
            garment. Blend is the single best predictor of how a piece
            will behave after twenty washes, and it is the first thing
            a product page buries.
          </p>
        </div>
      </div>

      <div className="mt-10">
        <p className={label}>03, the washing contract</p>
        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          Two standards write the world&rsquo;s care labels and they
          mostly agree. {GARMENT_CARE_STANDARD_LABEL.iso} covers India,
          the UK and the EU; {GARMENT_CARE_STANDARD_LABEL.astm} covers
          the US. Same five shapes, one real difference: America prints
          temperature as dots where GINETEX prints a number. Rows below
          showing two symbols are the same instruction drawn both ways,
          GINETEX first. A line in small type means the symbol is not
          printed everywhere.
        </p>
        <div className="mt-6 grid gap-x-8 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
          {GARMENT_CARE_FAMILIES.map((family) => (
            <div key={family.key}>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
                {family.label}
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-stone-400 dark:text-stone-500">
                {family.note}
              </p>
              <ul className="mt-4 space-y-3">
                {family.codes.map((code) => (
                  <CareKeyRow key={code} code={code} />
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className={note}>
          Every symbol either standard prints, spelled out. A garment
          that needs dry cleaning costs more than its price tag, and
          that belongs in the verdict.
        </p>
      </div>

      <div className="mt-10 max-w-2xl">
        <p className={label}>04, how it has aged</p>
        <ol className="mt-4 flex items-stretch gap-1">
          {GARMENT_CONDITIONS.map((stage) => (
            <li key={stage} className="flex-1">
              <div className="h-1.5 rounded-full bg-stone-200 dark:bg-stone-800" />
              <p className="mt-2 text-center font-mono text-[9px] uppercase leading-tight tracking-wider text-stone-500 dark:text-stone-400">
                {GARMENT_CONDITION_LABEL[stage]}
              </p>
            </li>
          ))}
        </ol>
        <p className={note}>
          Where the piece sits on the wear track, plus months owned, an
          honest wears-per-month estimate, and the cost per wear those
          two produce. Broken in is not a fault on denim and is a fault
          on a dress shirt, so the track records position, not a score.
        </p>
      </div>
    </section>
  );
}
