const CACHE_VERSION = "glb-static-v1";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/pwa-icon.svg"
];
const THIRD_PARTY_ORIGINS = new Set([
  "https://unpkg.com",
  "https://www.gstatic.com",
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com"
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isAllowedThirdParty = THIRD_PARTY_ORIGINS.has(url.origin);
  if (!isSameOrigin && !isAllowedThirdParty) return;

  if (isSameOrigin && event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("/index.html", copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match("/index.html"));
    })
  );
});
