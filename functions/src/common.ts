import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

/* eslint-disable */
const serviceAccount = require("../service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

functions.setGlobalOptions({region: "asia-southeast1"});

export const internalRecipientIds = [
  "wStzA9aMwHd0pOGwyT0woBrf05q2",
  "BfvTnZPuUTS6oBH1UwZ8uZIllWs2",
];
