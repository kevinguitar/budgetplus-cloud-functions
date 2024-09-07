import * as admin from "firebase-admin";
import {baseFunctions, internalRecipientIds, serviceAccount} from "./common";
import {firestore} from "firebase-admin";
import DocumentData = firestore.DocumentData;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const pushNotificationSender = baseFunctions
    .firestore
    .document("push_notifications/{push_id}")
    .onCreate(async (change) => {
      try {
        await sendPushNotification(change.data());
      } catch (error) {
        console.log(error);
      }
    });

// eslint-disable-next-line require-jsdoc
async function sendPushNotification(
    data: DocumentData
) {
  const isInternal = data.internal;
  const deeplink = data.deeplink;
  const messaging = admin.messaging();

  const messageTW = {
    data: {
      type: "general",
      title: data.titleTw,
      body: data.descTw,
      url: deeplink,
    },
  };

  const messageCN = {
    data: {
      type: "general",
      title: data.titleCn,
      body: data.descCn,
      url: deeplink,
    },
  };

  const messageEN = {
    data: {
      type: "general",
      title: data.titleEn,
      body: data.descEn,
      url: deeplink,
    },
  };

  const messageJA = {
    data: {
      type: "general",
      title: data.titleJa,
      body: data.descJa,
      url: deeplink,
    },
  };

  if (isInternal) {
    for (const recipientId of internalRecipientIds) {
      const recipient = await admin
          .firestore()
          .doc("users/" + recipientId)
          .get();
      const fcmToken = recipient.get("fcmToken");

      if (fcmToken != null) {
        await messaging.send({token: fcmToken, ...messageTW});
        await messaging.send({token: fcmToken, ...messageEN});
        await messaging.send({token: fcmToken, ...messageJA});
      }
    }
  } else {
    await messaging.send({topic: "general_tw", ...messageTW});
    await messaging.send({topic: "general_cn", ...messageCN});
    await messaging.send({topic: "general_en", ...messageEN});
    await messaging.send({topic: "general_ja", ...messageJA});
  }
}
