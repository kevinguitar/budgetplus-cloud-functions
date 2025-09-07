import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {initializeApp} from "../common";
import {deleteBookAndRecords} from "../cleanUpUtils";

initializeApp();

// Delete those book that was deleted in older version without archivedOn field.
export const cleanUpArchivedBooksLegacy = functions.https.onRequest(async (req, resp) => {
  const lastMonth = Date.now() - 2629800000;

  const archivedBookList = await admin
      .firestore()
      .collection("books")
      .where("archived", "==", true)
      .where("createdOn", "<=", lastMonth)
      .orderBy("createdOn")
      .limit(50)
      .get();

  for (const doc of archivedBookList.docs) {
    await deleteBookAndRecords(doc);
  }

  resp.json("Deleted " + archivedBookList.size + " archived books!");
});
