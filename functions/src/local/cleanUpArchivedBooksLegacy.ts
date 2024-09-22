import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

// Delete those book that was delete in older version without archivedOn field.
// eslint-disable-next-line max-len
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
    // Delete the book
    await doc.ref.delete();

    // Delete all records
    const records = await admin
        .firestore()
        .collection("books/" + doc.id + "/records")
        .get();

    const deletePromises = records.docs.map((doc) => {
      return doc.ref.delete();
    });

    await Promise.all(deletePromises);

    console.log("deleted " + records.size + " records.");
  }

  resp.json("Deleted " + archivedBookList.size + " archived books!");
});
