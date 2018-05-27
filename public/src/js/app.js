let deferredPrompt;
const enableNotificationsButtons = document.querySelectorAll(
  ".enable-notifications"
);

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

// Notification support is device-specific. Put main content in title and body to maximize compatibility
function displayConfirmNotification() {
  const title = "Successfully subscribed";
  const options = {
    body: "Awesome!",
    icon: "/src/images/icons/app-icon-96x96.png",
    image: "/src/images/sf-boat.jpg",
    dir: "ltr",
    lang: "en-US", // BCP 47 lang code
    vibrate: [100, 50, 200], // 100ms vibrate, 50ms pause, 200ms vibrate
    badge: "/src/images/icons/app-icon-96x96.png",
    tag: "confirm-notification", // this allows notifications of the same time to stack
    renotify: true, // Should new notifications of the same tag trigger notifications / vibrations? Used to avoid spamming user
    actions: [
      {
        action: "confirm",
        title: "Okay",
        icon: "/src/images/icons/app-icon-96x96.png"
      },
      {
        action: "cancel",
        title: "Cancel",
        icon: "/src/images/icons/app-icon-96x96.png"
      }
    ]
  };
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then(sw => {
      sw.showNotification(`${title} - SW`, options);
    });
  } else {
    new Notification(title, options);
  }
}

function configurePushSub() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.ready.then(sw => {
    sw.pushManager.getSubscription().then(subs => {
      if (!subs) {
        sw.pushManager.subscribe();
        // Create new subscription
      } else {
        // We already have a subscription
      }
    });
  });
}

// Request permission for the Notification and Push APIs
function askForNotificationPermission() {
  Notification.requestPermission(res => {
    console.log(res);
    if (res !== "granted") {
      console.log("No notification permission granted!");
    } else {
      // Hide all notification buttons
      enableNotificationsButtons.forEach(btn => {
        btn.style.display = "inline-block";
      });
      displayConfirmNotification();
    }
  });
}

if ("serviceWorker" in navigator && "Notification" in window) {
  enableNotificationsButtons.forEach(btn => {
    console.log(btn);
    btn.style.display = "inline-block";
    btn.addEventListener("click", askForNotificationPermission);
  });
}
