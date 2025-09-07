import {onMessagePublished} from "firebase-functions/v2/pubsub";
import {initializeApp, sendNotificationToInternalRecipients} from "./common";
import * as admin from "firebase-admin";

initializeApp();

const GPLAY_TOPIC = "gplay-notifications";

/**
 * A Cloud Function that triggers on messages published to the
 * Google Play notifications Pub/Sub topic.
 */
export const handlePlayNotification =
    onMessagePublished(GPLAY_TOPIC, async (event) => {
      let data;
      try {
        // In v2, the message payload is already decoded from base64.
        // We access it via event.data.message.json
        data = event.data.message.json;
      } catch (error) {
        console.error("Invalid Pub/Sub message: not JSON.", {error, eventData: event.data});
        return; // Exit if the message is not valid JSON
      }

      console.log("Received Google Play notification:", JSON.stringify(data));

      // Check if it's a voided purchase notification
      if (data.voidedPurchaseNotification) {
        const notification = data.voidedPurchaseNotification;
        const purchaseToken = notification.purchaseToken;
        const orderId = notification.orderId;

        console.log(`Voided Purchase: Token=${purchaseToken}, OrderID=${orderId}`);

        const purchase = await admin
            .firestore()
            .collection("purchases")
            .where("orderId", "==", orderId)
            .get();
        if (purchase.size == 1) {
          const user = purchase.docs[0];
          const userId = user.get("userId");
          const username = user.get("name");
          const userPhotoUrl = user.get("photoUrl");
          const createdOn = user.get("createdOn");
          const eightHourMillis = 3600000 * 8;
          const joinDate = new Date(+createdOn + eightHourMillis).toLocaleString("zh-TW");

          // Revoke the user's premium entitlement
          await admin.firestore().doc("users/" + userId)
              .update({premium: false});

          const books = await admin
              .firestore()
              .collection("books")
              .where("ownerId", "==", userId)
              .get();

          await sendNotificationToInternalRecipients(
              "被退款惹 🥲",
              username + `有${books.size}本帳本` + "\n加入時間：" + joinDate,
              userPhotoUrl
          );
        } else {
          console.error(`purchase with order ${orderId} has unexpected size ${purchase.size}`);
          return;
        }
      }
    });
