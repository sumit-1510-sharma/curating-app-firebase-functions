const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { onValueWritten } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const APPLE_API_KEY =
  "";
const TMDB_API_KEY =
  "";
const BOOK_API_KEY = "";

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

// Notification functions

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

exports.sendRequestAcceptedNotification = onDocumentCreated(
  "spaces/{spaceId}/queue/{itemId}",
  async (event) => {
    const { spaceId, itemId } = event.params;

    const [spaceSnap, queueSnap] = await Promise.all([
      db.doc(`spaces/${spaceId}`).get(),
      db.doc(`spaces/${spaceId}/queue/${itemId}`).get(),
    ]);

    const space = spaceSnap.data();
    const queueItem = queueSnap.data();
    if (!space || !queueItem) return;

    const userId = queueItem.addedById || "";
    const userImageUrl = queueItem.profileImageUrl || "";
    const bubbleTitle = space.bubbleTitle || "";
    const ownerId = space.hostId;

    if (!userId || userId === ownerId) return;

    const userSnap = await db.doc(`users/${userId}`).get();
    const token = userSnap.data()?.fcmToken;
    if (!token) return;

    await messaging.sendEachForMulticast({
      tokens: [token],
      notification: {
        title: `🔥 you're plugged in`,
        body: `Your drop landed in ${
          bubbleTitle || "a circle"
        }. Tap to see the vibe.`,
        imageUrl: userImageUrl,
      },
      data: {
        spaceId: spaceId,
        type: "space",
        category: space.category || "",
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

// Search page functions

exports.updatePopularSpaces = onSchedule(
  {
    schedule: "every day 00:00",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    console.log("Running scheduled function: updatePopularSpaces");

    try {
      // Step 1: Get top 20 spaces by membersCount
      const snapshot = await db
        .collection("spaces")
        .orderBy("membersCount", "desc")
        .limit(20)
        .get();

      // Step 2: Extract space IDs
      const topSpaceIds = snapshot.docs.map((doc) => doc.id);

      // Step 3: Save array in popular_spaces doc
      await db.collection("lists").doc("popular_spaces").set({
        ids: topSpaceIds,
        updatedAt: Date.now(),
      });

      console.log("Successfully updated top space IDs as array.");
    } catch (error) {
      console.error("Error updating popular spaces:", error);
    }
  }
);

exports.updatePopularUsers = onSchedule(
  {
    schedule: "every day 00:00",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    console.log("Running scheduled function: updatePopularUsers");

    try {
      // Step 1: Get top 10 users by followersCount
      const topByFollowersSnap = await db
        .collection("users")
        .orderBy("followersCount", "desc")
        .limit(10)
        .get();

      const topByFollowers = topByFollowersSnap.docs.map((doc) => doc.id);

      // Step 2: Get top 10 users by spacesCount
      const topBySpacesSnap = await db
        .collection("users")
        .orderBy("spacesCount", "desc")
        .limit(10)
        .get();

      const topBySpaces = topBySpacesSnap.docs.map((doc) => doc.id);

      // Step 3: Merge and deduplicate
      const uniqueUserIds = Array.from(
        new Set([...topByFollowers, ...topBySpaces])
      );

      // Step 4: Save to Firestore
      await db.collection("lists").doc("popular_users").set({
        ids: uniqueUserIds,
        updatedAt: Date.now(),
      });

      console.log("Successfully updated popular_users with merged top users.");
    } catch (error) {
      console.error("Error updating popular users:", error);
    }
  }
);

exports.updateLatestRandomSpaces = onSchedule(
  {
    schedule: "every day 00:00",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    console.log("Running scheduled function: updateLatestRandomSpaces");

    try {
      // Step 1: Fetch latest 20 spaces based on 'createdAt'
      const snapshot = await db
        .collection("spaces")
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();

      const latestSpaceIds = snapshot.docs.map((doc) => doc.id);

      // Step 2: Save to Firestore under lists/latest_random
      await db.collection("lists").doc("latest_random").set({
        ids: latestSpaceIds,
        updatedAt: Date.now(),
      });

      console.log("Successfully updated latest_random space IDs.");
    } catch (error) {
      console.error("Error updating latest_random spaces:", error);
    }
  }
);

exports.updateLatestMusicSpaces = onSchedule(
  {
    schedule: "every day 00:00",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    console.log("Running scheduled function: updateLatestMusicSpaces");

    try {
      // Step 1: Query latest music category spaces
      const snapshot = await db
        .collection("spaces")
        .where("category", "==", "music")
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();

      const musicSpaceIds = snapshot.docs.map((doc) => doc.id);

      // Step 2: Save into lists/latest_music
      await db.collection("lists").doc("latest_music").set({
        ids: musicSpaceIds,
        updatedAt: Date.now(),
      });

      console.log("Successfully updated latest_music list.");
    } catch (error) {
      console.error("Error updating latest music spaces:", error);
    }
  }
);

exports.updateLatestMovieSpaces = onSchedule(
  {
    schedule: "every day 00:00",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    console.log("Running scheduled function: updateLatestMovieSpaces");

    try {
      // Step 1: Query latest movie category spaces
      const snapshot = await db
        .collection("spaces")
        .where("category", "==", "movie")
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();

      const movieSpaceIds = snapshot.docs.map((doc) => doc.id);

      // Step 2: Save into lists/latest_music
      await db.collection("lists").doc("latest_movie").set({
        ids: movieSpaceIds,
        updatedAt: Date.now(),
      });

      console.log("Successfully updated latest_movie list.");
    } catch (error) {
      console.error("Error updating latest movie spaces:", error);
    }
  }
);

exports.updateLatestTvshowSpaces = onSchedule(
  {
    schedule: "every day 00:00",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    console.log("Running scheduled function: updateLatestTvshowSpaces");

    try {
      // Step 1: Query latest tvshow category spaces
      const snapshot = await db
        .collection("spaces")
        .where("category", "==", "tvshow")
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();

      const tvshowSpaceIds = snapshot.docs.map((doc) => doc.id);

      // Step 2: Save into lists/latest_music
      await db.collection("lists").doc("latest_tvshow").set({
        ids: tvshowSpaceIds,
        updatedAt: Date.now(),
      });

      console.log("Successfully updated latest_tvshow list.");
    } catch (error) {
      console.error("Error updating latest tvshow spaces:", error);
    }
  }
);

exports.updateLatestBookSpaces = onSchedule(
  {
    schedule: "every day 00:00",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    console.log("Running scheduled function: updateLatestBookSpaces");

    try {
      // Step 1: Query latest book category spaces
      const snapshot = await db
        .collection("spaces")
        .where("category", "==", "book")
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();

      const bookSpaceIds = snapshot.docs.map((doc) => doc.id);

      // Step 2: Save into lists/latest_music
      await db.collection("lists").doc("latest_book").set({
        ids: bookSpaceIds,
        updatedAt: Date.now(),
      });

      console.log("Successfully updated latest_book list.");
    } catch (error) {
      console.error("Error updating latest book spaces:", error);
    }
  }
);

exports.updateTrendyMusic = onSchedule(
  {
    schedule: "every day 00:00",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    try {
      const res = await fetch(
        `https://api.music.apple.com/v1/catalog/us/charts?types=songs&limit=10`,
        {
          headers: { Authorization: APPLE_API_KEY },
        }
      );
      const data = await res.json();
      const songs = data.results?.songs?.[0]?.data || [];

      const listRef = db.collection("lists").doc("trendy_music");
      const itemsRef = listRef.collection("items");
      const batch = db.batch();

      const existing = await itemsRef.get();
      existing.forEach((doc) => batch.delete(doc.ref));

      songs.forEach((song, i) => {
        const attr = song.attributes;
        const docRef = itemsRef.doc();
        batch.set(docRef, {
          artist: attr.artistName || "",
          assetId: song.id,
          assetName: attr.name || "",
          coverUrl:
            attr.artwork?.url?.replace("{w}", "300")?.replace("{h}", "300") ||
            "",
          genre: [999], // Apple doesn't expose genre IDs in this response
          year: (attr.releaseDate || "").split("-")[0] || "",
          previewUrl: attr.previews?.[0]?.url || "",
          bookGenre: "",
          description: attr.albumName || "",
          shareableLink: attr.url || "",
          rank: i,
        });
      });
      batch.set(listRef, { updatedAt: Date.now() }, { merge: true });
      await batch.commit();
      console.log("✅ trendy_music updated.");
    } catch (err) {
      console.error("❌ Error updating trendy_music:", err.message);
    }
  }
);

exports.updateTrendyMovie = onSchedule(
  {
    schedule: "every day 00:00",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/trending/movie/day?language=en-US`,
        {
          headers: { Authorization: TMDB_API_KEY },
        }
      );

      const data = await res.json();
      const movies = data.results || [];

      const listRef = db.collection("lists").doc("trendy_movie");
      const itemsRef = listRef.collection("items");
      const batch = db.batch();

      const existing = await itemsRef.get();
      existing.forEach((doc) => batch.delete(doc.ref));

      movies.forEach((movie, i) => {
        const docRef = itemsRef.doc();
        batch.set(docRef, {
          artist: "",
          assetId: movie.id.toString(),
          assetName: movie.title || "",
          coverUrl: movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : "",
          genre: movie.genre_ids || [],
          year: (movie.release_date || "").split("-")[0] || "",
          previewUrl: "",
          bookGenre: "",
          description: movie.overview || "",
          shareableLink: `https://www.themoviedb.org/movie/${movie.id}`,
          rank: i,
        });
      });

      batch.set(listRef, { updatedAt: Date.now() }, { merge: true });
      await batch.commit();

      console.log("✅ trendy_movie updated with fetch.");
    } catch (err) {
      console.error("❌ Error updating trendy_movie:", err.message);
    }
  }
);

