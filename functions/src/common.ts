import * as functions from "firebase-functions";

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const serviceAccount = require("../service-account.json");

export const baseFunctions = functions
    .runWith({serviceAccount: serviceAccount.client_email})
    .region("asia-southeast1");

export const internalRecipientIds = [
  "wStzA9aMwHd0pOGwyT0woBrf05q2",
  "BfvTnZPuUTS6oBH1UwZ8uZIllWs2",
];
