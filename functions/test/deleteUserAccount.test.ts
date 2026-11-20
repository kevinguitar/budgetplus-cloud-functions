import {HttpsError} from "firebase-functions/v2/https";
import {auth, resetFakeAdmin, seed, storedPaths} from "./helpers/fakeAdmin";
import {silenceConsole} from "./helpers/silenceConsole";
import {deleteUserAccount} from "../src/deleteUserAccount";

/* eslint-disable @typescript-eslint/no-explicit-any */

const call = (data: unknown, uid?: string) =>
  deleteUserAccount.run({data, auth: uid ? {uid} : undefined} as any);

let errorSpy: jest.SpyInstance;

beforeEach(() => {
  resetFakeAdmin();
  errorSpy = silenceConsole().error;
  seed({
    "users/u1": {name: "Alice"},
    "users/u2": {name: "Bob"},
    "books/owned": {ownerId: "u1"},
    "books/owned/records/r1": {},
    "books/shared": {ownerId: "u2", authors: ["u1", "u2"]},
    "books/shared/records/r2": {},
  });
});

it("deletes the caller's books, user document and auth account", async () => {
  await expect(call({userId: "u1"}, "u1")).resolves.toEqual({success: true});

  expect(storedPaths()).toEqual([
    "books/shared",
    "books/shared/records/r2",
    "users/u2",
  ]);
  expect(auth.deleteUser).toHaveBeenCalledWith("u1");
});

it("allows unauthenticated calls", async () => {
  // Current behaviour: the ownership check only runs when request.auth is
  // present, so an unauthenticated caller can delete any account.
  await expect(call({userId: "u1"})).resolves.toEqual({success: true});

  expect(auth.deleteUser).toHaveBeenCalledWith("u1");
});

it.each([
  ["no userId", {}],
  ["an empty userId", {userId: ""}],
])("rejects requests with %s", async (_, data) => {
  await expect(call(data, "u1")).rejects.toMatchObject({
    code: "invalid-argument",
  });
  expect(auth.deleteUser).not.toHaveBeenCalled();
});

it("rejects deleting someone else's account", async () => {
  const promise = call({userId: "u2"}, "u1");

  await expect(promise).rejects.toBeInstanceOf(HttpsError);
  await expect(promise).rejects.toMatchObject({code: "permission-denied"});
  expect(storedPaths()).toContain("users/u2");
  expect(auth.deleteUser).not.toHaveBeenCalled();
});

it("wraps deletion failures in an internal error", async () => {
  const error = new Error("auth down");
  auth.deleteUser.mockRejectedValueOnce(error);

  await expect(call({userId: "u1"}, "u1")).rejects.toMatchObject({
    code: "internal",
    message: "An error occurred while deleting the account.",
  });
  expect(errorSpy).toHaveBeenCalledWith(
      "Error deleting account for user u1:",
      error
  );
});
