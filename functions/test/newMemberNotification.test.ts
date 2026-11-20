import {messaging, resetFakeAdmin, seed} from "./helpers/fakeAdmin";
import {silenceConsole} from "./helpers/silenceConsole";
import {newMemberNotification} from "../src/newMemberNotification";

/* eslint-disable @typescript-eslint/no-explicit-any */

const snapshot = (data: Record<string, unknown>) => ({data: () => data});

const updateAuthors = (before: string[], after: string[], name = "Trip") =>
  newMemberNotification.run({
    data: {
      before: snapshot({name, authors: before}),
      after: snapshot({name, authors: after}),
    },
  } as any);

let logSpy: jest.SpyInstance;

beforeEach(() => {
  resetFakeAdmin();
  logSpy = silenceConsole().log;
  seed({
    "users/new": {id: "new", name: "Carol", photoUrl: "https://img/carol.png"},
  });
});

it("notifies existing members when one new member joins", async () => {
  seed({
    "users/a": {id: "a", fcmToken: "token-a", language: "en"},
    "users/b": {id: "b", fcmToken: "token-b", language: "en"},
  });

  await updateAuthors(["a", "b"], ["a", "b", "new"]);

  expect(messaging.send).toHaveBeenCalledTimes(2);
  expect(messaging.send).toHaveBeenNthCalledWith(1, {
    token: "token-a",
    apns: {
      payload: {
        aps: {
          alert: {
            title: "Your accounting book has a new member",
            body: "Carol has joined Trip",
          },
        },
      },
      fcmOptions: {imageUrl: "https://img/carol.png"},
    },
    data: {
      type: "new_member",
      title: "Your accounting book has a new member",
      body: "Carol has joined Trip",
      smallImageUrl: "https://img/carol.png",
    },
  });
  expect(messaging.send.mock.calls[1][0].token).toBe("token-b");
});

it("finds the new member even when they are not appended last", async () => {
  seed({"users/a": {id: "a", fcmToken: "token-a", language: "en"}});

  await updateAuthors(["a"], ["new", "a"]);

  expect(messaging.send.mock.calls[0][0].data.body).toBe("Carol has joined Trip");
});

it.each([
  ["zh-tw", "您的帳本有新成員加入", "Carol已加入Trip"],
  ["zh-cn", "您的帐本有新成员加入", "Carol已加入Trip"],
  ["ja", "台帳に新しいメンバーがいます", "CarolはTripに参加しました"],
  ["ko", "가계부에 새로운 멤버가 참여했습니다", "Carol님이 Trip에 참여했습니다"],
  ["en", "Your accounting book has a new member", "Carol has joined Trip"],
  ["fr", "Your accounting book has a new member", "Carol has joined Trip"],
])("localizes the message for language %s", async (language, title, body) => {
  seed({"users/a": {id: "a", fcmToken: "token-a", language}});

  await updateAuthors(["a"], ["a", "new"]);

  const message = messaging.send.mock.calls[0][0];
  expect(message.apns.payload.aps.alert).toEqual({title, body});
  expect(message.data).toMatchObject({title, body});
});

it("skips members without an FCM token or a language", async () => {
  seed({
    "users/noToken": {id: "noToken", language: "en"},
    "users/noLanguage": {id: "noLanguage", fcmToken: "token"},
    "users/ok": {id: "ok", fcmToken: "token-ok", language: "en"},
  });

  await updateAuthors(["noToken", "noLanguage", "ok"], ["noToken", "noLanguage", "ok", "new"]);

  expect(messaging.send).toHaveBeenCalledTimes(1);
  expect(messaging.send.mock.calls[0][0].token).toBe("token-ok");
});

it.each([
  ["nobody joins", ["a"], ["a"]],
  ["two members join at once", ["a"], ["a", "new", "other"]],
  ["a member leaves", ["a", "new"], ["a"]],
])("sends nothing when %s", async (_, before, after) => {
  seed({"users/a": {id: "a", fcmToken: "token-a", language: "en"}});

  await updateAuthors(before, after);

  expect(messaging.send).not.toHaveBeenCalled();
});

it("ignores events without data", async () => {
  await newMemberNotification.run({data: undefined} as any);

  expect(logSpy).toHaveBeenCalledWith("No data associated with the event");
  expect(messaging.send).not.toHaveBeenCalled();
});

it("logs and swallows send failures", async () => {
  seed({"users/a": {id: "a", fcmToken: "token-a", language: "en"}});
  const error = new Error("messaging down");
  messaging.send.mockRejectedValueOnce(error);

  await expect(updateAuthors(["a"], ["a", "new"])).resolves.toBeUndefined();
  expect(logSpy).toHaveBeenCalledWith(error);
});

// FCM rejects the whole message when apns.fcmOptions.imageUrl is not a valid
// URL or a data value is not a string.
it.each([
  ["has no photo", {}, ""],
  ["has a null photo", {photoUrl: null}, ""],
  ["has an empty photo URL", {photoUrl: ""}, ""],
  ["has an invalid photo URL", {photoUrl: "not a url"}, "not a url"],
])("still sends a valid message when the new member %s", async (_, photo, expectedSmallImageUrl) => {
  seed({
    "users/new": {id: "new", name: "Carol", ...photo},
    "users/a": {id: "a", fcmToken: "token-a", language: "en"},
  });

  await updateAuthors(["a"], ["a", "new"]);

  const message = messaging.send.mock.calls[0][0];
  expect(message.apns).not.toHaveProperty("fcmOptions");
  expect(message.data.smallImageUrl).toBe(expectedSmallImageUrl);
  expect(message.data.body).toBe("Carol has joined Trip");
});
