// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCeDC0ck2JEVmdoGN3zSMd3R05QNjocSG8",
  authDomain: "curating-app-1bb19.firebaseapp.com",
  projectId: "curating-app-1bb19",
  storageBucket: "curating-app-1bb19.firebasestorage.app",
  messagingSenderId: "334246902475",
  appId: "1:334246902475:web:cf05b11caa044155ba394e",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
