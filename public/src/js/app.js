let deferredPrompt;

// Check for Service Worker Support
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then(() => {
    console.log("[App] Service Worker Registered");
  });
}
if ("serviceWorker" in navigator && "SyncManager" in window) {
  console.log(`[App] Support for Background Sync Detected`);
  navigator.serviceWorker.ready
    .then(sw => sw.sync.register("sync-new-posts"))
    .then(() => {
      console.log(`[App] Registered sync-new-posts event with Service Worker`);
    });
}
// Save the install event to be able to defer the presentation of the install PWA prompt until the user shows intent to upload a photo
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredPrompt = event;
  return false;
});
