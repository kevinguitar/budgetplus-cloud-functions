import * as admin from "firebase-admin";
import {QueryDocumentSnapshot} from "@google-cloud/firestore";

/**
 * Delete the book and all the records inside.
 * @param {QueryDocumentSnapshot} book the target book to delete.
 */
export async function deleteBookAndRecords(book: QueryDocumentSnapshot) {
  // Delete all records
  const records = await admin
      .firestore()
      .collection("books/" + book.id + "/records")
      .get();

  const deletePromises = records.docs.map((doc) => {
    return doc.ref.delete();
  });

  await Promise.all(deletePromises);

  // Delete the book
  await book.ref.delete();

  console.log("deleted " + records.size + " records in " + book.id);
}

/**
 * Find all the books belong to the user, and delete them.
 * @param {string} userId The inactive user.
 */
export async function deleteOwnedBooks(userId: string) {
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
