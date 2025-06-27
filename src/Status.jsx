import { doc, getDoc, onSnapshot } from "firebase/firestore";
import "./Status.css";
import React, { useEffect, useState } from "react";
import { db } from "./firebase";

const Status = () => {
  const userId = "sumit_151000";

  //   const getUserById = async (userId) => {
  //     try {
  //       const userRef = doc(db, "users", userId);
  //       const userSnap = await getDoc(userRef);

  //       if (userSnap.exists()) {
  //         console.log({
  //           success: true,
  //           user: { id: userSnap.id, ...userSnap.data() },
  //         });
  //         return { success: true, user: { id: userSnap.id, ...userSnap.data() } };
  //       } else {
  //         return { success: false, error: "User not found" };
  //       }
  //     } catch (error) {
  //       console.error("Error fetching user:", error);
  //       return { success: false, error: error.message };
  //     }
  //   };

  const [user, setUser] = useState();

  const listenToUserById = (userId, onUpdate) => {
    return onSnapshot(
      doc(db, "users", userId), // 1. Reference to user document
      (snapshot) => {
        // 2. Success callback (runs on load + on change)
        onUpdate(
          snapshot.exists()
            ? { success: true, user: { id: snapshot.id, ...snapshot.data() } }
            : { success: false, error: "User not found" }
        );
      },
      (error) => {
        // 3. Error callback (e.g., permission denied)
        console.error("Error listening to user:", error);
        onUpdate({ success: false, error: error.message });
      }
    );
  };

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = listenToUserById(userId, (result) => {
      if (result.success) {
        setUser(result.user);
      } else {
        console.error("Error:", result.error);
      }
    });

    return unsubscribe; // Cleanup: called when component unmounts or userId changes
  }, [userId]);

  return (
    <div className="funcs-container">
      {/* <div className="function-block">
        <h3>Get user by id</h3>
        <button onClick={() => getUserById(userId)}>like</button>
      </div> */}
    </div>
  );
};

export default Status;
