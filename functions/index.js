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
    const followerImageUrl = followerSnap.data()?.photoUrl || "";

    await messaging.sendEachForMulticast({
      tokens: [token], // single token in an array
      notification: {
        title: `${followerName} has started following you`,
        body: `Tap to view their profile`,
        imageUrl: `${followerImageUrl}`,
      },
      data: {
        userId: followerId,
        type: "profile",
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
    const photoUrl = userSnap.data()?.photoUrl || "";
    const ownerId = space?.hostId;

    // Don't send notification if host likes their own space
    if (!ownerId || userId === ownerId) return;

    const ownerSnap = await db.doc(`users/${ownerId}`).get();
    const token = ownerSnap.data()?.fcmToken;
    if (!token) return;

    await messaging.sendEachForMulticast({
      tokens: [token],
      notification: {
        title: `${username} liked your space`,
        body: `Your space "${space?.bubbleTitle || "Untitled"}" got a like!`,
        imageUrl: `${photoUrl}`,
      },
      data: {
        userId: userId,
        type: "profile",
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
    const photoUrl = userSnap.data()?.photoUrl || "";
    const ownerId = space?.hostId;

    if (!ownerId || userId === ownerId) {
      // Don't send notification if the added member is the host
      return;
    }

    const ownerSnap = await db.doc(`users/${ownerId}`).get();
    const token = ownerSnap.data()?.fcmToken;
    if (!token) return;

    await messaging.sendEachForMulticast({
      tokens: [token],
      notification: {
        title: `${username} joined your space`,
        body: `Your space "${
          space?.bubbleTitle || "Untitled"
        }" has a new member!`,
        imageUrl: `${photoUrl}`,
      },
      data: {
        userId: userId,
        type: "profile",
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
      db.doc(`spaces/${spaceId}/requests/${requestId}`).get(),
    ]);

    const space = spaceSnap.data();
    const requesterId = requestSnap.data()?.requestedById || "";
    const requesterName = requestSnap.data()?.requestedByName || "Someone";
    const requesterImageUrl = requestSnap.data()?.profilePhotoUrl || "";
    const ownerId = space?.hostId;

    if (!ownerId || requesterId === ownerId) {
      return;
    }

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
        imageUrl: `${requesterImageUrl}`,
      },
      data: {
        spaceId: spaceId,
        type: "space",
        category: space?.category,
      },
    });
  }
);
