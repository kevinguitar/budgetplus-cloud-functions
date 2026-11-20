import {db, resetFakeAdmin, seed, storedPaths} from "./helpers/fakeAdmin";
import {silenceConsole} from "./helpers/silenceConsole";
import {cleanUpArchivedBooks} from "../src/cleanUpArchivedBooks";

/* eslint-disable @typescript-eslint/no-explicit-any */

const NOW = 1_700_000_000_000;
const ONE_MONTH = 2629800000;
const run = () => cleanUpArchivedBooks.run({} as any);

let logSpy: jest.SpyInstance;

beforeEach(() => {
  resetFakeAdmin();
  logSpy = silenceConsole().log;
  jest.spyOn(Date, "now").mockReturnValue(NOW);
});

it("deletes books archived at least a month ago, with their records", async () => {
  seed({
    "books/old": {archived: true, archivedOn: NOW - ONE_MONTH - 1},
    "books/old/records/r1": {},
    "books/old/records/r2": {},
    "books/boundary": {archived: true, archivedOn: NOW - ONE_MONTH},
    "books/recent": {archived: true, archivedOn: NOW - ONE_MONTH + 1},
    "books/recent/records/r3": {},
    "books/active": {archived: false, archivedOn: NOW - 2 * ONE_MONTH},
    "books/legacy": {archived: true},
  });

  await run();

  expect(storedPaths()).toEqual([
    "books/active",
    "books/legacy",
    "books/recent",
    "books/recent/records/r3",
  ]);
  expect(logSpy).toHaveBeenCalledWith("Deleted 2 archived books!");
});

it("does nothing when there are no archived books", async () => {
  seed({"books/active": {archived: false}});

  await run();

  expect(storedPaths()).toEqual(["books/active"]);
  expect(logSpy).toHaveBeenCalledWith("Deleted 0 archived books!");
});

it("logs and swallows Firestore errors", async () => {
  const error = new Error("firestore down");
  jest.spyOn(db, "collection").mockImplementationOnce(() => {
    throw error;
  });

  await expect(run()).resolves.toBeUndefined();
  expect(logSpy).toHaveBeenCalledWith(error);
});
