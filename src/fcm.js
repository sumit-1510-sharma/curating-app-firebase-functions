// src/fcm.js
import { doc, setDoc } from "firebase/firestore";
import { db, messaging } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";

const userId = "user_1";
const VAPID_KEY =
  "BIjvYVzU_boB9YwapL4Yxd87XPNdljl8Hbo9_sXthLstfggEky6wYMSrohRnSvKW0qD1qTMX4cqZiJOw-pYPpHI";

export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      console.log("FCM Token:", token);

      // TODO: Save token to Firestore under user's document
      await setDoc(
        doc(db, "users", userId),
        {
          fcmToken: token,
        },
        { merge: true }
      );
      return token;
    } else {
      console.warn("Notification permission denied.");
    }
  } catch (err) {
    console.error("Error getting FCM token", err);
  }
}

// Optional: Handle incoming foreground messages
export function onForegroundMessage(callback) {
  onMessage(messaging, callback);
}
