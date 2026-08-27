/**
 * One date rule for the whole site.
 *
 * Two bugs live here, both of which shipped:
 *
 * 1. Precision. A changelog entry may be written as "2025", "2025-08" or
 *    "2025-08-16", because the author does not always remember the day he
 *    bought something. `new Date("2025")` resolves to January 1st, so the
 *    changelog rendered "Jan 1, 2025" for an entry that only ever claimed a
 *    year. Formatting now follows the precision it was given and never
 *    invents a field that was not written.
 *
 * 2. Time zone. A date-only ISO string parses as UTC midnight, and
 *    `toLocaleDateString` then renders it in the reader's zone. Every date
 *    on the site therefore showed a day early for anyone west of UTC. The
 *    parts are read off the string instead, so a date means the same day to
 *    every reader.
 */

/** Full-precision day, the shape `datePublished` and `lastUpdated` require. */
export const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Any precision a changelog entry may carry: year, year-month, or full day.
 * `lib/schema.ts` validates against this and `tests/data-integrity.test.ts`
 * asserts it, so the grammar is defined once.
 */
export const ISO_ANY_PRECISION = /^\d{4}(-\d{2}(-\d{2})?)?$/;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Render a date at the precision it was written with. Falls back to the raw
 * string for anything that does not parse, so a malformed entry shows what
 * the file actually says rather than "Invalid Date".
 */
export function formatDate(value: string): string {
  const m = ISO_ANY_PRECISION.exec(value.trim());
  if (!m) return value;
  const [year, month, day] = value.trim().split("-");
  const monthName = month ? MONTHS[Number(month) - 1] : undefined;
  if (!month || !monthName) return year;
  if (!day) return `${monthName} ${year}`;
  return `${monthName} ${Number(day)}, ${year}`;
}
