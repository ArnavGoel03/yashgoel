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

/**
 * The glyph box is 24 wide and 27 tall: the symbol proper occupies the
 * top 24, and the strip below it is reserved for the cycle bars that
 * both standards hang under the tub and the tumble-dry square. Drawing
 * them inside the symbol, as a 24x24 box would force, is what makes
 * most web renderings of these marks wrong.
 */
const VIEW_BOX = "0 0 24 27";

/** The wash tub, optionally carrying a GINETEX temperature numeral. */
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
  return <path d="M3 17.5h18c0-4.4-2.9-7.5-7.2-7.5h-4.2L3 17.5Z" />;
}

function Triangle() {
  return <path d="M12 3.6 21 20.4H3Z" />;
}

function Drum() {
  return (
    <>
      <Square />
      <circle cx="12" cy="12" r="5" />
    </>
  );
}

/** Professional-care circle, optionally carrying a solvent letter. */
function ProCircle({ letter }: { letter?: string }) {
  return (
    <>
      <circle cx="12" cy="12" r="8" />
      {letter && (
        <text
          x="12"
          y="15.3"
          textAnchor="middle"
          fontSize="9"
          stroke="none"
          fill="currentColor"
        >
          {letter}
        </text>
      )}
    </>
  );
}

/**
 * Cycle bars, drawn under the symbol. One bar is the permanent-press
 * (mild) cycle, two is the gentle (very mild) cycle. Under the
 * professional circle a single bar means the same thing to a cleaner.
 */
function Bars({ n }: { n: 1 | 2 }) {
  return n === 1 ? (
    <path d="M6 23.2h12" />
  ) : (
    <path d="M6 22.1h12M6 24.7h12" />
  );
}

/** Temperature dots, the American way of saying the same thing. */
function Dots({
  n,
  cy,
  gap = 2.4,
  r = 0.9,
}: {
  n: number;
  cy: number;
  gap?: number;
  r?: number;
}) {
  const start = 12 - ((n - 1) * gap) / 2;
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <circle
          key={i}
          cx={start + i * gap}
          cy={cy}
          r={r}
          fill="currentColor"
          stroke="none"
        />
      ))}
    </>
  );
}

/** The corner stroke GINETEX adds to mean "keep it out of the sun". */
function ShadeCorner() {
  return <path d="M4 10.8 9.8 4.9" />;
}

