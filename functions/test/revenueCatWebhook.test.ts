import {internalRecipientIds} from "../src/common";
import {messaging, resetFakeAdmin, seed} from "./helpers/fakeAdmin";
import {silenceConsole} from "./helpers/silenceConsole";
import {revenueCatWebhook} from "../src/revenueCatWebhook";

/* eslint-disable @typescript-eslint/no-explicit-any */

// 2023-12-31 20:00 UTC, which is 2024-01-01 04:00 in Taiwan (UTC+8).
const CREATED_ON = Date.UTC(2023, 11, 31, 20, 0, 0);

function fakeResponse() {
  const res: any = {headersSent: false};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
}

async function request(body: unknown, method = "POST") {
  const res = fakeResponse();
  await revenueCatWebhook({method, body, headers: {}} as any, res);
  return res;
}

const purchaseEvent = (overrides: Record<string, unknown> = {}) => ({
  event: {
    type: "INITIAL_PURCHASE",
    app_user_id: "buyer",
    product_id: "budgetplus.premium.monthly",
    store: "APP_STORE",
    ...overrides,
  },
});

const sentMessage = () => messaging.send.mock.calls[0][0];

let errorSpy: jest.SpyInstance;

beforeEach(() => {
  resetFakeAdmin();
  errorSpy = silenceConsole().error;
  seed({
    [`users/${internalRecipientIds[0]}`]: {fcmToken: "internal-token"},
    "users/buyer": {
      name: "Alice",
      photoUrl: "https://img/alice.png",
      createdOn: CREATED_ON,
    },
  });
});

it("notifies internal recipients about a purchase", async () => {
  const res = await request(purchaseEvent());

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith("OK");
  expect(messaging.send).toHaveBeenCalledTimes(1);
  const message = sentMessage();
  expect(message.token).toBe("internal-token");
  expect(message.data.title).toBe("現金入袋 🤑🍎");
  // Join date is shown in Taiwan time (UTC+8).
  expect(message.data.body).toMatch(/^Alice（新訂閱）月度方案\n加入時間：2024\/1\/1\s\D*4:00:00$/);
  expect(message.apns.fcmOptions).toEqual({imageUrl: "https://img/alice.png"});
});

it.each([
  ["INITIAL_PURCHASE", "新訂閱"],
  ["RENEWAL", "續訂"],
  ["NON_RENEWING_PURCHASE", "買斷"],
])("labels %s events as %s", async (type, label) => {
  await request(purchaseEvent({type, product_id: "budgetplus.premium.annual"}));

  expect(sentMessage().data.body).toContain(`（${label}）`);
});

it.each([
  ["budgetplus.premium.monthly", "月度方案"],
  ["budgetplus-premium-annual", "年度方案"],
  ["budgetplus.premium.lifetime", "終身方案"],
  ["budgetplus.premium", "budgetplus.premium"],
])("names product %s as %s", async (productId, productName) => {
  await request(purchaseEvent({product_id: productId}));

  expect(sentMessage().data.body).toContain(`）${productName}\n`);
});

it.each([
  ["APP_STORE", "🍎"],
  ["MAC_APP_STORE", "🍎"],
  ["PLAY_STORE", "🤖"],
  ["STRIPE", "💳"],
  ["AMAZON", "📦"],
  ["PROMOTIONAL", "🛒"],
])("uses the right emoji for store %s", async (store, emoji) => {
  await request(purchaseEvent({store}));

  expect(sentMessage().data.title).toBe("現金入袋 🤑" + emoji);
});

it("falls back to the RevenueCat user id when the user is unknown", async () => {
  await request(purchaseEvent({app_user_id: "$RCAnonymousID:abc"}));

  const message = sentMessage();
  expect(message.data.body).toBe("$RCAnonymousID:abc（新訂閱）月度方案");
  expect(message.data.smallImageUrl).toBe("");
  expect(message.apns).not.toHaveProperty("fcmOptions");
});

it("omits the join date when the user has no createdOn", async () => {
  seed({"users/buyer": {name: "Alice"}});

  await request(purchaseEvent());

  expect(sentMessage().data.body).toBe("Alice（新訂閱）月度方案");
});

it.each([
  "budgetplus.premium.monthly",
  "budgetplus-premium-monthly",
])("mutes renewals of monthly product %s", async (productId) => {
  const res = await request(purchaseEvent({type: "RENEWAL", product_id: productId}));

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith("Monthly renewal ignored");
  expect(messaging.send).not.toHaveBeenCalled();
});

it("ignores unsupported event types", async () => {
  const res = await request(purchaseEvent({type: "CANCELLATION"}));

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith("Event type not handled");
  expect(messaging.send).not.toHaveBeenCalled();
});

it("rejects requests without an event", async () => {
  const res = await request({});

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.send).toHaveBeenCalledWith("No event data");
  expect(messaging.send).not.toHaveBeenCalled();
});

it.each(["GET", "PUT"])("rejects %s requests", async (method) => {
  const res = await request(purchaseEvent(), method);

  expect(res.status).toHaveBeenCalledWith(405);
  expect(res.send).toHaveBeenCalledWith("Method Not Allowed");
  expect(messaging.send).not.toHaveBeenCalled();
});

it("responds 500 when sending fails", async () => {
  const error = new Error("messaging down");
  messaging.send.mockRejectedValueOnce(error);

  const res = await request(purchaseEvent());

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.send).toHaveBeenCalledWith("Internal Server Error");
  expect(errorSpy).toHaveBeenCalledWith("Error processing RevenueCat webhook:", error);
});
