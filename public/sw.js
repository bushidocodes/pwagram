// Service Worker Lifecycle Events
self.addEventListener("install", event => {
  console.log("[Service Worker] Installing Service Worker ...", event);
  // When we install our service worker, we want to cache all of the static
  // assets needed to render our app shell
  event.waitUntil(
    caches.open("static").then(cache => {
      console.log("[Service Worker] Precaching App Shell to static...");
      cache.addAll([
        "/",
        "/help/",
        "/index.html",
        "/src/css/app.css",
        "/src/css/feed.css",
        "/src/css/help.css",
        "/src/images/main-image.jpg",
        "/manifest.json",
        "/src/js/app.js",
        "/src/js/feed.js",
        "/src/js/material.min.js",
        "https://fonts.googleapis.com/css?family=Roboto:400,700",
        "https://fonts.googleapis.com/icon?family=Material+Icons",
        "https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css"
      ]);
    })
  );
});

self.addEventListener("activate", event => {
  console.log("[Service Worker] Activating Service Worker ...", event);
  return self.clients.claim();
});

// Fetch Proxy
self.addEventListener("fetch", event => {
  // Intercept Fetch requests for the static content that comprises
  // our app shell and instead serve this out of the Cache
  event.respondWith(
    caches.match(event.request).then(cacheResponse => {
      // return the cached response if it exists, else fetch over the network
      // If cacheResponse is null, nothing in the caches matched the request,
      // so we fetch the response over the network, cache a clone of the result
      // for future requests, and return the result.
      // If cacheResponse is truthy, we return the response immediately
      if (!cacheResponse) {
        console.log("[Service Worker] Fetching...", event.request.url);
        return fetch(event.request).then(fetchResponse =>
          caches.open("dynamic").then(cache => {
            // responses can only be used once, so we need to use the response
            // object's clone method to cache the response without consuming it
            cache.put(event.request.url, fetchResponse.clone());
            return fetchResponse;
          })
        );
      } else {
        return cacheResponse;
      }
    })
  );
});
