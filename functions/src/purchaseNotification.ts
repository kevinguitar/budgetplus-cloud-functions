import * as admin from "firebase-admin";
import {baseFunctions, internalRecipientIds, serviceAccount} from "./common";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const purchaseNotification = baseFunctions
    .firestore
    .document("purchases/{purchase_id}")
    .onCreate(async (change) => {
      try {
        const userId: string = change.data().userId;
        const productId: string = change.data().productId;
        await sendNotification(userId, productId);
      } catch (error) {
        console.log(error);
      }
    });

// eslint-disable-next-line require-jsdoc
async function sendNotification(
    userId: string,
    productId: string,
) {
  const userSnap = await admin.firestore().doc("users/" + userId).get();
  const username = userSnap.get("name");
  const userPhotoUrl = userSnap.get("photoUrl");
  const createdOn = userSnap.get("createdOn");
  const eightHourMillis = 3600000 * 8;
  // eslint-disable-next-line max-len
  const joinDate = new Date(+createdOn + eightHourMillis).toLocaleString("zh-TW");

  let product;
  switch (productId) {
    case "budgetplus.premium": {
      product = "極簡記帳進階版";
      break;
    }
  }

  for (const recipientId of internalRecipientIds) {
    const recipient = await admin.firestore().doc("users/" + recipientId).get();
    const fcmToken = recipient.get("fcmToken");
    const messagePayload = {
      token: fcmToken,
      data: {
        type: "general",
        title: "現金入袋 🤑",
        body: username + "購買了" + product + "\n加入時間：" + joinDate,
        smallImageUrl: userPhotoUrl,
      },
    };

    if (fcmToken != null) {
      await admin.messaging().send(messagePayload);
    }
  }
}
