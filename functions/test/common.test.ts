import {fakeModules, messaging, resetFakeAdmin, seed} from "./helpers/fakeAdmin";
import {
  initializeApp,
  internalRecipientIds,
  sendNotificationToInternalRecipients,
} from "../src/common";

const [recipientA, recipientB] = internalRecipientIds;

beforeEach(() => {
  resetFakeAdmin();
});

describe("initializeApp", () => {
  it("initializes firebase-admin and the region only once", () => {
    // Spy on the module object itself: with esModuleInterop, `import * as`
    // gives each importer its own read-only namespace wrapper.
    const setGlobalOptions = jest.spyOn(require("firebase-functions"), "setGlobalOptions");

    initializeApp();
    initializeApp();

    const app = fakeModules["firebase-admin/app"];
    expect(app.initializeApp).toHaveBeenCalledTimes(1);
    expect(app.cert).toHaveBeenCalledWith({});
    expect(app.initializeApp).toHaveBeenCalledWith({
      credential: {serviceAccount: {}},
    });
    expect(setGlobalOptions).toHaveBeenCalledTimes(1);
    expect(setGlobalOptions).toHaveBeenCalledWith({region: "asia-southeast1"});
  });
});

describe("sendNotificationToInternalRecipients", () => {
  it("sends the notification to every internal recipient with a token", async () => {
    seed({
      [`users/${recipientA}`]: {fcmToken: "token-a"},
      [`users/${recipientB}`]: {fcmToken: "token-b"},
    });

    await sendNotificationToInternalRecipients("Title", "Body", "https://img/a.png");

    expect(messaging.send).toHaveBeenCalledTimes(2);
    expect(messaging.send).toHaveBeenNthCalledWith(1, {
      token: "token-a",
      apns: {
        payload: {aps: {alert: {title: "Title", body: "Body"}}},
        fcmOptions: {imageUrl: "https://img/a.png"},
      },
      data: {
        type: "general",
        title: "Title",
        body: "Body",
        smallImageUrl: "https://img/a.png",
      },
    });
    expect(messaging.send.mock.calls[1][0].token).toBe("token-b");
  });

  it("skips recipients without a token or without a user document", async () => {
    seed({[`users/${recipientA}`]: {name: "No token"}});

    await sendNotificationToInternalRecipients("Title", "Body", "https://img/a.png");

    expect(messaging.send).not.toHaveBeenCalled();
  });

  it("accepts plain http image URLs", async () => {
    seed({[`users/${recipientA}`]: {fcmToken: "token-a"}});

    await sendNotificationToInternalRecipients("Title", "Body", "http://img/a.png");

    expect(messaging.send.mock.calls[0][0].apns.fcmOptions).toEqual({
      imageUrl: "http://img/a.png",
    });
  });

  it.each([
    ["an empty string", "", ""],
    ["a non-URL string", "not a url", "not a url"],
    ["a non-http URL", "ftp://img/a.png", "ftp://img/a.png"],
    ["null", null, ""],
    ["undefined", undefined, ""],
  ])("omits apns.fcmOptions when the image URL is %s", async (_, imageUrl, expectedSmallImageUrl) => {
    seed({[`users/${recipientA}`]: {fcmToken: "token-a"}});

    await sendNotificationToInternalRecipients("Title", "Body", imageUrl as string);

    const message = messaging.send.mock.calls[0][0];
    expect(message.apns).not.toHaveProperty("fcmOptions");
    expect(message.data.smallImageUrl).toBe(expectedSmallImageUrl);
  });
});
