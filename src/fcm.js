// src/fcm.js
import { doc, setDoc } from "firebase/firestore";
import { db, messaging } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";

const userId = "user_1";
const VAPID_KEY =
  "BFGAE3Kz5OyY6P1HlV3sSQ-98VnYmhQDpmILLm7QcmNLVT1NSsiftd3hmAO10K_X2GhbOiFXektI9S90kUdMPDo";

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