const CARE_GLYPH: Record<GarmentCareCode, React.ReactNode> = {
  // Washing.
  "machine-wash-cold": <Tub temp="30" />,
  "machine-wash-warm": <Tub temp="40" />,
  "machine-wash-50": <Tub temp="50" />,
  "machine-wash-hot": <Tub temp="60" />,
  "machine-wash-70": <Tub temp="70" />,
  "machine-wash-very-hot": <Tub temp="95" />,
  "machine-wash-permanent-press": (
    <>
      <Tub />
      <Bars n={1} />
    </>
  ),
  "machine-wash-gentle": (
    <>
      <Tub />
      <Bars n={2} />
    </>
  ),
  "hand-wash": (
    <>
      <Tub />
      <Hand />
    </>
  ),
  "do-not-wash": (
    <>
      <Tub />
      <Forbid />
    </>
  ),
  "do-not-wring": (
    <>
      <path d="M4.5 8.5c3 1.2 4.5 2.2 7.5 3.5 3 1.3 4.5 2.3 7.5 3.5" />
      <path d="M4.5 15.5c3-1.2 4.5-2.2 7.5-3.5 3-1.3 4.5-2.3 7.5-3.5" />
      <path d="M4.5 8.5v7M19.5 8.5v7" />
      <Forbid />
    </>
  ),

  // Bleaching.
  "bleach-any": <Triangle />,
  "bleach-non-chlorine": (
    <>
      <Triangle />
      <path d="M8.8 17 12.6 10.9M11.8 17 15.4 10.9" />
    </>
  ),
  "do-not-bleach": (
    <>
      <Triangle />
      <Forbid />
    </>
  ),

  // Tumble drying.
  "tumble-dry-any": <Drum />,
  "tumble-dry-no-heat": (
    <>
      <Square />
      <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />
    </>
  ),
  "tumble-dry-low": (
    <>
      <Drum />
      <Dots n={1} cy={12} />
    </>
  ),
  "tumble-dry-medium": (
    <>
      <Drum />
      <Dots n={2} cy={12} />
    </>
  ),
  "tumble-dry-high": (
    <>
      <Drum />
      <Dots n={3} cy={12} />
    </>
  ),
  "tumble-dry-permanent-press": (
    <>
      <Drum />
      <Bars n={1} />
    </>
  ),
  "tumble-dry-gentle": (
    <>
      <Drum />
      <Bars n={2} />
    </>
  ),
  "do-not-tumble-dry": (
    <>
      <Drum />
      <Forbid />
    </>
  ),

  // Natural drying.
  "line-dry": (
    <>
      <Square />
      <path d="M12 6.2v11.6" />
    </>
  ),
  "drip-dry": (
    <>
      <Square />
      <path d="M9.4 6.2v11.6M14.6 6.2v11.6" />
    </>
  ),
  "flat-dry": (
    <>
      <Square />
      <path d="M6.2 12h11.6" />
    </>
  ),
  "line-dry-shade": (
    <>
      <Square />
      <path d="M12 6.2v11.6" />
      <ShadeCorner />
    </>
  ),
  "drip-dry-shade": (
    <>
      <Square />
      <path d="M9.4 6.2v11.6M14.6 6.2v11.6" />
      <ShadeCorner />
    </>
  ),
  "flat-dry-shade": (
    <>
      <Square />
      <path d="M6.2 12h11.6" />
      <ShadeCorner />
    </>
  ),

  // Ironing.
  "iron-low": (
    <>
      <Iron />
      <Dots n={1} cy={14.6} gap={2.8} />
    </>
  ),
  "iron-medium": (
    <>
      <Iron />
      <Dots n={2} cy={14.6} gap={2.8} />
    </>
  ),
  "iron-high": (
    <>
      <Iron />
      <Dots n={3} cy={14.6} gap={2.8} />
    </>
  ),
  "iron-no-steam": (
    <>
      <Iron />
      <path d="M8.6 19.4v2.8M12 19.4v2.8M15.4 19.4v2.8" />
      <path d="M6.8 23 17.2 18.6" />
    </>
  ),
  "do-not-iron": (
    <>
      <Iron />
      <Forbid />
    </>
  ),

  // Professional care.
  "dry-clean": <ProCircle />,
  "dry-clean-p": <ProCircle letter="P" />,
  "dry-clean-p-gentle": (
    <>
      <ProCircle letter="P" />
      <Bars n={1} />
    </>
  ),
  "dry-clean-f": <ProCircle letter="F" />,
  "dry-clean-f-gentle": (
    <>
      <ProCircle letter="F" />
      <Bars n={1} />
    </>
  ),
  "do-not-dry-clean": (
    <>
      <ProCircle />
      <Forbid />
    </>
  ),
  "wet-clean": <ProCircle letter="W" />,
  "wet-clean-gentle": (
    <>
      <ProCircle letter="W" />
      <Bars n={1} />
    </>
  ),
  "do-not-wet-clean": (
    <>
      <ProCircle letter="W" />
      <Forbid />
    </>
  ),
};

/**
 * The American drawing, for the handful of instructions ASTM D5489
 * renders differently from ISO 3758. Temperature becomes dots instead
 * of a numeral, and drip dry gains a third stroke. Anything absent
 * here is drawn identically under both standards.
 */
const CARE_GLYPH_ASTM: Partial<Record<GarmentCareCode, React.ReactNode>> = {
  "machine-wash-cold": (
    <>
      <Tub />
      <Dots n={1} cy={15.4} gap={2.2} r={0.8} />
    </>
  ),
  "machine-wash-warm": (
    <>
      <Tub />
      <Dots n={2} cy={15.4} gap={2.2} r={0.8} />
    </>
  ),
  "machine-wash-50": (
    <>
      <Tub />
      <Dots n={3} cy={15.4} gap={2.2} r={0.8} />
    </>
  ),
  "machine-wash-hot": (
    <>
      <Tub />
      <Dots n={4} cy={15.4} gap={2.2} r={0.8} />
    </>
  ),
  "machine-wash-70": (
    <>
      <Tub />
      <Dots n={5} cy={15.4} gap={2.2} r={0.8} />
    </>
  ),
  "machine-wash-very-hot": (
    <>
      <Tub />
      <Dots n={6} cy={15.4} gap={2.2} r={0.8} />
    </>
  ),
  "drip-dry": (
    <>
      <Square />
      <path d="M8 6.2v11.6M12 6.2v11.6M16 6.2v11.6" />
    </>
  ),
};

/** Codes the two standards draw differently. */
export function hasAstmVariant(code: GarmentCareCode): boolean {
  return code in CARE_GLYPH_ASTM;
}

export function CareSymbol({
  code,
  standard = "iso",
  className = "h-6 w-6",
}: {
  code: GarmentCareCode;
  /** Which standard's drawing to render. Falls back when they agree. */
  standard?: "iso" | "astm";
  className?: string;
}) {
  const glyph =
    (standard === "astm" ? CARE_GLYPH_ASTM[code] : undefined) ??
    CARE_GLYPH[code];
  return (
    <svg viewBox={VIEW_BOX} className={className} aria-hidden {...STROKE}>
      {glyph}
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
