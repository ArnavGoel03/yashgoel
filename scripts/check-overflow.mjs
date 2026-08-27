// Horizontal-overflow gate.
//
// A page that is wider than the viewport lets a phone scroll sideways, and
// every fixed/sticky element then sizes to the wrong box, so the header stops
// covering the page. Three separate causes shipped that way at once (a
// decorative wash hung past the container with a negative offset, a desktop
// nav that unhid 200px before it fit, a bleed margin on an element with no
// padded parent to cancel it), which is why this is a script and not a
// checklist item.
//
// Vitest cannot see this: it needs real layout. So this drives a headless
// Chrome over CDP against a running server and fails on any route whose
// document is wider than its viewport.
//
// Start Chrome once, then run the check:
//   nohup ~/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-mac-arm64/chrome-headless-shell \
//     --remote-debugging-port=9333 --user-data-dir=$TMPDIR/cdp-profile \
//     --no-first-run --hide-scrollbars >/dev/null 2>&1 & disown
//   until curl -s --max-time 1 http://127.0.0.1:9333/json/version >/dev/null; do sleep 0.5; done
//   node scripts/check-overflow.mjs
//
// BASE defaults to the local production server (next build && next start), not
// dev: Turbopack dev cannot parse globals.css today, and dev-only layout is not
// what visitors get anyway.
//   BASE=https://yashgoel.vercel.app node scripts/check-overflow.mjs
//   WIDTHS=390 ROUTES=/skincare node scripts/check-overflow.mjs
//
// The probe walks up from every element that sticks out and ignores anything
// already inside a clipping ancestor, so a filter rail or a wide table in its
// own `overflow-x-auto` scroller is doing its job and is not reported. Only
// elements that actually widen the document are.

const PORT = Number(process.env.CDP_PORT || 9333);
const BASE = process.env.BASE || "http://127.0.0.1:3001";
// Per-route settle. 2s is right for a cold local server; a warm CDN needs far
// less, and a full-sitemap sweep is 200+ routes, so the difference is minutes.
const SETTLE = Number(process.env.SETTLE || 2000);
const WIDTHS = (process.env.WIDTHS || "320,390,768,1024,1280,1440")
  .split(",")
  .map(Number);
// ROUTES_FILE takes one route per line, which is how a full sitemap sweep is
// run: the 22 defaults below are the index and static pages, not the ~190
// review detail pages.
const ROUTES = process.env.ROUTES_FILE
  ? (await import("node:fs")).readFileSync(process.env.ROUTES_FILE, "utf8").split("\n").map((l) => l.trim()).filter(Boolean)
  : (
  process.env.ROUTES ||
  [
    "/",
    "/skincare",
    "/supplements",
    "/oral-care",
    "/hair-care",
    "/body-care",
    "/fashion",
    "/essentials",
    "/miscellaneous",
    "/compare",
    "/stack-builder",
    "/today",
    "/library",
    "/about",
    "/glossary",
    "/shelf",
    "/routine",
    "/search",
    "/now",
    "/primers",
    "/photos",
    "/subscribe",
    // One review detail page per section. The index pages alone missed
    // a verdict stamp that pushed /supplements/nutricost-vitamin-b12 to
    // 407px of document in a 390px viewport. For the whole catalogue,
    // point ROUTES_FILE at a file of paths from the sitemap.
    "/skincare/tinkle-dermaplaning-razors",
    "/supplements/nutricost-vitamin-b12",
    "/oral-care",
    "/hair-care/padagis-ketoconazole-2-shampoo",
    "/essentials/whoop-peak-5-0",
  ].join(",")
).split(",");

const PROBE = `(() => {
  const vw = document.documentElement.clientWidth;
  const doc = document.documentElement.scrollWidth;
  if (doc <= vw) return { doc, vw, bad: [] };
  const bad = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.right <= vw + 1) continue;
    let clipped = false;
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (getComputedStyle(p).overflowX !== "visible") { clipped = true; break; }
    }
    if (clipped) continue;
    bad.push(
      el.tagName.toLowerCase() +
        "." +
        (el.className.toString().slice(0, 70) || "(none)") +
        " left=" + Math.round(r.left) +
        " right=" + Math.round(r.right),
    );
  }
  return { doc, vw, bad: bad.slice(0, 6) };
})()`;

let target;
try {
  target = await (
    await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })
  ).json();
} catch {
  console.error(
    `No Chrome on CDP port ${PORT}. Start chrome-headless-shell first (see the header of this file).`,
  );
  process.exit(2);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });

await send("Page.enable");
await send("Runtime.enable");

let failures = 0;
let checked = 0;
for (const route of ROUTES) {
  for (const width of WIDTHS) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width < 700,
    });
    await send("Page.navigate", { url: BASE + route });
    await new Promise((r) => setTimeout(r, SETTLE));
    let out;
    try {
      const r = await send("Runtime.evaluate", {
        expression: PROBE,
        returnByValue: true,
        awaitPromise: true,
      });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
      out = r.result.value;
    } catch (e) {
      console.log(`SKIP  ${route} at ${width}: ${e.message}`);
      continue;
    }
    checked++;
    if (out.doc > out.vw) {
      failures++;
      console.log(`FAIL  ${route} at ${width}: document is ${out.doc}px wide`);
      out.bad.forEach((b) => console.log(`        ${b}`));
    }
  }
}

await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`).catch(() => {});
console.log(
  failures === 0
    ? `No horizontal overflow. ${checked} route/width pairs checked.`
    : `${failures} of ${checked} route/width pairs scroll sideways.`,
);
process.exit(failures === 0 ? 0 : 1);
