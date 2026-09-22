# Reviews canonical release, 22 September 2026

The canonical Reviews hostname is live at https://reviews.arnavgoel.dev. Vercel
reports production deployment `dpl_BK7asHgwxPXY3qyBKokBbDKW1qb2` READY, and
its build log identifies exact main source
`eec433448774a42c3eb722803937a2f93c5f6964`. The homepage defines its canonical
at the page boundary, so child routes keep their own canonical metadata. Live
HTTP checks found exactly one homepage canonical,
`https://reviews.arnavgoel.dev`, and exactly one `/about` canonical,
`https://reviews.arnavgoel.dev/about`, both on HTTP 200 responses with HSTS.

`lib/site.ts` now defaults to the Reviews domain and pins that value for Vercel
production. `NEXT_PUBLIC_SITE_URL` was also corrected across Vercel production,
preview and development. The guard was built with the prior
`https://yashgoel.bio` value deliberately injected; the homepage RSC contained
the Reviews host and no old-host reference. The isolated checkout passes 144
tests, lint, native typecheck and a 269-page build. GitHub run 35754976533 also
passed its full test, lint, typecheck and build step for the feature source. No
review content, page copy, schema or application data changed. This receipt
verifies provider and HTTP metadata, not new rendered visual acceptance. Exact
evidence: `docs/receipts/homepage-canonical-2026-09-22.json`.

# Historical live stack and image-cache verification, 18 September 2026

The verified upgrade is live at https://yashgoel.vercel.app. Provider alias
readback confirms READY deployment `dpl_7crMNHAok1dLV8dd8eD9fahdX2v9`, GitHub
source `a1100652cf2c6f8e3023cd66fe75eccac43419c7`. The project is not paused.
Homepage, /photos, /skincare and /photos/opengraph-image return HTTP 200 with
expected content types and CSP/HSTS. All 17 emitted JavaScript/CSS assets and
all 71 emitted image URLs returned HTTP 200 in the final checks.

Live qualification found a stale optimizer failure for the existing GitHub
photo URL at width1920/quality65: HTTP400 INVALID_IMAGE_OPTIMIZE_REQUEST,
x-vercel-cache MISS, cache-control public,max-age=0,must-revalidate. The same
photo succeeded at other allowed widths/qualities and with a fresh origin query.
Image configuration and manifest are unchanged by the upgrade. The earlier
production URL redirected to provider HTML, so it was not a valid image baseline;
no upgrade regression or rollback requirement was established.

The full image sweep initially returned 40 successes, three HTTP400 responses
and 28 transport timeouts during cold large-image transfers. Using the provider's
documented POST /v1/edge-cache/invalidate-by-src-images, only four affected source
images were marked stale (HTTP200). Failed requests were checked again with at
most four concurrent requests. All timeouts and HTTP400s cleared; one stale
response needed its documented background revalidation to finish. The original
1920/quality65 URL also recovered. Two repaired complete JPEGs decoded correctly
at 1920x1281 and 3840x2562 and were visually inspected. No content URL, image
allowlist, application source, deployment, billing or quota setting changed.

Receipt: `docs/receipts/live-stack-2026-09-18.json`. Source gates and hosted
browser evidence below remain valid for unchanged source. Local data-integrity
tests pass, 142/142. This HTTP qualification does not claim new live-browser
currentSrc or real-device measurements. The shared deployment quota remains
exhausted until September19 around04:42IST, but this image repair required no
new deployment. Historical paused-host statements below are superseded.

# Hosted stack verification follow-up, 2026-09-18

CI run https://github.com/ArnavGoel03/yashgoel/actions/runs/35271801736
passed source gates and all162 overflow route/width pairs, with positive and
negative calibration fixtures. Desktop and phone interactions found an
existing mouseenter handler casting Document to HTMLElement before closest.
One shared trigger resolver now rejects non-Element targets for both hover
and click. The browser regression explicitly dispatches both document events.
Clean lint/native typecheck,142 tests and warning-free build pass after this
repair. Final hosted run https://github.com/ArnavGoel03/yashgoel/actions/runs/35273828251
passes both desktop and phone interactions, with zero page errors. Eight
screenshots were inspected, including both fully decoded lightbox images
after their native view transitions finish. The earlier full overflow pass
is retained because the repair changes only event lookup. Verified source
HEAD is9840f89c9ef460cd953f07afbadb214a44327253; this receipt is documentation only.

# Stack upgrade candidate, 2026-09-18

Next 16.3.5, React 19.3.0, Tailwind 4.3.3 and Vitest 5.0.1 are installed with native TypeScript 7. The obsolete experimental viewTransition flag is removed because Next now enables the integration without configuration. The photo OG uses the existing RoseMark SVG, removing a dynamic-font400 log. Native typecheck, clean lint,142 tests and warning-free build pass; homepage/photos/skincare and photo OG HTTP pass; the final photo OG was visually inspected. Public GitHub browser acceptance covers desktop/phone page renders, gallery keyboard navigation, mobile navigation and search, plus the full existing overflow gate calibrated against clean and overflowing fixtures. Hosted source and rendered acceptance pass. Production release remains blocked: https://yashgoel.vercel.app returns503 DEPLOYMENT_PAUSED on the final recheck. Original CLAUDE edits are untouched.

Native TypeScript 7 runs through `pnpm run typecheck`, with Next route types
generated first. Next and ESLint retain the real TypeScript 6 compatibility API.
ESLint stays on 9.39.5 because the current Next plugins fail under ESLint 10.
Its package deprecation notice is retained, not suppressed. No database schema
was changed. Browser acceptance passes; paused hosting remains outstanding.

# Project state
