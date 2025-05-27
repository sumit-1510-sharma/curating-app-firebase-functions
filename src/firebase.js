// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getMessaging } from "firebase/messaging";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Development
const firebaseConfig = {
  apiKey: "AIzaSyCeDC0ck2JEVmdoGN3zSMd3R05QNjocSG8",
  authDomain: "curating-app-1bb19.firebaseapp.com",
  projectId: "curating-app-1bb19",
  storageBucket: "curating-app-1bb19.firebasestorage.app",
  messagingSenderId: "334246902475",
  appId: "1:334246902475:web:cf05b11caa044155ba394e",
};

// Production
// const firebaseConfig = {
//   apiKey: "AIzaSyBl4kNXFG3wTwxxOYXKN3ppHEa2BomhB3E",
//   authDomain: "plugged-prod-b6586.firebaseapp.com",
//   projectId: "plugged-prod-b6586",
//   storageBucket: "plugged-prod-b6586.firebasestorage.app",
//   messagingSenderId: "738430322683",
//   appId: "1:738430322683:web:c2b2feab8ec5ecfbba6d5e",
//   measurementId: "G-N2C5HW83ZY"
// };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const messaging = getMessaging(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
