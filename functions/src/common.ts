import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

/* eslint-disable */
const serviceAccount = require("../service-account.json");

export function initializeApp(): void {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    functions.setGlobalOptions({region: "asia-southeast1"});
  }
}

export const internalRecipientIds = [
  "wStzA9aMwHd0pOGwyT0woBrf05q2",
  "BfvTnZPuUTS6oBH1UwZ8uZIllWs2",
];

/**
 * Checks whether a value is a valid http(s) URL string.
 * @param {string} value The value to validate.
 * @return {boolean} True when the value is a valid http(s) URL.
 */
function isValidHttpUrl(value: string): boolean {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (e) {
    return false;
  }
}

export async function sendNotificationToInternalRecipients(
    title: string,
    body: string,
    smallImageUrl: string
): Promise<void> {
  const safeImageUrl = typeof smallImageUrl === "string" ? smallImageUrl : "";
  const hasValidImageUrl = isValidHttpUrl(safeImageUrl);

  for (const recipientId of internalRecipientIds) {
    const recipient = await admin.firestore().doc("users/" + recipientId).get();
    const fcmToken = recipient.get("fcmToken");
    if (fcmToken == null) {
      continue;
    }

    const apnsConfig: admin.messaging.ApnsConfig = {
      payload: {
        aps: {
          alert: {
            title: title,
            body: body,
          },
        },
      },
    };

    // Firebase rejects the whole message when apns.fcmOptions.imageUrl is an
    // empty or otherwise invalid URL string, so only attach it when valid.
    if (hasValidImageUrl) {
      apnsConfig.fcmOptions = {imageUrl: safeImageUrl};
    }

    const messagePayload: admin.messaging.Message = {
      token: fcmToken,
      apns: apnsConfig,
      data: {
        type: "general",
        title: title,
        body: body,
        smallImageUrl: safeImageUrl,
      },
    };

    await admin.messaging().send(messagePayload);
  }
}