importScripts("/src/js/idb.js");
importScripts("/src/js/utils.js");

const SW_VERSION = 13;

// We use our static cache to store our App Shell
const STATIC_CACHE_NAME = `static-v${SW_VERSION}`;
const STATIC_FILES = [
  "/",
  // "/help/",
  "/index.html",
  "/fallback.html",
  "/src/css/app.css",
  "/src/css/feed.css",
  "/src/css/help.css",
  "/src/images/main-image.jpg",
  "/manifest.json",
  "/src/js/idb.js",
  "/src/js/app.js",
  "/src/js/feed.js",
  "/src/js/material.min.js",
  "https://fonts.googleapis.com/css?family=Roboto:400,700",
  "https://fonts.googleapis.com/icon?family=Material+Icons",
  "https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css"
];

// We use our dynamic cache to cache requests that are not included in our app shell
const DYNAMIC_CACHE_NAME = `dynamic-v${SW_VERSION}`;
// This can be trimmed to a fixed number of items
// const DYNAMIC_CACHE_MAX_ITEMS = 3;

/**
 * Function to trim a Cache down to maxItems number of items
 *
 * @param {any} cacheName
 * @param {any} maxItems
 */
// function trimCache(cacheName, maxItems) {
//   caches.open(cacheName).then(cache => {
//     cache.keys().then(keys => {
//       console.log("trimming", keys.length, maxItems);
//       if (keys.length > maxItems) {
//         // Recurse until keys.length < maxItems
//         cache.delete(keys[0]).then(trimCache(cacheName, maxItems));
//       }
//     });
//   });
// }

// Service Worker Lifecycle Events
self.addEventListener("install", event => {
  console.log(`[Service Worker v${SW_VERSION}] Installing...`, event);
  // When we install our service worker, we want to cache all of the static
  // assets needed to render our app shell
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(cache => {
      console.log(
        `[Service Worker v${SW_VERSION}] Precaching App Shell to ${STATIC_CACHE_NAME}...`
      );
      cache.addAll(STATIC_FILES);
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
//             caches.open(DYNAMIC_CACHE_NAME).then(cache => {
//               // responses can only be used once, so we need to use the response
//               // object's clone method to cache the response without consuming it
//               cache.put(event.request.url, fetchResponse.clone());
//               return fetchResponse;
//             })
//           )
//           .catch(err => {
//             return caches
//               .open(STATIC_CACHE_NAME)
//               .then(cache => cache.match("/fallback.html"));
//           });
//       } else {
//         return cacheResponse;
//       }
//     })
//   );
// });

function isInArray(string, array) {
  var cachePath;
  if (string.indexOf(self.origin) === 0) {
    // request targets domain where we serve the page from (i.e. NOT a CDN)
    console.log("matched ", string);
    cachePath = string.substring(self.origin.length); // take the part of the URL AFTER the domain (e.g. after localhost:8080)
  } else {
    cachePath = string; // store the full request (for CDNs)
  }
  return array.indexOf(cachePath) > -1;
}

// Conditional Cache than Network Strategy.
// This serves the app shell out of the cache without triggering a network call
// However, for dynamic data, the app accesses the cache and the network directly
// and the SW alwasy gets the freshest data from the server and both caches it and
// returns it so the app loads more quickly next time.
self.addEventListener("fetch", event => {
  const url = "https://pwagram-439bb.firebaseio.com/posts.json";

  if (isInArray(url, event.request.url)) {
    // Intercept requests for JSON from the endpoint stored at URL
    event.respondWith(
      fetch(event.request).then(res => {
        const cloneRes = res.clone();
        deleteItems("posts").then(() =>
          cloneRes.json().then(resAsJSON => {
            Object.values(resAsJSON).forEach(item => {
              writeItem("posts", item).then(() => deleteItem("posts", item.id));
            });
          })
        );
        return res;
      })
    );
  } else if (STATIC_FILES.includes(event.request.url)) {
    // The content we described in our STATIC_FILES is just directly served out of the cache without a network fallback because this should always be setup properly when the service worker activates
    event.respondWith(caches.match(event.request));
  } else {
    event.respondWith(
      caches.match(event.request).then(cacheResponse => {
        // return the cached response if it exists, else fetch over the network
        // If cacheResponse is null, nothing in the caches matched the request,
        // so we fetch the response over the network, cache a clone of the result
        // for future requests, and return the result.
        // If cacheResponse is truthy, we return the response immediately
        if (!cacheResponse) {
          console.log(
            `[Service Worker v${SW_VERSION}] Fetching...`,
            event.request.url
          );
          return fetch(event.request)
            .then(fetchResponse =>
              caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                // responses can only be used once, so we need to use the response
                // object's clone method to cache the response without consuming it
                // trimCache(DYNAMIC_CACHE_NAME, DYNAMIC_CACHE_MAX_ITEMS);
                cache.put(event.request.url, fetchResponse.clone());
                return fetchResponse;
              })
            )
            .catch(err => {
              return caches.open(STATIC_CACHE_NAME).then(cache => {
                // if requesting HTML but not available, return fallback html
                if (event.request.headers.get("accept").includes("text/html")) {
                  return cache.match("/fallback.html");
                }
                // TODO: Apply this technique for fallback images!
              });
            });
        } else {
          return cacheResponse;
        }
      })
    );
  }
});

// network than cache strategy. This isn't very user friendly because network requests
// can take a long time to time out
// self.addEventListener("fetch", event => {
//   event.respondWith(
//     fetch(event.request)
//       .then(async fetchResponse => {
//         await caches.open(DYNAMIC_CACHE_NAME).then(cache => {
//           // responses can only be used once, so we need to use the response
//           // object's clone method to cache the response without consuming it
//           cache.put(event.request.url, fetchResponse.clone());
//         });
//         return fetchResponse;
//       })
//       .catch(err => {
//         return caches.match(event.request).catch(err => {
//           return caches
//             .open(STATIC_CACHE_NAME)
//             .then(cache => cache.match("/fallback.html"));
//         });
//       })
//   );
// });
