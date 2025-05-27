// public/firebase-messaging-sw.js
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyCeDC0ck2JEVmdoGN3zSMd3R05QNjocSG8",
  authDomain: "curating-app-1bb19.firebaseapp.com",
  projectId: "curating-app-1bb19",
  storageBucket: "curating-app-1bb19.firebasestorage.app",
  messagingSenderId: "334246902475",
  appId: "1:334246902475:web:cf05b11caa044155ba394e",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
