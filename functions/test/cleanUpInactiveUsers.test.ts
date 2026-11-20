import {db, resetFakeAdmin, seed, storedPaths} from "./helpers/fakeAdmin";
import {silenceConsole} from "./helpers/silenceConsole";
import {cleanUpInactiveUsers} from "../src/cleanUpInactiveUsers";

/* eslint-disable @typescript-eslint/no-explicit-any */

const NOW = 1_700_000_000_000;
const TWO_YEARS = 63072000000;
const run = () => cleanUpInactiveUsers.run({} as any);

let logSpy: jest.SpyInstance;

beforeEach(() => {
  resetFakeAdmin();
  logSpy = silenceConsole().log;
  jest.spyOn(Date, "now").mockReturnValue(NOW);
});

it("deletes users inactive for two years and the books they own", async () => {
  seed({
    "users/inactive": {lastActiveOn: NOW - TWO_YEARS - 1},
    "users/boundary": {lastActiveOn: NOW - TWO_YEARS},
    "users/premium": {lastActiveOn: NOW - TWO_YEARS - 1, premium: true},
    "users/active": {lastActiveOn: NOW - TWO_YEARS + 1},
    "users/neverSeen": {},
    "books/b1": {ownerId: "inactive"},
    "books/b1/records/r1": {},
    "books/b2": {ownerId: "premium"},
    "books/b2/records/r2": {},
    "books/b3": {ownerId: "active"},
  });

  await run();

  expect(storedPaths()).toEqual([
    "books/b2",
    "books/b2/records/r2",
    "books/b3",
    "users/active",
    "users/neverSeen",
    "users/premium",
  ]);
  expect(logSpy).toHaveBeenCalledWith(
      "Deleted 2 inactive users! 1 are premium users."
  );
});

it("keeps users whose premium flag is not strictly true", async () => {
  seed({"users/u1": {lastActiveOn: 0, premium: "true"}});

  await run();

  expect(storedPaths()).toEqual([]);
});

it("logs and swallows Firestore errors", async () => {
  const error = new Error("firestore down");
  jest.spyOn(db, "collection").mockImplementationOnce(() => {
    throw error;
  });

  await expect(run()).resolves.toBeUndefined();
  expect(logSpy).toHaveBeenCalledWith(error);
});
