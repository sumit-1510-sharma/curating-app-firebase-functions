import React, { useState } from "react";
import {
  deleteUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";
import { auth, db } from "./firebase"; // adjust path

function PhoneAuth() {
  const [otp, setOtp] = useState("");
  const [confirmResult, setConfirmResult] = useState(null);
  const [showOtpInput, setShowOtpInput] = useState(false);

  const startReauthentication = async () => {
    const user = auth.currentUser;
    if (!user) return alert("Not signed in.");

    const phoneNumber = user.phoneNumber;
    if (!phoneNumber) return alert("Phone number not found on account.");

    try {
      const appVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
      });

      const result = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        appVerifier
      );
      setConfirmResult(result);
      setShowOtpInput(true);
      alert("OTP sent for re-authentication");
    } catch (error) {
      console.error("OTP send error:", error);
      alert("Failed to send OTP. Try again later.");
    }
  };

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return alert("User not found.");

    try {
      // 1. Try deleting directly
      await deleteDoc(doc(db, "users", user.uid)); // Delete Firestore profile
      await deleteUser(user); // Delete Auth user
      alert("Account deleted successfully");
    } catch (error) {
      if (error.code === "auth/requires-recent-login") {
        alert("You need to re-authenticate first.");
        startReauthentication();
      } else {
        console.error("Delete failed:", error);
      }
    }
  };

  const handleOtpVerify = async () => {
    if (!confirmResult || !otp) return;

    try {
      const credential = PhoneAuthProvider.credential(
        confirmResult.verificationId,
        otp
      );

      await reauthenticateWithCredential(auth.currentUser, credential);

      // After re-auth, try deletion again
      const user = auth.currentUser;
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);
      alert("Account deleted after re-authentication");
      setShowOtpInput(false);
    } catch (error) {
      console.error("OTP verification failed:", error);
      alert("Invalid OTP or re-authentication failed.");
    }
  };

  return (
    <div>
      <div id="recaptcha-container" />

      <button onClick={handleDeleteAccount}>Delete My Account</button>

      {showOtpInput && (
        <div>
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button onClick={handleOtpVerify}>Verify OTP & Delete</button>
        </div>
      )}
    </div>
  );
}

export default PhoneAuth;
