const dbPromise = idb.open("posts-store", 1, db => {
  // create the posts table if it doesn't exist
  if (!db.objectStoreNames.contains("posts")) {
    db.createObjectStore("posts", { keyPath: "id" });
  }
});

function writeItem(storeName, item) {
  return dbPromise.then(db => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
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
