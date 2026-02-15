/* Store POS Service Worker - Cache app shell + static assets */
const CACHE_NAME = "store-pos-v1";
const STATIC_ASSETS = ["/", "/pos", "/login"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/")) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then(
        (response) => {
          const clone = response.clone();
          if (response.status === 200 && event.request.url.startsWith(self.location.origin)) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        },
        () => caches.match("/") || new Response("Offline")
      );
    })
  );
});
