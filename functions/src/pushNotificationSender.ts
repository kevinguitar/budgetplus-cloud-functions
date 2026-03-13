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

  const messageTw = {
    data: {
      type: "general",
      title: data.titleTw,
      body: data.descTw,
      url: deeplink,
    },
  };

  const messageCn = {
    data: {
      type: "general",
      title: data.titleCn,
      body: data.descCn,
      url: deeplink,
    },
  };

  const messageEn = {
    data: {
      type: "general",
      title: data.titleEn,
      body: data.descEn,
      url: deeplink,
    },
  };

  const messageJa = {
    data: {
      type: "general",
      title: data.titleJa,
      body: data.descJa,
      url: deeplink,
    },
  };

  const messageKo = {
    data: {
      type: "general",
      title: data.titleKo,
      body: data.descKo,
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
        await messaging.send({token: fcmToken, ...messageTw});
        if (data.titleCn != null) {
          await messaging.send({token: fcmToken, ...messageEn});
        }
        if (data.titleJa != null) {
          await messaging.send({token: fcmToken, ...messageJa});
        }
        if (data.titleKo != null) {
          await messaging.send({token: fcmToken, ...messageKo});
        }
      }
    }
  } else {
    await messaging.send({topic: topicPrefix + "tw", ...messageTw});
    if (data.titleCn != null) {
      await messaging.send({topic: topicPrefix + "cn", ...messageCn});
    }
    if (data.titleEn != null) {
      await messaging.send({topic: topicPrefix + "en", ...messageEn});
    }
    if (data.titleJa != null) {
      await messaging.send({topic: topicPrefix + "ja", ...messageJa});
    }
    if (data.titleKo != null) {
      await messaging.send({topic: topicPrefix + "ko", ...messageKo});
    }
  }
}
