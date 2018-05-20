const SW_VERSION = "3";
const CACHE_STATIC_NAME = `static-v${SW_VERSION}`;
const CACHE_DYNAMIC_NAME = `dynamic-v${SW_VERSION}`;

// Service Worker Lifecycle Events
self.addEventListener("install", event => {
  console.log(`[Service Worker v${SW_VERSION}] Installing...`, event);
  // When we install our service worker, we want to cache all of the static
  // assets needed to render our app shell
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then(cache => {
      console.log(
        `[Service Worker v${SW_VERSION}] Precaching App Shell to ${CACHE_STATIC_NAME}...`
      );
      cache.addAll([
        "/",
        "/help/",
        "/index.html",
        "/fallback.html",
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
  console.log(`[Service Worker v${SW_VERSION}] Activating...`, event);
  // Prune all caches that are not appended with the appropriate SW version
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (!key.includes(`-v${SW_VERSION}`)) {
            console.log(
              `[Service Worker v${SW_VERSION}] Removing old cache ${key}`
            );
            return caches.delete(key);
          } else {
            // Otherwise just immediately resolve so that Promise.all receives a Promise
            return Promise.resolve();
          }
        })
      )
    )
  );
  return self.clients.claim();
});

// Fetch Proxy using Cache with Network Fallback Strategy
// self.addEventListener("fetch", event => {
//   // Intercept Fetch requests for the static content that comprises
//   // our app shell and instead serve this out of the Cache
//   event.respondWith(
//     caches.match(event.request).then(cacheResponse => {
//       // return the cached response if it exists, else fetch over the network
//       // If cacheResponse is null, nothing in the caches matched the request,
//       // so we fetch the response over the network, cache a clone of the result
//       // for future requests, and return the result.
//       // If cacheResponse is truthy, we return the response immediately
//       if (!cacheResponse) {
//         console.log(
//           `[Service Worker v${SW_VERSION}] Fetching...`,
//           event.request.url
//         );
//         return fetch(event.request)
//           .then(fetchResponse =>
//             caches.open(CACHE_DYNAMIC_NAME).then(cache => {
//               // responses can only be used once, so we need to use the response
//               // object's clone method to cache the response without consuming it
//               cache.put(event.request.url, fetchResponse.clone());
//               return fetchResponse;
//             })
//           )
//           .catch(err => {
//             return caches
//               .open(CACHE_STATIC_NAME)
//               .then(cache => cache.match("/fallback.html"));
//           });
//       } else {
//         return cacheResponse;
//       }
//     })
//   );
// });

// network than cache strategy. This isn't very user friendly because network requests
// can take a long time to time out
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(async fetchResponse => {
        await caches.open(CACHE_DYNAMIC_NAME).then(cache => {
          // responses can only be used once, so we need to use the response
          // object's clone method to cache the response without consuming it
          cache.put(event.request.url, fetchResponse.clone());
        });
        return fetchResponse;
      })
      .catch(err => {
        return caches.match(event.request).catch(err => {
          return caches
            .open(CACHE_STATIC_NAME)
            .then(cache => cache.match("/fallback.html"));
        });
      })
  );
});
