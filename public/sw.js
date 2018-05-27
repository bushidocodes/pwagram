importScripts("/src/js/idb.js");
importScripts("/src/js/utils.js");

const SW_VERSION = 42;

// We use our static cache to store our App Shell
const STATIC_CACHE_NAME = `static-v${SW_VERSION}`;
const STATIC_FILES = [
  "/",
  "/help/",
  "/index.html",
  "/fallback.html",
  "/src/css/app.css",
  "/src/css/feed.css",
  "/src/css/help.css",
  "/src/images/main-image.jpg",
  "/src/images/failwhale.jpg",
  "/manifest.json",
  "/src/js/idb.js",
  "/src/js/app.js",
  "/src/js/feed.js",
  "/src/js/utils.js",
  "/src/js/material.min.js",
  "https://fonts.googleapis.com/css?family=Roboto:400,700",
  "https://fonts.googleapis.com/icon?family=Material+Icons",
  "https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css"
];

const POSTS_URL = "https://pwagram-439bb.firebaseio.com/posts.json";
const UPLOAD_POSTS_URL =
  "https://us-central1-pwagram-439bb.cloudfunctions.net/storePostData";

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
function trimCache(cacheName, maxItems) {
  caches.open(cacheName).then(cache => {
    cache.keys().then(keys => {
      console.log(
        `[Service Worker v${SW_VERSION}] trimming ${cacheName}`,
        keys.length,
        maxItems
      );
      if (keys.length > maxItems) {
        // Recurse until keys.length < maxItems
        cache.delete(keys[0]).then(trimCache(cacheName, maxItems));
      }
    });
  });
}

// Service Worker Lifecycle Events
// When we install our sw, we cache the static assets of our app shell
self.addEventListener("install", event => {
  console.log(`[Service Worker v${SW_VERSION}] Installing...`);
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(cache => {
      console.log(`[Service Worker v${SW_VERSION}] Precaching App Shell`);
      cache.addAll(STATIC_FILES);
    })
  );
});

// Once our new SW activates, cleanup the caches of the old version
self.addEventListener("activate", event => {
  console.log(`[Service Worker v${SW_VERSION}] Activating...`);
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
            return Promise.resolve();
          }
        })
      )
    )
  );
  return self.clients.claim();
});

function isInArray(string, array) {
  var cachePath;
  // request targets the local domain, so match on the path
  if (string.indexOf(self.origin) === 0) {
    cachePath = string.substring(self.origin.length);
  }
  // requests target a CDN, so match on the full URL
  else {
    cachePath = string;
  }
  return array.indexOf(cachePath) > -1;
}

// Conditional Cache then Network Strategy.
// This serves the app shell out of the cache without triggering a network call
// However, for dynamic data, the app accesses the cache and the network directly
// and the SW always gets the freshest data from the server and both caches it and
// returns it so the app loads more quickly next time.
self.addEventListener("fetch", event => {
  if (event.request.url === POSTS_URL) {
    console.log(
      `[Service Worker v${SW_VERSION}] Executing Cache then Network Strategy for Posts Endpoint...`,
      event
    );
    // Intercept requests for JSON from the endpoint stored at URL
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const cloneRes = res.clone();
          if (cloneRes.ok) {
            deleteItems("posts").then(() =>
              cloneRes.json().then(resAsJSON =>
                Object.values(resAsJSON).forEach(item => {
                  writeItem("posts", item);
                })
              )
            );
          }
          return res;
        })
        .catch(err => {
          console.log(
            `[Service Worker v${SW_VERSION}] failed to fetch ${
              event.request.url
            }`,
            err
          );
          return Promise.reject(err);
        })
    );
  } else if (isInArray(event.request.url, STATIC_FILES)) {
    // The content we described in our STATIC_FILES is just directly served out of the cache without a network fallback because this should always be setup properly when the service worker activates
    console.log(
      `[Service Worker v${SW_VERSION}] Static Cache Hit ${event.request.url}`
    );
    event.respondWith(caches.match(event.request));
  } else {
    // return the cached response if it exists, else fetch over the network
    // If cacheResponse is null, nothing in the caches matched the request,
    // so we fetch the response over the network, cache a clone of the result
    // for future requests, and return the result.
    // If cacheResponse is truthy, we return the response immediately
    event.respondWith(
      caches.match(event.request).then(cacheResponse => {
        if (!cacheResponse) {
          console.log(
            `[Service Worker v${SW_VERSION}] Dynamic Cache Miss ${
              event.request.url
            }`
          );
          return fetch(event.request)
            .then(fetchResponse => {
              // We only cache successful responses to avoid breaking the app
              // However, we have a special case with image files that are served
              // from endpoints that disallow CORS. For those sorts of resources,
              // we are unable to see the actual response type, but we can still
              // cache and return the response to an <img src={}/> tag as the DOM
              // isn't subject to CORS
              // See https://jakearchibald.com/2015/thats-so-fetch/
              if (fetchResponse.ok || fetchResponse.type === "opaque") {
                return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                  console.log(
                    `[Service Worker v${SW_VERSION}] Successfully fetched and cached ${
                      event.request.url
                    }`
                  );
                  // responses can only be used once, so we need to use the response
                  // object's clone method to cache the response without consuming it
                  // If we wanted to trim our dynamic cache, this would be a place to do it
                  // trimCache(DYNAMIC_CACHE_NAME, DYNAMIC_CACHE_MAX_ITEMS);
                  cache.put(event.request.url, fetchResponse.clone());
                  return fetchResponse;
                });
              } else {
                console.log(
                  `[Service Worker v${SW_VERSION}] Failed to fetch ${
                    event.request.url
                  }`,
                  fetchResponse
                );
              }
            })
            .catch(err => {
              console.log(
                `[Service Worker v${SW_VERSION}] Failed to fetch ${
                  event.request.url
                }`
              );
              return caches.open(STATIC_CACHE_NAME).then(cache => {
                // if requesting HTML but not available, return fallback html
                if (event.request.headers.get("accept").includes("text/html")) {
                  console.log(
                    `[Service Worker v${SW_VERSION}] Serving Fallback HTML${
                      event.request.url
                    }`
                  );
                  return cache.match("/fallback.html");
                }
                // if requesting an image that is not available, return failwhale
                if (event.request.headers.get("accept").includes("image/")) {
                  console.log(
                    `[Service Worker v${SW_VERSION}] Serving Fallback Failwhale${
                      event.request.url
                    }`
                  );
                  return cache.match("/src/images/failwhale.jpg");
                }
              });
            });
        } else {
          console.log(
            `[Service Worker v${SW_VERSION}] Dynamic Cache Hit ${
              event.request.url
            }`
          );
          return cacheResponse;
        }
      })
    );
  }
});

