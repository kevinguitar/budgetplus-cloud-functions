import {internalRecipientIds} from "../src/common";
import {messaging, resetFakeAdmin, seed} from "./helpers/fakeAdmin";
import {silenceConsole} from "./helpers/silenceConsole";
import {purchaseNotification} from "../src/purchaseNotification";

/* eslint-disable @typescript-eslint/no-explicit-any */

// 2023-12-31 20:00 UTC, which is 2024-01-01 04:00 in Taiwan (UTC+8).
const CREATED_ON = Date.UTC(2023, 11, 31, 20, 0, 0);

const createPurchase = (purchase: Record<string, unknown>) =>
  purchaseNotification.run({data: {data: () => purchase}} as any);

const sentMessage = () => messaging.send.mock.calls[0][0];

let logSpy: jest.SpyInstance;

beforeEach(() => {
  resetFakeAdmin();
  logSpy = silenceConsole().log;
  seed({
    [`users/${internalRecipientIds[0]}`]: {fcmToken: "internal-token"},
    "users/buyer": {
      name: "Alice",
      photoUrl: "https://img/alice.png",
      createdOn: CREATED_ON,
    },
  });
});

it("notifies internal recipients about the purchase", async () => {
  await createPurchase({
    userId: "buyer",
    productId: "budgetplus.premium.monthly",
    client: "iOS",
  });

  expect(messaging.send).toHaveBeenCalledTimes(1);
  const message = sentMessage();
  expect(message.token).toBe("internal-token");
  expect(message.data.title).toBe("現金入袋 🤑🍎");
  // Join date is shown in Taiwan time (UTC+8).
  expect(message.data.body).toMatch(/^Alice 購買了月度方案\n加入時間：2024\/1\/1\s\D*4:00:00$/);
  expect(message.apns.fcmOptions).toEqual({imageUrl: "https://img/alice.png"});
});

it.each([
  ["budgetplus.premium", "極簡記帳進階版（舊）"],
  ["budgetplus-premium-monthly", "月度方案"],
  ["budgetplus.premium.monthly", "月度方案"],
  ["budgetplus-premium-annual", "年度方案"],
  ["budgetplus.premium.annual", "年度方案"],
  ["budgetplus.premium.lifetime", "終身方案"],
])("names product %s as %s", async (productId, productName) => {
  await createPurchase({userId: "buyer", productId, client: "Android"});

  expect(sentMessage().data.body).toContain(`Alice 購買了${productName}\n`);
});

it("still notifies for unknown products", async () => {
  await createPurchase({userId: "buyer", productId: "unknown", client: "Android"});

  expect(messaging.send).toHaveBeenCalledTimes(1);
});

it.each([
  ["iOS", "🍎"],
  ["Android", "🤖"],
  [undefined, "🤖"],
])("uses the right emoji for client %s", async (client, emoji) => {
  await createPurchase({userId: "buyer", productId: "budgetplus.premium.annual", client});

  expect(sentMessage().data.title).toBe("現金入袋 🤑" + emoji);
});

it("ignores events without data", async () => {
  await purchaseNotification.run({data: undefined} as any);

  expect(logSpy).toHaveBeenCalledWith("No data associated with the event");
  expect(messaging.send).not.toHaveBeenCalled();
});

it("logs and swallows send failures", async () => {
  const error = new Error("messaging down");
  messaging.send.mockRejectedValueOnce(error);

  await expect(createPurchase({
    userId: "buyer",
    productId: "budgetplus.premium.annual",
    client: "iOS",
  })).resolves.toBeUndefined();
  expect(logSpy).toHaveBeenCalledWith(error);
});
