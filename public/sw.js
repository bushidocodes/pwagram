// Service Worker Lifecycle Events
self.addEventListener("install", event => {
  console.log("[Service Worker] Installing Service Worker ...", event);
});

self.addEventListener("activate", event => {
  console.log("[Service Worker] Activating Service Worker ...", event);
  return self.clients.claim();
});

// Fetch Proxy
self.addEventListener("fetch", event => {
  // console.log("[Service Worker] Fetching...", event);
  event.respondWith(fetch(event.request));
});
