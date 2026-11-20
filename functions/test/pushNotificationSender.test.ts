import {internalRecipientIds} from "../src/common";
import {messaging, resetFakeAdmin, seed} from "./helpers/fakeAdmin";
import {silenceConsole} from "./helpers/silenceConsole";
import {pushNotificationSender} from "../src/pushNotificationSender";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ALL_LANGUAGES = {
  titleTw: "標題", descTw: "內容",
  titleCn: "标题", descCn: "内容",
  titleEn: "Title", descEn: "Body",
  titleJa: "タイトル", descJa: "本文",
  titleKo: "제목", descKo: "본문",
  deeplink: "budgetplus://premium",
};

const createPush = (data: Record<string, unknown>) =>
  pushNotificationSender.run({data: {data: () => data}} as any);

/** Topic or token plus title of each sent message, in order. */
const sent = () => messaging.send.mock.calls.map(([m]) => [m.topic ?? m.token, m.data.title]);

let logSpy: jest.SpyInstance;

beforeEach(() => {
  resetFakeAdmin();
  logSpy = silenceConsole().log;
});

describe("topic notifications", () => {
  it("sends each available language to the general topics", async () => {
    await createPush(ALL_LANGUAGES);

    expect(sent()).toEqual([
      ["general_tw", "標題"],
      ["general_cn", "标题"],
      ["general_en", "Title"],
      ["general_ja", "タイトル"],
      ["general_ko", "제목"],
    ]);
    expect(messaging.send).toHaveBeenNthCalledWith(1, {
      topic: "general_tw",
      data: {
        type: "general",
        title: "標題",
        body: "內容",
        url: "budgetplus://premium",
      },
    });
  });

  it("sends only Traditional Chinese when no other language is set", async () => {
    await createPush({titleTw: "標題", descTw: "內容"});

    expect(sent()).toEqual([["general_tw", "標題"]]);
  });

  it.each([
    ["FreeUsers", "free_user_"],
    ["PaidUsers", "paid_user_"],
    ["Everyone", "general_"],
  ])("uses the %s audience topic prefix", async (targetAudience, prefix) => {
    await createPush({...ALL_LANGUAGES, targetAudience});

    expect(sent().map(([topic]) => topic)).toEqual(
        ["tw", "cn", "en", "ja", "ko"].map((lang) => prefix + lang)
    );
  });
});

describe("internal notifications", () => {
  beforeEach(() => {
    seed({
      [`users/${internalRecipientIds[0]}`]: {fcmToken: "token-a"},
      [`users/${internalRecipientIds[1]}`]: {name: "No token"},
    });
  });

  it("sends only to internal recipients that have a token", async () => {
    await createPush({...ALL_LANGUAGES, internal: true, targetAudience: "PaidUsers"});

    expect(messaging.send.mock.calls.every(([m]) => m.token === "token-a")).toBe(true);
    expect(messaging.send.mock.calls.some(([m]) => "topic" in m)).toBe(false);
  });

  it("sends only Traditional Chinese when no other language is set", async () => {
    await createPush({titleTw: "標題", descTw: "內容", internal: true});

    expect(sent()).toEqual([["token-a", "標題"]]);
  });

  it("previews English without Simplified Chinese", async () => {
    await createPush({
      titleTw: "標題", descTw: "內容",
      titleEn: "Title", descEn: "Body",
      internal: true,
    });

    expect(sent()).toEqual([
      ["token-a", "標題"],
      ["token-a", "Title"],
    ]);
  });

  it("sends Japanese and Korean when set", async () => {
    await createPush({
      titleTw: "標題", descTw: "內容",
      titleJa: "タイトル", descJa: "本文",
      titleKo: "제목", descKo: "본문",
      internal: true,
    });

    expect(sent()).toEqual([
      ["token-a", "標題"],
      ["token-a", "タイトル"],
      ["token-a", "제목"],
    ]);
  });

  it("previews every available language, like the topic send", async () => {
    await createPush({...ALL_LANGUAGES, internal: true});

    expect(sent()).toEqual([
      ["token-a", "標題"],
      ["token-a", "标题"],
      ["token-a", "Title"],
      ["token-a", "タイトル"],
      ["token-a", "제목"],
    ]);
  });
});

it("ignores events without data", async () => {
  await pushNotificationSender.run({data: undefined} as any);

  expect(logSpy).toHaveBeenCalledWith("No data associated with the event");
  expect(messaging.send).not.toHaveBeenCalled();
});

it("logs and swallows send failures", async () => {
  const error = new Error("messaging down");
  messaging.send.mockRejectedValueOnce(error);

  await expect(createPush(ALL_LANGUAGES)).resolves.toBeUndefined();
  expect(logSpy).toHaveBeenCalledWith(error);
  expect(messaging.send).toHaveBeenCalledTimes(1);
});
