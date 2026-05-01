import {onRequest} from "firebase-functions/v2/https";
import {initializeApp, sendNotificationToInternalRecipients} from "./common";
import * as admin from "firebase-admin";

initializeApp();

/**
 * Handles RevenueCat webhook events for subscription purchases.
 * Processes INITIAL_PURCHASE, RENEWAL, and NON_RENEWING_PURCHASE events
 * and sends FCM notifications to internal recipients.
 */
export const revenueCatWebhook = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const event = req.body.event;
    if (!event) {
      console.log("No event data in webhook payload");
      res.status(400).send("No event data");
      return;
    }

    const eventType: string = event.type;
    const supportedEvents = [
      "INITIAL_PURCHASE",
      "RENEWAL",
      "NON_RENEWING_PURCHASE",
    ];

    if (!supportedEvents.includes(eventType)) {
      console.log(`Ignoring unsupported event type: ${eventType}`);
      res.status(200).send("Event type not handled");
      return;
    }

    const appUserId: string = event.app_user_id;
    const productId: string = event.product_id;
    const store: string = event.store;

    await sendNotification(appUserId, productId, store, eventType);
    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing RevenueCat webhook:", error);
    res.status(500).send("Internal Server Error");
  }
});

/**
 * Resolves a product display name from its product ID.
 * @param {string} productId The product identifier.
 * @return {string} The display name of the product.
 */
function getProductName(productId: string): string {
  if (productId.includes("monthly")) {
    return "月度方案";
  } else if (productId.includes("annual")) {
    return "年度方案";
  } else if (productId.includes("lifetime")) {
    return "終身方案";
  }
  return productId;
}

/**
 * Returns a label describing the purchase event type.
 * @param {string} eventType The RevenueCat event type.
 * @return {string} A human-readable label for the event.
 */
function getPurchaseTypeLabel(eventType: string): string {
  switch (eventType) {
    case "INITIAL_PURCHASE":
      return "新訂閱";
    case "RENEWAL":
      return "續訂";
    case "NON_RENEWING_PURCHASE":
      return "買斷";
    default:
      return eventType;
  }
}

/**
 * Returns a platform emoji based on the store.
 * @param {string} store The store identifier from RevenueCat.
 * @return {string} An emoji representing the platform.
 */
function getStoreEmoji(store: string): string {
  switch (store) {
    case "APP_STORE":
    case "MAC_APP_STORE":
      return "🍎";
    case "PLAY_STORE":
      return "🤖";
    case "STRIPE":
      return "💳";
    case "AMAZON":
      return "📦";
    default:
      return "🛒";
  }
}

/**
 * Send push notifications to internal users for RevenueCat purchase events.
 * @param {string} appUserId The RevenueCat app user ID.
 * @param {string} productId The product id the user purchased.
 * @param {string} store The store where the purchase was made.
 * @param {string} eventType The type of purchase event.
 */
async function sendNotification(
    appUserId: string,
    productId: string,
    store: string,
    eventType: string,
) {
  const userSnap = await admin.firestore().doc("users/" + appUserId).get();
  const username = userSnap.exists ? userSnap.get("name") : appUserId;
  const userPhotoUrl = userSnap.exists ? userSnap.get("photoUrl") : "";
  const createdOn = userSnap.exists ? userSnap.get("createdOn") : null;

  let joinDateStr = "";
  if (createdOn) {
    const eightHourMillis = 3600000 * 8;
    joinDateStr = "\n加入時間：" +
        new Date(+createdOn + eightHourMillis).toLocaleString("zh-TW");
  }

  const product = getProductName(productId);
  const purchaseType = getPurchaseTypeLabel(eventType);
  const emoji = getStoreEmoji(store);

  const title = "現金入袋 🤑" + emoji;
  const body = username + "（" + purchaseType + "）" + product + joinDateStr;

  await sendNotificationToInternalRecipients(title, body, userPhotoUrl);
}
