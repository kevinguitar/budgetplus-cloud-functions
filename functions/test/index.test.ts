import * as index from "../src/index";

it("exports every deployed function", () => {
  expect(Object.keys(index).sort()).toEqual([
    "cleanUpArchivedBooks",
    "cleanUpInactiveUsers",
    "cleanUpJoinInfo",
    "deleteUserAccount",
    "handlePlayNotification",
    "newMemberNotification",
    "purchaseNotification",
    "pushNotificationSender",
    "revenueCatWebhook",
  ]);
  for (const fn of Object.values(index)) {
    expect(typeof fn).toBe("function");
  }
});
