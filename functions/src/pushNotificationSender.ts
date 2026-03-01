import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {initializeApp, internalRecipientIds} from "./common";
import {firestore} from "firebase-admin";
import DocumentData = firestore.DocumentData;

initializeApp();

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
 * Send general push notifications via topics.
 * @param {DocumentData} data The document created on Firestore.
 */
async function sendPushNotification(
    data: DocumentData
) {
  const isInternal = data.internal;
  const targetAudience = data.targetAudience;
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

  let topicPrefix = "general_";
  if (targetAudience === "FreeUsers") {
    topicPrefix = "free_user_";
  } else if (targetAudience === "PaidUsers") {
    topicPrefix = "paid_user_";
  }

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
    await messaging.send({topic: topicPrefix + "tw", ...messageTW});
    if (data.titleCn != null) {
      await messaging.send({topic: topicPrefix + "cn", ...messageCN});
    }
    if (data.titleEn != null) {
      await messaging.send({topic: topicPrefix + "en", ...messageEN});
    }
    if (data.titleJa != null) {
      await messaging.send({topic: topicPrefix + "ja", ...messageJA});
    }
  }
}
