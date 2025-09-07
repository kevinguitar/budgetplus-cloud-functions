import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

/* eslint-disable */
const serviceAccount = require("../service-account.json");

export function initializeApp(): void {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  functions.setGlobalOptions({region: "asia-southeast1"});
}

export const internalRecipientIds = [
  "wStzA9aMwHd0pOGwyT0woBrf05q2",
  "BfvTnZPuUTS6oBH1UwZ8uZIllWs2",
];

export async function sendNotificationToInternalRecipients(
    title: string,
    body: string,
    smallImageUrl: string
): Promise<void> {
  for (const recipientId of internalRecipientIds) {
    const recipient = await admin.firestore().doc("users/" + recipientId).get();
    const fcmToken = recipient.get("fcmToken");
    const messagePayload = {
      token: fcmToken,
      data: {
        type: "general",
        title: title,
        body: body,
        smallImageUrl: smallImageUrl,
      },
    };

    if (fcmToken != null) {
      await admin.messaging().send(messagePayload);
    }
  }
}