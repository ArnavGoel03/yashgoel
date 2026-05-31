// Service worker for yashgoel.vercel.app.
//
// Bumping CACHE invalidates everything from prior deploys, so use a
// fresh suffix whenever the shell content meaningfully changes (the
// versioned name is the cache-bust, no `?v=` query strings needed).
//
// Strategy:
//   - install: pre-cache the app shell so first paint after a fresh
//     install is offline-tolerant for the routes the reader is most
//     likely to land on.
//   - activate: drop every cache that isn't this version, so old
//     deploys don't leak stale HTML.
//   - fetch (same-origin GET only):
//       * navigations + page HTML → network-first, fall back to cache,
//         fall back to /offline. Keeps content fresh while still
//         working on the subway.
//       * everything else (CSS, JS, images, fonts) →
//         stale-while-revalidate. Returns the cached copy instantly
//         and refreshes it in the background.
//   - cross-origin (Amazon CDN, Vercel Blob, Google Fonts) is left to
//     the browser; SW never proxies it.

const CACHE = "yashgoel-shell-v4";
const SHELL = [
  "/",
  "/skincare",
  "/supplements",
  "/oral-care",
  "/hair-care",
  "/body-care",
  "/essentials",
  "/miscellaneous",
  "/routine",
  // /today is the installable habit tracker, precache it so opening
  // the home-screen icon works fully offline (the tracker itself reads
  // from localStorage, so it needs no network beyond this shell HTML).
  "/today",
  "/photos",
  "/now",
  "/about",
  "/links",
  "/offline",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // addAll bails on the first failed entry; use Promise.allSettled
      // so a single 404 (e.g. a route renamed since this version) does
      // not abort the whole install.
      Promise.allSettled(SHELL.map((url) => cache.add(url))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Skip Next's data + RSC streaming routes, they need fresh data and
  // don't tolerate the latency of a cache miss followed by a refresh.
  if (
    url.pathname.startsWith("/_next/data/") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.endsWith(".rsc") ||
    url.searchParams.has("_rsc")
  ) {
    return;
  }

  const isNavigation =
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/offline")),
        ),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
