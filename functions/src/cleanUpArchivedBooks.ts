import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

/**
 * Clean up archived books and records deleted a month ago.
 */
export const cleanUpArchivedBooks = functions
    .scheduler
    // Schedule for the 1st day of every month
    // https://crontab.guru/#0_0_1_*_*
    .onSchedule("0 0 1 * *", async () => {
      try {
        const lastMonth = Date.now() - 2629800000;

        const archivedBookList = await admin
            .firestore()
            .collection("books")
            .where("archived", "==", true)
            .where("archivedOn", "<=", lastMonth)
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
        console.log("Deleted " + archivedBookList.size + " archived books!");
      } catch (e) {
        console.log(e);
      }
    });