function send_message_to_client(client, msg) {
  return new Promise((resolve, reject) => {
    var msg_chan = new MessageChannel();

    msg_chan.port1.onmessage = function(event) {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };

    // Pass a message with a response channel
    client.postMessage(msg, [msg_chan.port2]);
  });
}

function send_message_to_all_clients(msg) {
  clients.matchAll().then(clients => {
    clients.forEach(client => {
      send_message_to_client(client, msg).then(m =>
        console.log(
          "[Service Worker v${SW_VERSION}]: Received message from client " + m
        )
      );
    });
  });
}

self.addEventListener("sync", function(event) {
  console.log("[Service Worker] Background syncing");
  switch (event.tag) {
    case "sync-new-posts":
      return event.waitUntil(
        getItems("sync-posts").then(posts => {
          console.log("[Service Worker] Syncing new Posts", posts);
          const arrOfPromises = posts.map(post =>
            fetch(UPLOAD_POSTS_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
              },
              body: JSON.stringify({
                id: post.id,
                title: post.title,
                location: post.location,
                image:
                  "https://firebasestorage.googleapis.com/v0/b/pwagram-439bb.appspot.com/o/18881854_10100539690981860_7876229254760009149_n.jpg?alt=media&token=a49cd401-bd51-4123-80c8-c2536c657944"
              })
            })
              .then(res => {
                if (res.ok) {
                  console.log(`[Service Worker] Synced post with server`, post);
                  return res
                    .json()
                    .then(resData => deleteItem("sync-posts", resData.id));
                } else {
                  console.log(
                    `[Service Worker] Error syncing post ${post.id}`,
                    res
                  );
                  return Promise.reject(res.statusText);
                }
              })
              .catch(err => {
                console.log(
                  `[Service Worker] Error syncing post ${post.id}`,
                  err
                );
                return Promise.reject(err);
              })
          );
          return Promise.all(arrOfPromises)
            .then(res => {
              console.log(
                `[Service Worker] Successfully synced all posts to server`
              );
              send_message_to_all_clients("refresh");
              return Promise.resolve(res);
            })
            .catch(err => {
              console.log(
                `[Service Worker] Failed to sync all posts to server`,
                err
              );
              return Promise.reject(err);
            });
        })
      );
      break;
    default:
      console.log(
        `[Service Worker] Error: ${event.tag} is an unknown sync tag`
      );
  }
});

self.addEventListener("notificationclick", event => {
  const { notification, action } = event;
  console.log(
    `[Service Worker] User clicked${
      action ? `${action} in` : ""
    } notification ${notification.tag}`
  );
  if (action === "confirm") {
  } else {
    // console.log(`[Service Worker] User selected ${action} in a notification`);
  }
  notification.close();
});

// This doesn't seem to be supported by Chome on Mac
self.addEventListener("notificationclose", event => {
  const { notification, action } = event;
  console.log(`[Service Worker] User closed notification ${notification.tag}`);
});
