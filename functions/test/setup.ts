// Swap every firebase-admin entry point the functions use for the in-memory
// fakes. jest.mock factories are hoisted and may not reference imports, so
// each one requires the shared fakes module.
jest.mock("firebase-admin/app", () => require("./helpers/fakeAdmin").fakeModules["firebase-admin/app"]);
jest.mock("firebase-admin/firestore", () => require("./helpers/fakeAdmin").fakeModules["firebase-admin/firestore"]);
jest.mock("firebase-admin/messaging", () => require("./helpers/fakeAdmin").fakeModules["firebase-admin/messaging"]);
jest.mock("firebase-admin/auth", () => require("./helpers/fakeAdmin").fakeModules["firebase-admin/auth"]);
