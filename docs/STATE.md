# Stack upgrade candidate, 2026-09-18

Next 16.3.5, React 19.3.0, Tailwind 4.3.3 and Vitest 5.0.1 are installed with native TypeScript 7. The obsolete experimental viewTransition flag is removed because Next now enables the integration without configuration. The photo OG uses the existing RoseMark SVG, removing a dynamic-font400 log. Native typecheck, clean lint,142 tests and warning-free build pass; homepage/photos/skincare and photo OG HTTP pass; the final photo OG was visually inspected. Public GitHub browser acceptance covers desktop/phone page renders, gallery keyboard navigation, mobile navigation and search, plus the full existing overflow gate calibrated against clean and overflowing fixtures. Hosted results and release remain pending. Original CLAUDE edits are untouched.

Native TypeScript 7 runs through `pnpm run typecheck`, with Next route types
generated first. Next and ESLint retain the real TypeScript 6 compatibility API.
ESLint stays on 9.39.5 because the current Next plugins fail under ESLint 10.
Its package deprecation notice is retained, not suppressed. No database schema
was changed. Browser acceptance and hosted release remain outstanding.

# Project state
