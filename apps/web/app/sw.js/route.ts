import { NextResponse } from "next/server";

/**
 * A tag that's stable for one deployment but changes on the next one —
 * that's what makes this work as a cache-buster. A static public/sw.js
 * with a hardcoded CACHE_NAME has no way to signal "a new version exists":
 * browsers only re-install a service worker when its script's bytes
 * actually change, so with unchanging bytes, everyone who ever loaded the
 * app stays on whatever was cached at their first visit, forever, no
 * matter how many times the app is redeployed. Tying CACHE_NAME to this
 * tag means each deploy's activate handler (below) correctly recognizes
 * every previous generation's caches as stale and clears them.
 *
 * VERCEL_GIT_COMMIT_SHA is identical across every serverless instance of
 * one deployment and changes on every new one — exactly the stability this
 * needs. This route has no dynamic inputs, but reads no per-request data
 * either, so Route Handlers here default to running per-request rather
 * than being frozen at build time — Date.now() alone would drift between
 * instances of the *same* deployment as they cold-start at different
 * moments. Falls back to Date.now() outside Vercel (e.g. a local
 * `next start`), where a single long-lived process makes that fine.
 */
const BUILD_TAG = process.env.VERCEL_GIT_COMMIT_SHA ?? `${Date.now()}`;

const SW_SCRIPT = `
// Minimal app-shell cache — this app's real value (editing) never needs the
// network, so the service worker's only job is letting the page itself load
// while offline. API routes and cross-origin requests always pass through.
const CACHE_NAME = "framer-shell-${BUILD_TAG}";
const APP_SHELL = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached ?? caches.match("/"))),
    );
    return;
  }

  // Next's static chunks are content-hashed and immutable, so cache-first
  // is safe — a new deploy ships new filenames rather than new bytes at the
  // same URL.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        });
      }),
    );
  }
});
`;

export async function GET() {
  return new NextResponse(SW_SCRIPT, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // The service worker script itself must never be served stale from
      // an intermediate cache — that would defeat the whole point of tying
      // its bytes to the build. Browsers already re-check it periodically,
      // but this guarantees every check actually reaches this route.
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/",
    },
  });
}
