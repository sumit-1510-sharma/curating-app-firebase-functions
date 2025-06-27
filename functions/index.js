const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { onValueWritten } = require("firebase-functions/v2/database");

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
        title: `${followerName} followed you`,
        body: `Say hi or follow back`,
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
        title: `${username} liked ${space?.bubbleTitle || "your space"}`,
        body: `Add more to keep it growing`,
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
        title: `${username} joined ${space?.bubbleTitle || "your space"}`,
        body: `you have a mood twin, drop something new`,
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
    const request = requestSnap.data();
    if (!space || !request) return;

    const requesterId = request.requestedById || "";
    const requesterName = request.requestedByName || "Someone";
    const requesterImageUrl = request.profilePhotoUrl || "";
    const ownerId = space.hostId;

    if (!ownerId || requesterId === ownerId) return;

    const ownerSnap = await db.doc(`users/${ownerId}`).get();
    const token = ownerSnap.data()?.fcmToken;
    if (!token) return;

    const category = space.category || "default";
    const bubbleTitle = space.bubbleTitle || "";

    const categoryMessages = {
      music: {
        title: "New song request 🎵",
        body: `${requesterName} wants to add a song in ${
          bubbleTitle || "your space"
        }`,
      },
      movie: {
        title: "New movie request 🍿",
        body: `${requesterName} wants to add a movie in ${
          bubbleTitle || "your space"
        }`,
      },
      tvshow: {
        title: "New tv show request 📺",
        body: `${requesterName} wants to add a show in ${
          bubbleTitle || "your space"
        }`,
      },
      book: {
        title: "New book request 📚",
        body: `${requesterName} wants to add a book in ${
          bubbleTitle || "your space"
        }`,
      },
      default: {
        title: "New request",
        body: `${requesterName} wants to add content in ${
          bubbleTitle || "your space"
        }`,
      },
    };

    const messageContent =
      categoryMessages[category] || categoryMessages.default;

    await messaging.sendEachForMulticast({
      tokens: [token],
      notification: {
        title: messageContent.title,
        body: messageContent.body,
        imageUrl: requesterImageUrl,
      },
      data: {
        spaceId,
        type: "space",
        category,
      },
    });
  }
);

exports.sendNewChatMessageNotification = onDocumentCreated(
  "spaces/{spaceId}/chat/{messageId}",
  async (event) => {
    const { spaceId, messageId } = event.params;

    const [spaceSnap, messageSnap] = await Promise.all([
      db.doc(`spaces/${spaceId}`).get(),
      db.doc(`spaces/${spaceId}/chat/${messageId}`).get(),
    ]);

    const space = spaceSnap.data();
    const message = messageSnap.data();
    if (!space || !message) return;

    const hostId = space.hostId;
    const senderId = message.senderID;

    if (!hostId || hostId === senderId) return;

    const senderName = message.senderName || "Someone";
    const senderImageUrl = message.profileImageURL || "";

    const hostSnap = await db.doc(`users/${hostId}`).get();
    const hostToken = hostSnap.data()?.fcmToken;
    if (!hostToken) return;

    console.log("reached here");

    await messaging.sendEachForMulticast({
      tokens: [hostToken],
      notification: {
        title: `New message in ${space.bubbleTitle || "your space"}`,
        body: `${senderName} said something`,
        imageUrl: senderImageUrl,
      },
      data: {
        spaceId: spaceId,
        type: "space",
        category: space.category || "",
      },
    });
  }
);

exports.syncStatusToFirestore = onValueWritten(
  "/statuses/{userId}",
  async (event) => {
    const userId = event.params.userId;
    const statusData = event.data.after.val();

    if (!statusData) return;

    const userRef = db.doc(`users/${userId}`);

    return userRef.update({
      status: statusData.status,
      lastSeen: new Date(statusData.lastSeen),
    });
  }
);
