import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {initializeApp, sendNotificationToInternalRecipients} from "./common";

initializeApp();

export const purchaseNotification = functions
    .firestore
    .onDocumentCreated("purchases/{purchase_id}", async (event) => {
      try {
        const snapshot = event.data;
        if (!snapshot) {
          console.log("No data associated with the event");
          return;
        }
        const userId: string = snapshot.data().userId;
        const productId: string = snapshot.data().productId;
        await sendNotification(userId, productId);
      } catch (error) {
        console.log(error);
      }
    });

/**
 * Send push notifications to internal users on every new purchases.
 * @param {string} userId The user who made the purchase.
 * @param {string} productId The product id the user purchased.
 */
async function sendNotification(
    userId: string,
    productId: string,
) {
  const userSnap = await admin.firestore().doc("users/" + userId).get();
  const username = userSnap.get("name");
  const userPhotoUrl = userSnap.get("photoUrl");
  const createdOn = userSnap.get("createdOn");
  const eightHourMillis = 3600000 * 8;
  const joinDate = new Date(+createdOn + eightHourMillis).toLocaleString("zh-TW");

  let product;
  switch (productId) {
    // Legacy product
    case "budgetplus.premium": {
      product = "極簡記帳進階版（舊）";
      break;
    }

    case "budgetplus-premium-monthly":
    case "budgetplus.premium.monthly": {
      product = "月度方案";
      break;
    }

    case "budgetplus-premium-annual":
    case "budgetplus.premium.annual":{
      product = "年度方案";
      break;
    }

    case "budgetplus.premium.lifetime": {
      product = "終生方案";
      break;
    }
  }

  await sendNotificationToInternalRecipients(
      "現金入袋 🤑",
      username + " 購買了" + product + "\n加入時間：" + joinDate,
      userPhotoUrl
  );
}
