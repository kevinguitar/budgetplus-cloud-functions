import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {initializeApp} from "./common";

initializeApp();

export const newMemberNotification = functions
    .firestore
    .onDocumentUpdated("books/{book_id}", async (event) => {
      try {
        const snapshot = event.data;
        if (!snapshot) {
          console.log("No data associated with the event");
          return;
        }

        const bookName: string = snapshot.after.data().name;
        const oldMemberIds: string[] = snapshot.before.data().authors;
        const newMemberIds: string[] = snapshot.after.data().authors;

        if (newMemberIds.length == oldMemberIds.length + 1) {
          console.log("Detected new member joining");
          const diff = newMemberIds.filter((id) => !oldMemberIds.includes(id));
          await sendNotificationToUsers(bookName, diff[0], oldMemberIds);
        }
      } catch (error) {
        console.log(error);
      }
    });

/**
 * Send push notifications when new members join the accounting book.
 * @param {string} bookName The book name reflects on the document update.
 * @param {string} newMemberId The member's id who just joined.
 * @param {string[]} existingMemberIds The existing members' ids of the book.
 */
async function sendNotificationToUsers(
    bookName: string,
    newMemberId: string,
    existingMemberIds: string[],
) {
  console.log("Ready to send notification to " + existingMemberIds.length + " users");
  const newMemberSnap = await admin
      .firestore()
      .doc("users/" + newMemberId)
      .get();
  const newMemberName = newMemberSnap.get("name");
  const newMemberPhotoUrl = newMemberSnap.get("photoUrl");

  const existingMemberPromises = existingMemberIds.map((id) => {
    return admin.firestore()
        .doc("users/" + id)
        .get();
  });

  const existingMembers = await Promise.all(existingMemberPromises);
  console.log("Got all the existing users, size" + existingMembers.length);
  const sendNotificationPromises = [];
  for (const member of existingMembers) {
    const fcmToken = member.get("fcmToken");
    const language = member.get("language");

    let title;
    let message;
    switch (language) {
      case "zh-tw": {
        title = "您的帳本有新成員加入";
        message = newMemberName + "已加入" + bookName;
        break;
      }
      case "zh-cn": {
        title = "您的帐本有新成员加入";
        message = newMemberName + "已加入" + bookName;
        break;
      }
      case "ja": {
        title = "台帳に新しいメンバーがいます";
        message = newMemberName + "は" + bookName + "に参加しました";
        break;
      }
      default: {
        title = "Your accounting book has a new member";
        message = newMemberName + " has joined " + bookName;
        break;
      }
    }

    const messagePayload = {
      token: fcmToken,
      data: {
        type: "new_member",
        title: title,
        body: message,
        smallImageUrl: newMemberPhotoUrl,
      },
    };

    if (fcmToken != null && language != null) {
      console.log("Sending to userId=" + member.get("id") + ", fcm=" + fcmToken + ", lan=" + language);
      sendNotificationPromises.push(
          admin.messaging().send(messagePayload)
      );
    }
  }
  await Promise.all(sendNotificationPromises);
}
