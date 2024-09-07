import * as admin from "firebase-admin";
import {baseFunctions, serviceAccount} from "./common";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const newMemberNotification = baseFunctions
    .firestore
    .document("books/{book_id}")
    .onUpdate(async (change) => {
      try {
        const bookName: string = change.after.data().name;
        const oldMemberIds: string[] = change.before.data().authors;
        const newMemberIds: string[] = change.after.data().authors;

        if (newMemberIds.length == oldMemberIds.length + 1) {
          console.log("Detected new member joining");
          const diff = newMemberIds.filter((id) => !oldMemberIds.includes(id));
          await sendNotificationToUsers(bookName, diff[0], oldMemberIds);
        }
      } catch (error) {
        console.log(error);
      }
    });

// eslint-disable-next-line require-jsdoc
async function sendNotificationToUsers(
    bookName: string,
    newMemberId: string,
    existingMemberIds: string[],
) {
  // eslint-disable-next-line max-len
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
      default: {
        title = "Your accounting book has a new member";
        message = newMemberName + " just joined your " + bookName;
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
      // eslint-disable-next-line max-len
      console.log("Sending to userId=" + member.get("id") + ", fcm=" + fcmToken + ", lan=" + language);
      sendNotificationPromises.push(
          admin.messaging().send(messagePayload)
      );
    }
  }
  await Promise.all(sendNotificationPromises);
}
