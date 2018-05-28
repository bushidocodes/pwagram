const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const webpush = require("web-push");

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
        webpush.setVapidDetails(
          "mailto:bushidocodes@gmail.com",
          "BH1lo34DNnIy__lc7nzIMyDr2tBmGqqoRThEoRzoj2GehQ8Yg4_X2JvkHfX06Vbqxjys6I0fz2mGLu2nkC45S5o",
          functions.config().pwagram.vapidkey
        );
        return admin
          .database()
          .ref("subscriptions")
          .once("value");
      })
      .then(subs =>
        subs.forEach(sub =>
          webpush.sendNotification(
            {
              endpoint: sub.val().endpoint,
              keys: {
                auth: sub.val().keys.auth,
                p256dh: sub.val().keys.p256dh
              }
            },
            JSON.stringify({
              title: "New Post",
              content: "New Post Added!!!",
              openUrl: "/"
            })
          )
        )
      )
      .then(() => res.status(201).json({ message: "Data stored", id }))
      .catch(err => {
        console.log(err);
        return res.status(500).json({ err });
      });
  })
);
