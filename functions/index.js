const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
admin.initializeApp({ databaseURL: "https://pwagram-439bb.firebaseio.com/" });

exports.storePostData = functions.https.onRequest((req, res) =>
  cors(req, res, () => {
    const { id, title, location, image } = req.body;

    admin
      .database()
      .ref("posts")
      .push({
        id,
        title,
        location,
        image
      })
      .then(() => {
        return res.status(201).json({ message: "Data stored", id });
      })
      .catch(error => res.status(500).json({ error }));
  })
);
