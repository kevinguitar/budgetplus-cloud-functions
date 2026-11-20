import {FakeDocSnapshot, FakeDocRef, resetFakeAdmin, seed, storedPaths} from "./helpers/fakeAdmin";
import {silenceConsole} from "./helpers/silenceConsole";
import {deleteBookAndRecords, deleteOwnedBooks} from "../src/cleanUpUtils";

/* eslint-disable @typescript-eslint/no-explicit-any */

beforeEach(() => {
  resetFakeAdmin();
  silenceConsole();
});

describe("deleteBookAndRecords", () => {
  it("deletes the book and its records, leaving other books alone", async () => {
    seed({
      "books/b1": {name: "Target"},
      "books/b1/records/r1": {price: 1},
      "books/b1/records/r2": {price: 2},
      "books/b2": {name: "Other"},
      "books/b2/records/r3": {price: 3},
    });
    const book = new FakeDocSnapshot(new FakeDocRef("books/b1"), {name: "Target"});

    await deleteBookAndRecords(book as any);

    expect(storedPaths()).toEqual(["books/b2", "books/b2/records/r3"]);
  });

  it("deletes a book that has no records", async () => {
    seed({"books/b1": {name: "Empty"}});
    const book = new FakeDocSnapshot(new FakeDocRef("books/b1"), {name: "Empty"});

    await deleteBookAndRecords(book as any);

    expect(storedPaths()).toEqual([]);
  });
});

describe("deleteOwnedBooks", () => {
  it("deletes only the books owned by the user, with their records", async () => {
    seed({
      "books/owned1": {ownerId: "u1"},
      "books/owned1/records/r1": {},
      "books/owned2": {ownerId: "u1"},
      "books/owned2/records/r2": {},
      "books/shared": {ownerId: "u2", authors: ["u1", "u2"]},
      "books/shared/records/r3": {},
    });

    await deleteOwnedBooks("u1");

    expect(storedPaths()).toEqual(["books/shared", "books/shared/records/r3"]);
  });

  it("does nothing when the user owns no books", async () => {
    seed({"books/other": {ownerId: "u2"}});

    await deleteOwnedBooks("u1");

    expect(storedPaths()).toEqual(["books/other"]);
  });
});
