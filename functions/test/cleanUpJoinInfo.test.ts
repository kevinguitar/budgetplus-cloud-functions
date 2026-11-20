import {db, resetFakeAdmin, seed, storedPaths} from "./helpers/fakeAdmin";
import {silenceConsole} from "./helpers/silenceConsole";
import {cleanUpJoinInfo} from "../src/cleanUpJoinInfo";

/* eslint-disable @typescript-eslint/no-explicit-any */

const NOW = 1_700_000_000_000;
const ONE_MONTH = 2629800000;
const run = () => cleanUpJoinInfo.run({} as any);

let logSpy: jest.SpyInstance;

beforeEach(() => {
  resetFakeAdmin();
  logSpy = silenceConsole().log;
  jest.spyOn(Date, "now").mockReturnValue(NOW);
});

it("deletes join info generated at least a month ago", async () => {
  seed({
    "join_info/old": {generatedOn: NOW - ONE_MONTH - 1},
    "join_info/boundary": {generatedOn: NOW - ONE_MONTH},
    "join_info/recent": {generatedOn: NOW - ONE_MONTH + 1},
  });

  await run();

  expect(storedPaths()).toEqual(["join_info/recent"]);
  expect(logSpy).toHaveBeenCalledWith("Deleted 2 join info!");
});

it("logs and swallows Firestore errors", async () => {
  const error = new Error("firestore down");
  jest.spyOn(db, "collection").mockImplementationOnce(() => {
    throw error;
  });

  await expect(run()).resolves.toBeUndefined();
  expect(logSpy).toHaveBeenCalledWith(error);
});
