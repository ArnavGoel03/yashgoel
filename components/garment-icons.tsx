import { GARMENT_CARE_LABEL } from "@/lib/garment-types";
import type { GarmentCareCode, GarmentFit } from "@/lib/garment-types";

/**
 * Inline SVG for the two things about a garment that a sentence
 * describes badly: what shape it is, and how it has to be washed.
 *
 * Everything is stroked in `currentColor` at a single weight, so the
 * glyphs inherit the surrounding text color and are correct in light
 * and dark without a second definition. No emoji, no icon font, no
 * network request.
 */

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** The GINETEX wash tub, optionally carrying a temperature. */
function Tub({ temp }: { temp?: string }) {
  return (
    <>
      <path d="M3.5 8.5h17l-1.7 10.6a1.6 1.6 0 0 1-1.6 1.4H6.8a1.6 1.6 0 0 1-1.6-1.4Z" />
      <path d="M3.5 8.5c1.6-2.2 3.2-2.2 4.8 0" />
      {temp && (
        <text
          x="12"
          y="17.4"
          textAnchor="middle"
          fontSize="7"
          stroke="none"
          fill="currentColor"
        >
          {temp}
        </text>
      )}
    </>
  );
}

/** A hand, resting in the tub. Simplified to read at 24px. */
function Hand() {
  return (
    <>
      <path d="M8.8 19v-3.6c0-1.4 1-2.4 2.3-2.4h3.3" />
      <path d="M11.2 13v-2.2M13 13v-2.8M14.8 13v-1.9" />
    </>
  );
}

/** Diagonal cross used by every "do not" symbol. */
function Forbid() {
  return <path d="M3.2 3.2 20.8 20.8M20.8 3.2 3.2 20.8" />;
}

function Square() {
  return <rect x="3.5" y="4.5" width="17" height="15" rx="1.2" />;
}

function Iron() {
  return (
    <>
      <path d="M3 17.5h18c0-4.4-2.9-7.5-7.2-7.5h-4.2L3 17.5Z" />
    </>
  );
}

const CARE_GLYPH: Record<GarmentCareCode, React.ReactNode> = {
  "machine-wash-cold": <Tub temp="30" />,
  "machine-wash-warm": <Tub temp="40" />,
  "hand-wash": (
    <>
      <Tub />
      <Hand />
    </>
  ),
  "do-not-bleach": (
    <>
      <path d="M12 3.6 21 20.4H3Z" />
      <Forbid />
    </>
  ),
  "tumble-dry-low": (
    <>
      <Square />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  "do-not-tumble-dry": (
    <>
      <Square />
      <circle cx="12" cy="12" r="5" />
      <Forbid />
    </>
  ),
  "line-dry": (
    <>
      <Square />
      <path d="M12 6.2v11.6" />
    </>
  ),
  "iron-low": (
    <>
      <Iron />
      <circle cx="12" cy="14.6" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  "do-not-iron": (
    <>
      <Iron />
      <Forbid />
    </>
  ),
  "dry-clean": <circle cx="12" cy="12" r="8" />,
  "do-not-dry-clean": (
    <>
      <circle cx="12" cy="12" r="8" />
      <Forbid />
    </>
  ),
};

export function CareSymbol({
  code,
  className = "h-6 w-6",
}: {
  code: GarmentCareCode;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...STROKE}>
      {CARE_GLYPH[code]}
    </svg>
  );
}

/** Symbol + its plain-language meaning. */
export function CareRow({ code }: { code: GarmentCareCode }) {
  return (
    <li className="flex items-center gap-2.5">
      <CareSymbol
        code={code}
        className="h-6 w-6 flex-none text-stone-700 dark:text-stone-300"
      />
      <span className="text-xs leading-tight text-stone-600 dark:text-stone-400">
        {GARMENT_CARE_LABEL[code]}
      </span>
    </li>
  );
}

/**
 * Half-widths (of a 64-unit torso) and sleeve length per fit. One
 * parametric outline keeps the five shapes honestly comparable: only
 * the numbers change, never the drawing.
 */
const FIT_SHAPE: Record<
  GarmentFit,
  { shoulder: number; chest: number; hem: number; sleeve: number }
> = {
  slim: { shoulder: 15, chest: 13, hem: 11, sleeve: 14 },
  tailored: { shoulder: 16, chest: 14.5, hem: 12.5, sleeve: 15 },
  regular: { shoulder: 17, chest: 16, hem: 15.5, sleeve: 16 },
  relaxed: { shoulder: 19, chest: 18.5, hem: 18.5, sleeve: 17 },
  oversized: { shoulder: 22, chest: 21, hem: 21, sleeve: 19 },
};

function fitPath(fit: GarmentFit): string {
  const { shoulder, chest, hem, sleeve } = FIT_SHAPE[fit];
  const cx = 32;
  const neck = 5.5;
  const shoulderY = 12;
  const cuffY = shoulderY + sleeve;
  const armpitY = shoulderY + sleeve * 0.86;
  const hemY = 74;
  const cuff = sleeve * 0.5;
  return [
    `M${cx - neck} 7`,
    `L${cx - shoulder} ${shoulderY}`,
    `L${cx - shoulder - cuff} ${cuffY}`,
    `L${cx - chest} ${armpitY}`,
    `L${cx - hem} ${hemY}`,
    `L${cx + hem} ${hemY}`,
    `L${cx + chest} ${armpitY}`,
    `L${cx + shoulder + cuff} ${cuffY}`,
    `L${cx + shoulder} ${shoulderY}`,
    `L${cx + neck} 7`,
    `Q${cx} 12 ${cx - neck} 7`,
    "Z",
  ].join(" ");
}

/**
 * The five fits, drawn to the same scale. `muted` renders the outline
 * only, used by the /fashion method key where all five sit side by
 * side for comparison.
 */
export function FitSilhouette({
  fit,
  className = "h-20 w-16",
  muted = false,
}: {
  fit: GarmentFit;
  className?: string;
  muted?: boolean;
}) {
  return (
    <svg viewBox="0 0 64 80" className={className} aria-hidden {...STROKE}>
      {/* Reference body line, so a wider cut is visibly wider than the
          same shoulders rather than just a different squiggle. */}
      <path
        d="M32 7v67"
        className="text-stone-200 dark:text-stone-800"
        strokeDasharray="2 3"
      />
      <path
        d={fitPath(fit)}
        className={
          muted
            ? "text-stone-400 dark:text-stone-600"
            : "text-stone-800 dark:text-stone-200"
        }
        fill={muted ? "none" : "currentColor"}
        fillOpacity={muted ? 0 : 0.06}
      />
    </svg>
  );
}
