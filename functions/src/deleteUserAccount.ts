import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import {initializeApp} from "./common";
import {deleteOwnedBooks} from "./cleanUpUtils";

initializeApp();

/**
 * Delete a user account and all owned books.
 */
export const deleteUserAccount = functions
    .region("asia-southeast1")
    .https
    .onCall(async (data, context) => {
      const userId = data.userId;

      if (!userId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "The function must be called with a userId."
        );
      }

      if (context.auth && context.auth.uid !== userId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "You can only delete your own account."
        );
      }

      try {
        console.log(`Starting account deletion for user: ${userId}`);

        // Delete all owned books and the records inside.
        await deleteOwnedBooks(userId);

        // After deleted books and records, delete the user from the /users DB
        await admin.firestore().collection("users").doc(userId).delete();

        // Finally, delete account from Firebase Auth.
        await admin.auth().deleteUser(userId);

        console.log(`Successfully deleted account for user: ${userId}`);
        return {success: true};
      } catch (error) {
        console.error(`Error deleting account for user ${userId}:`, error);
        throw new functions.https.HttpsError(
            "internal",
            "An error occurred while deleting the account."
        );
      }
    });
