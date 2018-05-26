var shareImageButton = document.querySelector("#share-image-button");
var createPostArea = document.querySelector("#create-post");
var closeCreatePostModalButton = document.querySelector(
  "#close-create-post-modal-btn"
);
var sharedMomentsArea = document.querySelector("#shared-moments");

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
      console.log(choiceResult.outcome);

      if (choiceResult.outcome === "dismissed") {
        console.log("User cancelled PWA installation");
      } else {
        console.log("User added PWA to Home Screen");
      }

      window.deferredPrompt = null;
    });
  }

  // Sample code for programatically wiping service workers
  // if ("serviceWorker" in navigator) {
  //   navigator.serviceWorker.getRegistrations().then(registrations => {
  //     console.log("Unregistering service workers");
  //     registrations.forEach(registration => registration.unregister());
  //   });
  // }
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
  console.log("creating card", card);
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
  // Disabled functionality for "Cache On Demand" where a user can save
  // certain dynamic items into the cache
  // Add a save button only if in a browser that supports the Caching API
  // if ("caches" in window) {
  //   const cardSaveButton = document.createElement("button");
  //   cardSaveButton.textContent = "Save";
  //   cardSaveButton.addEventListener("click", onSaveButtonClicked);
  //   cardSupportingText.appendChild(cardSaveButton);
  // }
  cardWrapper.appendChild(cardSupportingText);
  componentHandler.upgradeElement(cardWrapper);
  sharedMomentsArea.appendChild(cardWrapper);
}

// Currently not in use. Used to support the "Cache on Demand Strategy"
// function onSaveButtonClicked(evt) {
//   if ("caches" in window) {
//     caches.open("user-requested").then(cache => {
//       cache.addAll(["https://httpbin.org/get", "/src/images/sf-boat.jpg"]);
//     });
//   }
// }

function updateUI(cards) {
  cards.forEach(card => createCard(card));
}

const url = "https://pwagram-439bb.firebaseio.com/posts.json";
let networkDataReceived = false;
// Fetch from Web
fetch(url)
  .then(res => {
    if (res) {
      return res.json();
    }
  })
  .then(data => {
    networkDataReceived = true;
    console.log("From Web: ", data);
    // When we get this data, always blow away the data rendered from the cache, as this is more fresh
    clearCards();
    updateUI(Object.values(data));
  });

// Fetch from IndexedDB
if ("indexedDB" in window) {
  getItems("posts").then(posts => {
    if (!networkDataReceived) {
      console.log("From cache", posts);
      updateUI(posts);
    }
  });
}

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
