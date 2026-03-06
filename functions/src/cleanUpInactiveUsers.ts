import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {initializeApp} from "./common";
import {deleteOwnedBooks} from "./cleanUpUtils";

initializeApp();

/**
 * Clean up inactive users that haven't logged-in within 2 years.
 */
export const cleanUpInactiveUsers = functions
    .scheduler
    // Schedule for the 1st day of every month
    // https://crontab.guru/#0_0_1_*_*
    .onSchedule({
      schedule: "0 0 1 * *",
      memory: "512MiB", // default 256 is not enough
    }, async () => {
      try {
        console.log("Clean up inactive users job has started!");

        const twoYearsAgo = Date.now() - 63072000000;
        const inactiveUsers = await admin
            .firestore()
            .collection("users")
            .where("lastActiveOn", "<=", twoYearsAgo)
            .get();

        const deletePromises = inactiveUsers.docs
            // Keep the premium users permanently.
            .filter((doc) => doc.data().premium !== true)
            .map(async (doc) => {
              await deleteOwnedBooks(doc.id);
              return doc.ref.delete();
            });

        await Promise.all(deletePromises);

        console.log("Deleted " + deletePromises.length + " inactive users! " +
            (inactiveUsers.size - deletePromises.length) + " are premium users.");
      } catch (e) {
        console.log(e);
      }
    });
