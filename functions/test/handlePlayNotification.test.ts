import {Message} from "firebase-functions/v2/pubsub";
import {resetFakeAdmin, seed, store} from "./helpers/fakeAdmin";
import {silenceConsole} from "./helpers/silenceConsole";
import {handlePlayNotification} from "../src/handlePlayNotification";

/* eslint-disable @typescript-eslint/no-explicit-any */

const publish = (rawData: string) =>
  handlePlayNotification.run({
    data: {message: new Message({data: Buffer.from(rawData).toString("base64")})},
  } as any);

const publishJson = (payload: unknown) => publish(JSON.stringify(payload));

const voided = (orderId: string) => ({
  voidedPurchaseNotification: {purchaseToken: "token", orderId},
});

let errorSpy: jest.SpyInstance;

beforeEach(() => {
  resetFakeAdmin();
  errorSpy = silenceConsole().error;
  seed({
    "users/u1": {premium: true},
    "users/u2": {premium: true},
  });
});

it("revokes premium for the user who owns a voided purchase", async () => {
  seed({
    "purchases/p1": {orderId: "GPA.1", userId: "u1"},
    "purchases/p2": {orderId: "GPA.2", userId: "u2"},
  });

  await publishJson(voided("GPA.1"));

  expect(store.get("users/u1")).toEqual({premium: false});
  expect(store.get("users/u2")).toEqual({premium: true});
});

it("logs an error when no purchase matches the order", async () => {
  await publishJson(voided("GPA.missing"));

  expect(errorSpy).toHaveBeenCalledWith(
      "purchase with order GPA.missing has unexpected size 0"
  );
  expect(store.get("users/u1")).toEqual({premium: true});
});

it("logs an error when several purchases match the order", async () => {
  seed({
    "purchases/p1": {orderId: "GPA.1", userId: "u1"},
    "purchases/p2": {orderId: "GPA.1", userId: "u2"},
  });

  await publishJson(voided("GPA.1"));

  expect(errorSpy).toHaveBeenCalledWith(
      "purchase with order GPA.1 has unexpected size 2"
  );
  expect(store.get("users/u1")).toEqual({premium: true});
  expect(store.get("users/u2")).toEqual({premium: true});
});

it("ignores notifications that are not voided purchases", async () => {
  seed({"purchases/p1": {orderId: "GPA.1", userId: "u1"}});

  await publishJson({subscriptionNotification: {notificationType: 4}});

  expect(store.get("users/u1")).toEqual({premium: true});
  expect(errorSpy).not.toHaveBeenCalled();
});

it("logs and ignores messages that are not JSON", async () => {
  await expect(publish("not json")).resolves.toBeUndefined();

  expect(errorSpy).toHaveBeenCalledWith(
      "Invalid Pub/Sub message: not JSON.",
      expect.objectContaining({error: expect.any(Error)})
  );
});
