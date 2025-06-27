// components/PresenceTester.jsx
import { useEffect } from "react";
import { ref, onDisconnect, onValue, set } from "firebase/database";
import { rtdb } from "./firebase";

// Change this to test different users
const TEST_USER_UID = "sumit_151000"; // ← From Firestore

const PresenceTester = () => {
  useEffect(() => {
    if (!TEST_USER_UID) return;

    const userStatusRef = ref(rtdb, `/statuses/${TEST_USER_UID}`);
    const connectedRef = ref(rtdb, ".info/connected");

    const isOfflineForDatabase = {
      status: "offline",
      lastSeen: Date.now(),
    };

    const isOnlineForDatabase = {
      status: "online",
      lastSeen: Date.now(),
    };

    const unsub = onValue(connectedRef, (snap) => {
      if (snap.val() === false) {
        return;
      }

      onDisconnect(userStatusRef)
        .set(isOfflineForDatabase)
        .then(() => {
          set(userStatusRef, isOnlineForDatabase);
        });
    });

    return () => {
      // Optional: Mark user offline when component unmounts
      set(userStatusRef, isOfflineForDatabase);
    };
  }, []);

  return <div>Presence is being tracked for user: {TEST_USER_UID}</div>;
};

export default PresenceTester;
