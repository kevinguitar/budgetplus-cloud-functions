import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {initializeApp} from "./common";
import {deleteBookAndRecords} from "./cleanUpUtils";

initializeApp();

/**
 * Clean up inactive users that haven't logged-in within 2 years.
 */
export const cleanUpInactiveUsers = functions
    .scheduler
    // Schedule for the 1st day of every month
    // https://crontab.guru/#0_0_1_*_*
    .onSchedule("0 0 1 * *", async () => {
      try {
        console.log("Clean up inactive users job has started!");

        const twoYearsAgo = Date.now() - 63072000000;
        const inactiveUsers = await admin
            .firestore()
            .collection("users")
            .where("lastActiveOn", "<=", twoYearsAgo)
            .get();

        const deletePromises = inactiveUsers.docs.map((doc) => {
          deleteOwnedBooks(doc.id);
          return doc.ref.delete();
        });

        await Promise.all(deletePromises);

        console.log("Deleted " + inactiveUsers.size + " inactive users!");
      } catch (e) {
        console.log(e);
      }
    });

/**
 * Find all the books belong to the user, and delete them.
 * @param {string} userId The inactive user.
 */
async function deleteOwnedBooks(userId: string) {
  const ownedBooks = await admin
      .firestore()
      .collection("books")
      .where("ownerId", "==", userId)
      .get();

  for (const doc of ownedBooks.docs) {
    await deleteBookAndRecords(doc);
  }

  console.log("Deleted " + ownedBooks.size + " book from " + userId);
}
