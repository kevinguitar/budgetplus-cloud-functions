import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {initializeApp} from "../common";

initializeApp();

export const topicSubscriber = functions.https.onRequest(async (req, resp) => {
  try {
    const allUsersPromise = admin.firestore()
        .collection("users")
        .get();

    const allUsers = await allUsersPromise;

    const promises = allUsers.docs
        .filter(function(doc) {
          return doc.get("fcmToken") != null;
        })
        .flatMap((user) => {
          const fcmToken = user.get("fcmToken");
          const language = user.get("language");

          let topic;
          switch (language) {
            case "zh-tw": {
              topic = "general_tw";
              break;
            }
            case "zh-cn": {
              topic = "general_cn";
              break;
            }
            default: {
              topic = "general_en";
              break;
            }
          }

          return admin.messaging().subscribeToTopic(fcmToken, topic);
        });

    await Promise.all(promises);

    resp.json("Done! Successfully subscribe for " + promises.length + " users.");
  } catch (error) {
    console.log(error);
    resp.status(500).send(error);
  }
});
