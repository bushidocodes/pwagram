const shareImageButton = document.querySelector("#share-image-button");
const createPostArea = document.querySelector("#create-post");
const closeCreatePostModalButton = document.querySelector(
  "#close-create-post-modal-btn"
);
const sharedMomentsArea = document.querySelector("#shared-moments");
const form = document.querySelector("form");
const titleInput = document.querySelector("#title");
const locationInput = document.querySelector("#location");

/**
 * Slides the Create Post form up from below the viewport
 * Triggers the PWA Installation prompt if cached because this shows user intent
 */
function openCreatePostModal() {
  createPostArea.style.transform = "translateY(0)";
  // We want to present the user the PWA installation prompt if they demonstrate intent to upload a picture.
  // This is only possible if we've captured and deferred the prompt.
  // We do this by listening to the beforeinstallprompt event in app.js
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
shareImageButton.addEventListener("click", openCreatePostModal);

/**
 * Slides the Create Post form below the viewport
 */
function closeCreatePostModal() {
  createPostArea.style.transform = "translateY(100vh)";
}
closeCreatePostModalButton.addEventListener("click", closeCreatePostModal);

/**
 * Remove all of the cards from the shared moments area
 */
function clearCards() {
  while (sharedMomentsArea.hasChildNodes()) {
    sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
  }
}

/**
 * Given an object representing a post, assembles a card for that post and appends to the shared moments area
 *
 * @param {any} card
 */
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

/**
 * Given an array of posts, create cards for each post and append all cards to the shared moments area
 *
 * @param {any} cards
 */
function createCards(cards) {
  cards.forEach(card => createCard(card));
}

/**
 * Fetches posts from the network or IDB depending on network conditions and refreshes the sharedMoments area
 */
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
      createCards(Object.values(data));
    })
    .catch(err => {
      console.log(`[App] Failed to fetch posts from network`);
    });

  // Fetch from IndexedDB
  if ("indexedDB" in window) {
    getItems("posts").then(posts => {
      if (!networkDataReceived) {
        console.log("[App] Successfully fetched posts from IDB");
        clearCards();
        createCards(posts);
      }
    });
  }
}

loadDataAndUpdate();

/**
 * Builds a post from the create post form and submits to the server.
 * This is used as a fallback in browsers that don't support service worker and Sync Manager
 * @returns
 */
function submitPost(post) {
  console.log(`[App] Submitting post data`, post);
  return fetch(
    "https://us-central1-pwagram-439bb.cloudfunctions.net/storePostData",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(post)
    }
  )
    .then(res => {
      console.log(`[App] Successfully submitted post data`, res);
      // After a second refresh the shared moments area
      setTimeout(() => loadDataAndUpdate(), 1000);
    })
    .catch(err => {
      console.log(`[App] Failed to submit post data`, res);
    });
}

/**
 * Submit post via Sync Manager if supported to enable offline caching
 */
function submitPostViaSyncManager(post) {
  return navigator.serviceWorker.ready.then(sw => {
    writeItem("sync-posts", post)
      .then(() => {
        console.log(`[App] Persisted Post to IDB`);
        return sw.sync.register("sync-new-posts");
      })
      .then(() => {
        console.log(
          `[App] Registered sync-new-posts event with Service Worker`
        );
        const snackbarContainer = document.querySelector("#confirmation-toast");
        const data = { message: "Your Post was saved for syncing!" };
        snackbarContainer.MaterialSnackbar.showSnackbar(data);
      })
      .catch(err =>
        console.log(
          `[App] Failed to register a sync-new-posts event with the service worker`,
          err
        )
      );
  });
}

function buildPostFromForm() {
  return {
    id: new Date().toISOString(),
    title: titleInput.value,
    location: locationInput.value,
    image:
      "https://firebasestorage.googleapis.com/v0/b/pwagram-439bb.appspot.com/o/18881854_10100539690981860_7876229254760009149_n.jpg?alt=media&token=a49cd401-bd51-4123-80c8-c2536c657944"
  };
}

function clearPostForm() {
  titleInput.value = "";
  locationInput.value = "";
}

form.addEventListener("submit", evt => {
  evt.preventDefault();
  // Validate Post Form
  if (titleInput.value.trim() === "" || locationInput.value.trim() === "") {
    alert("Please enter valid data!");
    return;
  }
  closeCreatePostModal();
  const post = buildPostFromForm();

  if ("serviceWorker" in navigator && "SyncManager" in window) {
    console.log(`[App] Support for Background Sync Detected`);
    submitPostViaSyncManager(post).then(() => clearPostForm());
  } else {
    console.log(
      `[App] Browser does not support Background Sync. Executing fallback`
    );
    submitPost(post).then(() => clearPostForm());
  }
});

if ("serviceWorker" in navigator) {
  // Handler for messages coming from the service worker
  navigator.serviceWorker.addEventListener("message", event => {
    console.log("[App] Received Message from SW: " + event.data);
    // This is not really used, but this shows how to send an immediate response using the second channel
    event.ports[0].postMessage("ACK");
    switch (event.data) {
      // Allows the service worker to tell the client to refresh the shared moments area if new posts are available
      case "refresh":
        console.log("[App] Instructed to Refresh Cards: " + event.data);
        loadDataAndUpdate();
        break;
    }
  });
}
