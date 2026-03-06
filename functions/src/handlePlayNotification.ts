import {onMessagePublished} from "firebase-functions/v2/pubsub";
import {initializeApp} from "./common";
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

        const purchases = await admin
            .firestore()
            .collection("purchases")
            .where("orderId", "==", orderId)
            .get();
        if (purchases.size == 1) {
          const userId = purchases.docs[0].get("userId");
          const userDoc = admin.firestore().doc("users/" + userId);

          // Revoke the user's premium entitlement
          await userDoc.update({premium: false});
          console.log("Revoked premium entitlement for user: " + userId);
        } else {
          console.error(`purchase with order ${orderId} has unexpected size ${purchases.size}`);
          return;
        }
      }
    });
