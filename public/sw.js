// Minimal service worker: no app data is cached (so data is never stale). It only
// swaps in a friendly page (and that page's one font file) when the network is down.
const OFFLINE = "/offline.html";
const OFFLINE_FONT = "/fonts/fraunces-offline.woff2";
const CACHE = "home-hollow-offline-v3";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, OFFLINE_FONT])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  // The offline page's heading font: from the cache, so it still loads with no network.
  if (new URL(e.request.url).pathname === OFFLINE_FONT) {
    e.respondWith(caches.match(OFFLINE_FONT).then((r) => r || fetch(e.request)));
    return;
  }
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});