exports.updateTrendyTvshow = onSchedule(
  {
    schedule: "every day 00:00",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/trending/movie/day?language=en-US`,
        {
          headers: { Authorization: TMDB_API_KEY },
        }
      );

      const data = await res.json();
      const tvshows = data.results || [];

      const listRef = db.collection("lists").doc("trendy_tvshow");
      const itemsRef = listRef.collection("items");
      const batch = db.batch();

      const existing = await itemsRef.get();
      existing.forEach((doc) => batch.delete(doc.ref));

      tvshows.forEach((tvshow, i) => {
        const docRef = itemsRef.doc();
        batch.set(docRef, {
          artist: "",
          assetId: tvshow.id.toString(),
          assetName: tvshow.title || "",
          coverUrl: tvshow.poster_path
            ? `https://image.tmdb.org/t/p/w500${tvshow.poster_path}`
            : "",
          genre: tvshow.genre_ids || [],
          year: (tvshow.release_date || "").split("-")[0] || "",
          previewUrl: "",
          bookGenre: "",
          description: tvshow.overview || "",
          shareableLink: `https://www.themoviedb.org/movie/${tvshow.id}`,
          rank: i,
        });
      });

      batch.set(listRef, { updatedAt: Date.now() }, { merge: true });
      await batch.commit();

      console.log("✅ trendy_tvshow updated with fetch.");
    } catch (err) {
      console.error("❌ Error updating trendy_tvshow:", err.message);
    }
  }
);

