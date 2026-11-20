/** @type {import("jest").Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  globalSetup: "<rootDir>/test/globalSetup.js",
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  // Tests never load the real credentials; firebase-admin is faked anyway.
  moduleNameMapper: {
    "^\\.\\./service-account\\.json$": "<rootDir>/test/fixtures/service-account.json",
  },
  clearMocks: true,
  collectCoverageFrom: [
    "src/**/*.ts",
    // One-off scripts that are not deployed.
    "!src/local/**",
  ],
  coverageThreshold: {
    global: {branches: 100, functions: 100, lines: 100, statements: 100},
    // getPurchaseTypeLabel's default case is unreachable: unsupported event
    // types are rejected before it is called.
    "./src/revenueCatWebhook.ts": {branches: 96, functions: 100, lines: 98, statements: 98},
  },
};
