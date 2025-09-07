import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {initializeApp} from "../common";

initializeApp();

export const memberInfoDump = functions.https.onRequest(async (req, resp) => {
  const members = await admin.firestore()
      .collection("users")
      .where("premium", "==", true)
      .get();

  members.docs.forEach((member) => {
    const id = member.get("id");
    const language = member.get("language");
    const createdOn = member.get("createdOn");
    const lastActiveOn = member.get("lastActiveOn");

    const createDate = new Date(createdOn).toLocaleDateString();
    const activeDate = new Date(lastActiveOn).toLocaleDateString();

    console.log(
        id + "," +
        createdOn + "," +
        createDate + "," +
        lastActiveOn + "," +
        activeDate + "," +
        language
    );
  });
  resp.json("Total member: " + members.size);
});
