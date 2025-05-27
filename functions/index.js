const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

exports.sendFollowNotification = onDocumentCreated(
  "users/{userId}/followers/{followerId}",
  async (event) => {
    const { userId, followerId } = event.params;

    const [userSnap, followerSnap] = await Promise.all([
      db.doc(`users/${userId}`).get(),
      db.doc(`users/${followerId}`).get(),
    ]);

    const token = userSnap.data()?.fcmToken;
    if (!token) return;

    const followerName = followerSnap.data()?.name || "Someone";

    await messaging.sendEachForMulticast({
      tokens: [token], // single token in an array
      notification: {
        title: `${followerName} followed you`,
        body: `Tap to view their profile`,
      },
    });
  }
);

exports.sendSpaceLikeNotification = onDocumentCreated(
  "spaces/{spaceId}/likedByIds/{userId}",
  async (event) => {
    const { spaceId, userId } = event.params;

    const [spaceSnap, userSnap] = await Promise.all([
      db.doc(`spaces/${spaceId}`).get(),
      db.doc(`users/${userId}`).get(),
    ]);

    const space = spaceSnap.data();
    const username = userSnap.data()?.name || "Someone";
    const ownerId = space?.hostId;

    if (!ownerId) return;

    const ownerSnap = await db.doc(`users/${ownerId}`).get();
    const token = ownerSnap.data()?.fcmToken;
    if (!token) return;

    await messaging.sendEachForMulticast({
      tokens: [token],
      notification: {
        title: `${username} liked your space`,
        body: `Your space "${space?.title || "Untitled"}" got a like!`,
      },
    });
  }
);

exports.sendSpaceJoinNotification = onDocumentCreated(
  "spaces/{spaceId}/members/{userId}",
  async (event) => {
    const { spaceId, userId } = event.params;

    const [spaceSnap, userSnap] = await Promise.all([
      db.doc(`spaces/${spaceId}`).get(),
      db.doc(`users/${userId}`).get(),
    ]);

    const space = spaceSnap.data();
    const username = userSnap.data()?.name || "Someone";
    const ownerId = space?.hostId;

    if (!ownerId) return;

    const ownerSnap = await db.doc(`users/${ownerId}`).get();
    const token = ownerSnap.data()?.fcmToken;
    if (!token) return;

    await messaging.sendEachForMulticast({
      tokens: [token],
      notification: {
        title: `${username} joined your space`,
        body: `Your space "${space?.title || "Untitled"}" has a new member!`,
      },
    });
  }
);

exports.sendSpaceRequestNotification = onDocumentCreated(
  "spaces/{spaceId}/requests/{requestId}",
  async (event) => {
    const { spaceId, requestId } = event.params;

    const [spaceSnap, requestSnap] = await Promise.all([
      db.doc(`spaces/${spaceId}`).get(),
      db.doc(`users/${requestId}`).get(),
    ]);

    const space = spaceSnap.data();
    const requesterName = requestSnap.data()?.name || "Someone";
    const ownerId = space?.hostId;

    if (!ownerId) return;

    const ownerSnap = await db.doc(`users/${ownerId}`).get();
    const token = ownerSnap.data()?.fcmToken;
    if (!token) return;

    await messaging.sendEachForMulticast({
      tokens: [token],
      notification: {
        title: `New song request`,
        body: `${requesterName} requested to add song in your space "${
          space?.bubbleTitle || "Untitled"
        }".`,
      },
    });
  }
);