exports.updateTrendyBook = onSchedule(
  {
    schedule: "every day 00:00",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=New+York+bestseller&key=${BOOK_API_KEY}&maxResults=10`
      );
      const data = await res.json();
      const books = data.items || [];

      const listRef = db.collection("lists").doc("trendy_book");
      const itemsRef = listRef.collection("items");
      const batch = db.batch();

      const existing = await itemsRef.get();
      existing.forEach((doc) => batch.delete(doc.ref));

      books.forEach((book, i) => {
        const info = book.volumeInfo || {};
        const docRef = itemsRef.doc();

        batch.set(docRef, {
          artist: info.authors?.[0] || "",
          assetId: book.id || "",
          assetName: info.title || "",
          coverUrl: info.imageLinks?.thumbnail || "",
          genre: [],
          year: (info.publishedDate || "").split("-")[0] || "",
          previewUrl: info.previewLink || "",
          bookGenre: info.categories?.[0] || "",
          description: info.description || "",
          shareableLink: info.infoLink || "",
          rank: i,
        });
      });

      batch.set(listRef, { updatedAt: Date.now() }, { merge: true });
      await batch.commit();
      console.log("✅ trendy_book updated.");
    } catch (err) {
      console.error("❌ Error updating trendy_book:", err.message);
    }
  }
);
