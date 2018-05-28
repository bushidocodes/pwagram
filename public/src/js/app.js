window.deferredPrompt;
const enableNotificationsButtons = document.querySelectorAll(
  ".enable-notifications"
);

/**
 * Displays a notification confirming that the user is successfully subscribed to Web Push
 */
function displayConfirmNotification() {
  const title = "Successfully subscribed";
  // Demo of the Notification options
  // Notification support is device-specific.
  // Put main content in title and body to maximize compatibility
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
      sw.showNotification(title, options);
    });
  } else {
    new Notification(title, options);
  }
}

/**
 * Registers a webpush subscription if one does not already exist
 * @returns void
 */
function configurePushSub() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  let sw; // share sw obj between links of promise chain
  navigator.serviceWorker.ready
    .then(swReg => {
      sw = swReg;
      return sw.pushManager.getSubscription();
    })
    .then(subs => {
      if (subs === null) {
        // Create new subscription
        const VAPID_PUBLIC_KEY =
          "BH1lo34DNnIy__lc7nzIMyDr2tBmGqqoRThEoRzoj2GehQ8Yg4_X2JvkHfX06Vbqxjys6I0fz2mGLu2nkC45S5o";
        const convertedVapidPublicKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        return sw.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidPublicKey
        });
      } else {
        return null; // We already have a subscription
      }
    })
    .then(newSub => {
      if (newSub) {
        return fetch(
          "https://pwagram-439bb.firebaseio.com/subscriptions.json",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify(newSub)
          }
        );
      }
    })
    .then((res = {}) => {
      if (res.ok) {
        displayConfirmNotification();
      }
    })
    .catch(err =>
      console.log(`[App] Error registering a web push subscription`, err)
    );
}

/**
 * Request permission from the user to use the Notification and Web Push APIs
 */
function askForNotificationPermission() {
  Notification.requestPermission(res => {
    if (res === "granted") {
      console.log("[App] User granted permissions for notifications. Yay!");
      // Hide all notification buttons
      enableNotificationsButtons.forEach(btn => {
        btn.style.display = "inline-block";
      });
      configurePushSub();
    } else {
      console.log(
        "[App] User did not grant permissions for notifications. Bummer!"
      );
    }
  });
}

// Register Service Worker if the browser supports it
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js")
    .then(() => console.log("[App] Service Worker Registered"))
    .catch(err => console.log("[App] Error registering Service Worker", err));

  // Save the install event to be able to defer the presentation of the install PWA prompt until the user shows intent to upload a photo
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    window.deferredPrompt = event;
    return false;
  });

  // Trigger sync-new-posts event to SW to upload any locally cached posts
  if ("SyncManager" in window) {
    console.log(`[App] Support for Background Sync Detected`);
    navigator.serviceWorker.ready
      .then(sw => sw.sync.register("sync-new-posts"))
      .then(() =>
        console.log(`[App] Registered sync-new-posts event with Service Worker`)
      )
      .catch(err =>
        console.log(
          `[App] Error Registering sync-new-posts event with Service Worker`,
          err
        )
      );
  }

  // Show the Enable Notification buttons if the browser supports notifications
  // and permission has not already been granted
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      console.log(
        "[App] User previously granted permissions for notifications"
      );
    } else if (Notification.permission === "denied") {
      console.log("[App] User previously denied permissions for notifications");
    } else {
      console.log(
        "[App] User hasn't yet been prompted for notifications, so showing Notifications Buttons"
      );
      enableNotificationsButtons.forEach(btn => {
        btn.style.display = "inline-block";
        btn.addEventListener("click", askForNotificationPermission);
      });
    }
  }
}
