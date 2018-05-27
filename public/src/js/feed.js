var shareImageButton = document.querySelector("#share-image-button");
var createPostArea = document.querySelector("#create-post");
var closeCreatePostModalButton = document.querySelector(
  "#close-create-post-modal-btn"
);
var sharedMomentsArea = document.querySelector("#shared-moments");
var form = document.querySelector("form");
var titleInput = document.querySelector("#title");
var locationInput = document.querySelector("#location");

function openCreatePostModal() {
  createPostArea.style.transform = "translateY(0)";
  // createPostArea.style.transform = "translateY(0)";
  // We want to present the user the PWA installation prompt if
  // they demonstrate intent to upload a picture. This is only
  // possible if we've captured and deferred the prompt. We do
  // this by listening to the beforeinstallprompt event in app.js
  if (window.deferredPrompt) {
    window.deferredPrompt.prompt();
    window.deferredPrompt.userChoice.then(choiceResult => {
      if (choiceResult.outcome === "dismissed") {
        console.log("[App] User cancelled PWA installation");
      } else {
        console.log("[App] User added PWA to Home Screen");
      }

      window.deferredPrompt = null;
    });
  }
}

function closeCreatePostModal() {
  createPostArea.style.transform = "translateY(100vh)";
}

shareImageButton.addEventListener("click", openCreatePostModal);

closeCreatePostModalButton.addEventListener("click", closeCreatePostModal);

/**
 * Remove all of the cards from the shared moments area
 */
function clearCards() {
  while (sharedMomentsArea.hasChildNodes()) {
    sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
  }
}

function createCard(card) {
  var cardWrapper = document.createElement("div");
  cardWrapper.className = "shared-moment-card mdl-card mdl-shadow--2dp";
  var cardTitle = document.createElement("div");
  cardTitle.className = "mdl-card__title";
  cardTitle.style.backgroundImage = `url(${card.image})`;
  cardTitle.style.backgroundSize = "cover";
  cardTitle.style.backgroundRepeat = "no-repeat";
  cardTitle.style.backgroundColor = "black";
  cardTitle.style.backgroundPosition = "center";
  // cardTitle.style.height = "auto";
  cardWrapper.appendChild(cardTitle);
  var cardTitleTextElement = document.createElement("h2");
  cardTitleTextElement.className = "mdl-card__title-text";
  cardTitleTextElement.textContent = card.title;
  cardTitle.appendChild(cardTitleTextElement);
  var cardSupportingText = document.createElement("div");
  cardSupportingText.className = "mdl-card__supporting-text";
  cardSupportingText.textContent = card.location;
  cardSupportingText.style.textAlign = "center";
  cardWrapper.appendChild(cardSupportingText);
  componentHandler.upgradeElement(cardWrapper);
  sharedMomentsArea.appendChild(cardWrapper);
}

function updateUI(cards) {
  cards.forEach(card => createCard(card));
}

function loadDataAndUpdate() {
  const url = "https://pwagram-439bb.firebaseio.com/posts.json";
  console.log(
    `[App]: Updating Posts using Network with Cache Fallback Strategy`
  );
  let networkDataReceived = false;
  // Fetch from Web
  fetch(url)
    .then(res => {
      if (res.ok) {
        return res.json();
      }
    })
    .then(data => {
      networkDataReceived = true;
      console.log("[App] Successfully fetched posts from network ", data);
      // When we get this data, always blow away the data rendered from the cache, as this is more fresh
      clearCards();
      updateUI(Object.values(data));
    })
    .catch(err => {
      console.log(`[App] Failed to fetch posts from network`);
    });

  // Fetch from IndexedDB
  if ("indexedDB" in window) {
    getItems("posts").then(posts => {
      if (!networkDataReceived) {
        console.log("[App] Successfully fetched posts from IDB");
        updateUI(posts);
      }
    });
  }
}

loadDataAndUpdate();

// Fetch from Cache
// if ("caches" in window) {
//   caches
//     .match(url)
//     .then(res => {
//       if (res) {
//         return res.json();
//       }
//     })
//     .then(data => {
//       console.log("From Cache ", data);
//       // If we've already received a response from the network, it's more current than this cached data, so don't do anything
//       if (!networkDataReceived && data) {
//         clearCards();
//         updateUI(Object.values(data));
//       }
//     });
// }

// fetch("https://httpbin.org/get")
//   .then(res => res.json())
//   .then(data => createCard());

function sendData() {
  const reqBody = {
    id: new Date().toISOString,
    title: titleInput.value,
    location: locationInput.value,
    image:
      "https://firebasestorage.googleapis.com/v0/b/pwagram-439bb.appspot.com/o/18881854_10100539690981860_7876229254760009149_n.jpg?alt=media&token=a49cd401-bd51-4123-80c8-c2536c657944"
  };
  console.log(`[App] Submitting post data`, reqBody);
  return fetch(
    "https://us-central1-pwagram-439bb.cloudfunctions.net/storePostData",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(reqBody)
    }
  )
    .then(res => {
      console.log(`[App] Successfully submitted post data`, res);
      loadDataAndUpdate();
    })
    .catch(err => {
      console.log(`[App] Failed to submit post data`, res);
    });
}

form.addEventListener("submit", evt => {
  evt.preventDefault();
  // exit if the fields are empty
  if (titleInput.value.trim() === "" || locationInput.value.trim() === "") {
    alert("Please enter valid data!");
    return;
  }
  closeCreatePostModal();

  if ("serviceWorker" in navigator && "SyncManager" in window) {
    console.log(`[App] Support for Background Sync Detected`);
    navigator.serviceWorker.ready
      .then(sw => {
        const post = {
          id: new Date().toISOString(),
          title: titleInput.value,
          location: locationInput.value
        };
        writeItem("sync-posts", post)
          .then(() => {
            console.log(`[App] Persisted Post to IDB`);
            return sw.sync.register("sync-new-posts");
          })
          .then(() => {
            console.log(
              `[App] Registered sync-new-posts event with Service Worker`
            );
            const snackbarContainer = document.querySelector(
              "#confirmation-toast"
            );
            const data = { message: "Your Post was saved for syncing!" };
            snackbarContainer.MaterialSnackbar.showSnackbar(data);
          })
          .catch(err =>
            console.log(
              `[App] Failed to register a sync-new-posts event with the service worker`,
              err
            )
          );
      })
      .then(() => {
        titleInput.value = "";
        locationInput.value = "";
        // setTimeout(() => loadDataAndUpdate(), 1000);
      });
  } else {
    sendData().then(() => {
      titleInput.value = "";
      locationInput.value = "";
    });
    // Fallback if SyncManager isn't supported
  }
});

if ("serviceWorker" in navigator) {
  // Handler for messages coming from the service worker
  navigator.serviceWorker.addEventListener("message", event => {
    console.log("[App] Received Message from SW: " + event.data);
    event.ports[0].postMessage("ACK");
    if (event.data === "refresh") {
      console.log("[App] Instructed to Refresh Cards: " + event.data);
      loadDataAndUpdate();
    }
  });
}
