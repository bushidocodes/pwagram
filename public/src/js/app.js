let deferredPrompt;

// Check for Service Worker Support
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then(() => {
    console.log("Service Worker Registered");
  });
}

// Save the install event to be able to defer the presentation of the install PWA prompt until the user shows intent to upload a photo
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredPrompt = event;
  return false;
});
