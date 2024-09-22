import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

/**
 * Clean up stale join info that were created a month ago.
 */
export const cleanUpJoinInfo = functions
    .scheduler
    // Schedule for the 1st day of every month
    // https://crontab.guru/#0_0_1_*_*
    .onSchedule("0 0 1 * *", async () => {
      try {
        console.log("Clean up join info job has started!");

        const lastMonth = Date.now() - 2629800000;
        const joinInfoList = await admin
            .firestore()
            .collection("join_info")
            .where("generatedOn", "<=", lastMonth)
            .get();

        const deletePromises = joinInfoList.docs.map((doc) => {
          return doc.ref.delete();
        });

        await Promise.all(deletePromises);

        console.log("Deleted " + joinInfoList.size + " join info!");
      } catch (e) {
        console.log(e);
      }
    });
