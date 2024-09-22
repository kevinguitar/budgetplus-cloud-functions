import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {internalRecipientIds} from "./common";
import {firestore} from "firebase-admin";
import DocumentData = firestore.DocumentData;

export const pushNotificationSender = functions
    .firestore
    .onDocumentCreated("push_notifications/{push_id}", async (event) => {
      try {
        const snapshot = event.data;
        if (!snapshot) {
          console.log("No data associated with the event");
          return;
        }
        await sendPushNotification(snapshot.data());
      } catch (error) {
        console.log(error);
      }
    });

/**
 * Send general push notifications via topic.
 * @param {DocumentData} data The document created on Firestore.
 */
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
        if (data.titleCn != null) {
          await messaging.send({token: fcmToken, ...messageEN});
        }
        if (data.titleJa != null) {
          await messaging.send({token: fcmToken, ...messageJA});
        }
      }
    }
  } else {
    await messaging.send({topic: "general_tw", ...messageTW});
    if (data.titleCn != null) {
      await messaging.send({topic: "general_cn", ...messageCN});
    }
    if (data.titleEn != null) {
      await messaging.send({topic: "general_en", ...messageEN});
    }
    if (data.titleJa != null) {
      await messaging.send({topic: "general_ja", ...messageJA});
    }
  }
}
