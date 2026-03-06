import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp} from "./common";
import {deleteOwnedBooks} from "./cleanUpUtils";

initializeApp();

/**
 * Delete a user account and all owned books.
 */
export const deleteUserAccount = onCall(async (request) => {
  const userId = request.data.userId;

  if (!userId) {
    throw new HttpsError(
        "invalid-argument",
        "The function must be called with a userId."
    );
  }

  if (request.auth && request.auth.uid !== userId) {
    throw new HttpsError(
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
    throw new HttpsError(
        "internal",
        "An error occurred while deleting the account."
    );
  }
});
