const dbPromise = idb.open("posts-store", 1, db => {
  // create the posts table if it doesn't exist
  if (!db.objectStoreNames.contains("posts")) {
    db.createObjectStore("posts", { keyPath: "id" });
  }
  // create an object store to cache outgoing post submissions
  if (!db.objectStoreNames.contains("sync-posts")) {
    db.createObjectStore("sync-posts", { keyPath: "id" });
  }
});

function writeItem(storeName, item) {
  // console.log(`Writing item to ${storeName}`, item);
  return dbPromise.then(db => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    console.log(item);
    store.put(item);
    return tx.complete;
  });
}
function getItems(storeName) {
  return dbPromise.then(db => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    return store.getAll();
  });
}

function getItem(storeName, id) {
  return dbPromise
    .then(db => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      return store.get(id);
    })
    .then(() => console.log(`Item ${id} deleted`));
}
function deleteItems(storeName) {
  return dbPromise.then(db => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.clear();
    return tx.complete;
  });
}

function deleteItem(storeName, id) {
  return dbPromise
    .then(db => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      store.delete(id);
      return tx.complete;
    })
    .then(() => console.log(`Item ${id} deleted`));
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function dataURItoBlob(dataURI) {
  var byteString = atob(dataURI.split(",")[1]);
  var mimeString = dataURI
    .split(",")[0]
    .split(":")[1]
    .split(";")[0];
  var ab = new ArrayBuffer(byteString.length);
  var ia = new Uint8Array(ab);
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  var blob = new Blob([ab], { type: mimeString });
  return blob;
}
