import React, { useEffect, useState } from "react";
import "./Funcs.css";
import {
  addDoc,
  collection,
  doc,
  endAt,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  startAt,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, messaging, storage } from "./firebase";

// const queueInputs = {
//   artist: "Taylor Swift",
//   assetId: "track_987654",                                  for music
//   assetName: "Lover",
//   coverUrl: "https://example.com/music-cover.jpg",
//   year: "2019",
// };

// const queueInputs = {
//   artist: "Taylor Swift",
//   assetId: "track_987654",                                  for movie / tv show
//   assetName: "Lover",
//   coverUrl: "https://example.com/music-cover.jpg",
//   year: "2019",
// };

// const queueInputs = {
//   artist: "Taylor Swift",
//   assetId: "track_987654",                                  for book
//   assetName: "Lover",
//   coverUrl: "https://example.com/music-cover.jpg",
//   year: "2019",
// };

const Funcs = () => {
  const [imageFile, setImageFile] = useState(null);
  const [result, setResult] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [requestList, setRequestList] = useState([]);
  const [notificationList, setNotificationList] = useState([]);

  const sourceId = "user_1";
  const userId = "sumit_151000";
  const targetId = "tpylN8E6nAZtbvILAx14r0qb6ZA2";

  // const spaceId = "zqTZ7SbddQTLbNCpaggW";
  const spaceId = "eZhbiLhKuRGpHUZQoNex";
  const memberId = "sumit_151000";
  const name = "sumit sharma";
  const profileUrl =
    "https://plus.unsplash.com/premium_photo-1689568126014-06fea9d5d341?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8cHJvZmlsZXxlbnwwfHwwfHx8MA%3D%3D";

  const message = "Hello sumit";
  const type = "text";
  const mood = "bored";
  const activity = "vibing";

  const user = {
    id: "sumit_15102000",
    name: "sumit sharma",
    photoUrl:
      "https://firebasestorage.googleapis.com/v0/b/curating-app-1bb19.firebasestorage.app/o/userPhotos%2Fuser_2.jpg?alt=media&token=105849e1-2a31-4b43-9f36-2d2bca4b2126",
  };

  const song5 = {
    id: "1650634434",
    attributes: {
      name: "Apna Bana Le",
      artistName: "Arijit Singh",
      artwork: {
        url: "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/1d/0c/ed/1d0cedb5-4990-2f56-8f5b-142e6a7629a4/196589875100.jpg/{w}x{h}bb.jpg",
      },
      genreNames: ["Bollywood"],
      releaseDate: "2022-11-17",
    },
  };

  const handleFileChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const listenForNewFilteredSpaces = (mood, activity, onNewSpaceDetected) => {
    if (!mood || !activity) {
      throw new Error("Mood and activity are required.");
    }

    const spacesRef = collection(db, "spaces");

    const q = query(
      spacesRef,
      where("mood", "==", mood),
      where("activity", "==", activity)
    );

    let initialized = false;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!initialized) {
        initialized = true;
        return; // Skip the initial load
      }

      const hasNew = snapshot
        .docChanges()
        .some((change) => change.type === "added");

      if (hasNew) {
        onNewSpaceDetected();
      }
    });

    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = listenForNewFilteredSpaces(mood, activity, () => {
      alert("New space created.");
    });

    return () => unsubscribe(); // Cleanup
  }, []);

  const createUser = async (uid, name, mood, activity, imageFile = null) => {
    try {
      // const defaultPhotoUrl =
      //   "https://firebasestorage.googleapis.com/v0/b/curating-app-1bb19.firebasestorage.app/o/userPhotos%2Fdefault_pic.png?alt=media&token=d38231ee-ef01-46bd-86e7-7b3e76df3d16";

      const defaultPhotoUrl =
        "https://firebasestorage.googleapis.com/v0/b/plugged-dev-252d8.firebasestorage.app/o/userPhotos%2Fdefault_pic.png?alt=media&token=d0facec0-fdca-4267-beae-1522947c3941";

      // const defaultPhotoUrl =
      //   "https://firebasestorage.googleapis.com/v0/b/plugged-prod-b6586.firebasestorage.app/o/userPhotos%2Fdefault_pic.png?alt=media&token=b301d284-821a-4933-85c9-b48efd861a15";
      let photoUrl = defaultPhotoUrl;

      if (imageFile) {
        const imageRef = ref(storage, `userPhotos/${uid}.jpg`);
        await uploadBytes(imageRef, imageFile);
        photoUrl = await getDownloadURL(imageRef);
      }

      const userData = {
        name,
        mood,
        activity,
        isBanned: false,
        photoUrl,
        followersCount: 0,
        followingsCount: 0, // You can change to 1 if needed
        spacesCount: 0,
      };

      const userRef = doc(db, "users", uid);
      await setDoc(userRef, userData);

      const fullUser = { uid, ...userData };
      return fullUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  };

  const deleteUserAccount = async (uid) => {
    try {
      // 1. Delete the profile image from storage
      const imageRef = ref(storage, `userPhotos/${uid}.jpg`);
      await deleteObject(imageRef).catch((error) => {
        // If the image doesn't exist, suppress the error
        if (error.code !== "storage/object-not-found") {
          throw error;
        }
      });

      // 2. Delete the user document from Firestore
      const userRef = doc(db, "users", uid);
      await deleteDoc(userRef);

      console.log(`User ${uid} deleted successfully.`);
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  };

  const updateUserProfile = async (
    userId,
    name,
    mood,
    activity,
    about,
    link,
    newImageFile = null
  ) => {
    try {
      const userRef = doc(db, "users", userId);
      const updatedFields = {};

      if (name !== undefined) updatedFields.name = name;
      if (mood !== undefined) updatedFields.mood = mood;
      if (activity !== undefined) updatedFields.activity = activity;
      if (about !== undefined) updatedFields.about = about;
      if (link !== undefined) updatedFields.link = link;

      if (newImageFile) {
        const imageRef = ref(storage, `userPhotos/${userId}.jpg`);
        await uploadBytes(imageRef, newImageFile);
        const newPhotoUrl = await getDownloadURL(imageRef);
        updatedFields.photoUrl = newPhotoUrl;
      }

      await updateDoc(userRef, updatedFields);

      // Fetch the updated user doc
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        throw new Error("User not found after update");
      }

      return { success: true, user: { id: userSnap.id, ...userSnap.data() } };
    } catch (error) {
      console.error("Error updating user profile:", error);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    loadInitialSpaces(mood, activity);
  }, []);

  const loadInitialSpaces = async (mood, activity) => {
    const { spaces: newSpaces, lastVisible } = await getSpacesPaginated(
      mood,
      activity
    );
    setSpaces(newSpaces);
    setLastDoc(lastVisible);
  };

  const loadMoreSpaces = async (mood, activity) => {
    const {
      spaces: moreSpaces,
      lastVisible,
      hasMore,
    } = await getSpacesPaginated(mood, activity, lastDoc);

    setSpaces((prev) => [...prev, ...moreSpaces]);
    setLastDoc(lastVisible);

    if (!hasMore) {
      alert("You've reached the end of the list.");
      // Optionally: disable a "Load More" button or similar
    }
  };

  const getSpacesPaginated = async (mood, activity, lastDoc = null) => {
    try {
      const spacesRef = collection(db, "spaces");
      const pageSize = 2;

      const conditions = [
        where("mood", "==", mood),
        where("activity", "==", activity),
        orderBy("createdAt", "desc"),
        limit(pageSize),
      ];

      if (lastDoc) {
        conditions.splice(conditions.length - 1, 0, startAfter(lastDoc));
      }

      const spacesQuery = query(spacesRef, ...conditions);
      const snapshot = await getDocs(spacesQuery);

      const spaces = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

      const hasMore = snapshot.docs.length === pageSize;

      return { spaces, lastVisible, hasMore };
    } catch (err) {
      console.error("Error paginating spaces:", err);
      throw err;
    }
  };

  const refreshSpacesList = async (mood, activity) => {
    const { spaces: refreshedSpaces, lastVisible } = await refreshSpaces(
      mood,
      activity
    );
    setSpaces(refreshedSpaces);
    setLastDoc(lastVisible);
  };

  const refreshSpaces = async (mood, activity) => {
    try {
      const spacesRef = collection(db, "spaces");
      const pageSize = 2;

      const spacesQuery = query(
        spacesRef,
        where("mood", "==", mood),
        where("activity", "==", activity),
        orderBy("createdAt", "desc"),
        limit(pageSize)
      );

      const snapshot = await getDocs(spacesQuery);
      const spaces = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];

      console.log({ spaces, lastVisible });
      return { spaces, lastVisible };
    } catch (err) {
      console.error("Error refreshing spaces:", err);
      throw err;
    }
  };

  const createSpace = async (
    activity,
    bubbleTitle,
    category,
    coverImage, // file
    caption,
    hostId,
    hostName,
    profileImageUrl,
    mood,
    queueInputs = {}
  ) => {
    try {
      if (
        !activity ||
        !bubbleTitle ||
        !category ||
        !coverImage ||
        !caption ||
        !hostId ||
        !hostName ||
        !profileImageUrl ||
        !mood
      ) {
        throw new Error(
          "All base fields are required. Please fill in all fields."
        );
      }

      const newDocRef = doc(collection(db, "spaces"));
      const docId = newDocRef.id;

      const coverRef = ref(storage, `spaces/${docId}.jpg`);
      await uploadBytes(coverRef, coverImage);
      const coverUrl = await getDownloadURL(coverRef);

      const createdAt = serverTimestamp();

      const baseData = {
        activity,
        bubbleTitle,
        category,
        coverUrl,
        caption,
        disabled: false,
        hostId,
        hostName,
        likesCount: 0,
        profileImageUrl,
        membersCount: 1,
        mood,
        createdAt,
      };

      const queueData = {
        addedAt: createdAt,
        addedById: hostId,
        addedByName: hostName,
        artist: queueInputs.artist || null,
        assetId: queueInputs.assetId || null,
        assetName: queueInputs.assetName || null,
        coverUrl: queueInputs.coverUrl || coverUrl,
        genre: queueInputs.genre || null,
        previewUrl: queueInputs.previewUrl || null,
        profileImageUrl,
        year: queueInputs.year || null,
      };

      const userDocRef = doc(db, `users/${hostId}`);
      const userSpaceRef = doc(db, `users/${hostId}/spaces`, docId);

      await runTransaction(db, async (transaction) => {
        // 1. Create the main space doc
        transaction.set(newDocRef, baseData);

        // 2. Add the first queue item
        const queueRef = doc(collection(newDocRef, "queue"));
        transaction.set(queueRef, queueData);

        // 3. Add host as the first member
        const membersRef = doc(collection(newDocRef, "members"), hostId);
        transaction.set(membersRef, {
          memberId: hostId,
          name: hostName,
          profileUrl: profileImageUrl,
          joinedAt: createdAt,
          isHost: true,
        });

        // 4. Add the space ID as a doc with no fields
        transaction.set(userSpaceRef, {});

        // 5. Increment spacesCount atomically
        transaction.update(userDocRef, {
          spacesCount: increment(1),
        });
      });

      console.log("Space created with ID:", docId);
    } catch (error) {
      console.error("Error creating space:", error);
      throw error;
    }
  };

  const generateKeywords = (
    mood,
    activity,
    bubbleTitle,
    category,
    hostName
  ) => {
    const fields = [mood, activity, bubbleTitle, category, hostName];
    const keywordSet = new Set();

    // Add full bubbleTitle and hostName as-is
    if (bubbleTitle) keywordSet.add(bubbleTitle.toLowerCase().trim());
    if (hostName) keywordSet.add(hostName.toLowerCase().trim());

    fields.forEach((field) => {
      if (!field) return;

      const words = field.toLowerCase().split(/\s+/);
      words.forEach((word) => {
        keywordSet.add(word); // full word

        for (let i = 3; i < word.length; i++) {
          keywordSet.add(word.slice(0, i)); // prefixes ≥3
        }
      });
    });

    return Array.from(keywordSet);
  };

  const addKeywordsToSpace = async (spaceId) => {
    try {
      const spaceRef = doc(db, "spaces", spaceId);
      const snap = await getDoc(spaceRef);

      if (!snap.exists()) {
        throw new Error(`Space with ID ${spaceId} not found`);
      }

      const data = snap.data();

      const keywords = generateKeywords(
        data.mood,
        data.activity,
        data.bubbleTitle,
        data.category,
        data.hostName
      );

      await updateDoc(spaceRef, {
        keywords,
      });

      console.log(`✅ Keywords updated for space ${spaceId}`);
    } catch (error) {
      console.error("❌ Error adding keywords to space:", error);
    }
  };

  // const generateKeywords = (
  //   mood,
  //   activity,
  //   bubbleTitle,
  //   category,
  //   hostName
  // ) => {
  //   const fields = [mood, activity, bubbleTitle, category, hostName];
  //   const keywordSet = new Set();

  //   if (bubbleTitle) keywordSet.add(bubbleTitle.toLowerCase().trim());
  //   if (hostName) keywordSet.add(hostName.toLowerCase().trim());

  //   fields.forEach((field) => {
  //     if (!field) return;

  //     const words = field.toLowerCase().split(/\s+/);

  //     words.forEach((word) => {
  //       keywordSet.add(word);

  //       for (let i = 3; i < word.length; i++) {
  //         keywordSet.add(word.slice(0, i));
  //       }
  //     });
  //   });

  //   return Array.from(keywordSet);
  // };

  const getUserSpaces = async (userId) => {
    try {
      // 1. Get the space IDs from user's subcollection
      const userSpacesRef = collection(db, "users", userId, "spaces");
      const userSpacesSnap = await getDocs(userSpacesRef);

      // 2. For each space ID, get the full space document from the top-level "spaces" collection
      const spaceDataPromises = userSpacesSnap.docs.map(async (docRef) => {
        const spaceId = docRef.id;
        const fullSpaceRef = doc(db, "spaces", spaceId);
        const fullSpaceSnap = await getDoc(fullSpaceRef);

        if (fullSpaceSnap.exists()) {
          return { id: spaceId, ...fullSpaceSnap.data() };
        } else {
          return null;
        }
      });

      // 3. Wait for all fetches and filter out any nulls
      const spaceData = await Promise.all(spaceDataPromises);
      console.log(spaceData);
      return spaceData.filter((space) => space !== null);
    } catch (error) {
      console.error("Error fetching user spaces:", error);
      return [];
    }
  };

  // const followUser = async (currentUserId, targetUserId) => {
  //   if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
  //     throw new Error("Invalid user IDs");
  //   }

  //   const currentUserRef = doc(db, `users/${currentUserId}`);
  //   const targetUserRef = doc(db, `users/${targetUserId}`);

  //   const followingRef = doc(
  //     db,
  //     `users/${currentUserId}/followings`,
  //     targetUserId
  //   );
  //   const followerRef = doc(
  //     db,
  //     `users/${targetUserId}/followers`,
  //     currentUserId
  //   );

  //   await runTransaction(db, async (transaction) => {
  //     // Check if already following
  //     const followingSnap = await transaction.get(followingRef);
  //     if (followingSnap.exists()) {
  //       throw new Error("Already following this user.");
  //     }

  //     // 1. Add to followings of current user
  //     transaction.set(followingRef, {});

  //     // 2. Add to followers of target user
  //     transaction.set(followerRef, {});

  //     // 3. Increment followingsCount for current user
  //     transaction.update(currentUserRef, {
  //       followingsCount: increment(1),
  //     });

  //     // 4. Increment followersCount for target user
  //     transaction.update(targetUserRef, {
  //       followersCount: increment(1),
  //     });
  //   });

  //   console.log(`User ${currentUserId} followed ${targetUserId}`);
  // };

  const followUser = async (currentUser, targetUserId) => {
    if (!currentUser?.id || !targetUserId || currentUser.id === targetUserId) {
      throw new Error("Invalid user IDs");
    }

    const currentUserId = currentUser.id;

    const currentUserRef = doc(db, `users/${currentUserId}`);
    const targetUserRef = doc(db, `users/${targetUserId}`);

    const followingRef = doc(
      db,
      `users/${currentUserId}/followings`,
      targetUserId
    );
    const followerRef = doc(
      db,
      `users/${targetUserId}/followers`,
      currentUserId
    );

    await runTransaction(db, async (transaction) => {
      const followingSnap = await transaction.get(followingRef);
      if (followingSnap.exists()) {
        throw new Error("Already following this user.");
      }

      // 1. Add to followings of current user
      transaction.set(followingRef, {});

      // 2. Add to followers of target user
      transaction.set(followerRef, {});

      // 3. Increment followingsCount for current user
      transaction.update(currentUserRef, {
        followingsCount: increment(1),
      });

      // 4. Increment followersCount for target user
      transaction.update(targetUserRef, {
        followersCount: increment(1),
      });
    });

    // 5. Add notification to target user
    const notificationRef = collection(
      db,
      "users",
      targetUserId,
      "notifications"
    );
    await addDoc(notificationRef, {
      sentAt: serverTimestamp(),
      sentById: currentUser.id,
      sentByName: currentUser.name || "",
      sentByPhotoUrl: currentUser.photoUrl || "",
      type: "follow",
      seen: false,
    });

    console.log(`User ${currentUserId} followed ${targetUserId}`);
  };

  const unfollowUser = async (currentUserId, targetUserId) => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      throw new Error("Invalid user IDs");
    }

    const currentUserRef = doc(db, `users/${currentUserId}`);
    const targetUserRef = doc(db, `users/${targetUserId}`);

    const followingRef = doc(
      db,
      `users/${currentUserId}/followings`,
      targetUserId
    );
    const followerRef = doc(
      db,
      `users/${targetUserId}/followers`,
      currentUserId
    );

    await runTransaction(db, async (transaction) => {
      const followingSnap = await transaction.get(followingRef);
      if (!followingSnap.exists()) {
        throw new Error("You're not following this user.");
      }

      // 1. Remove from followings of current user
      transaction.delete(followingRef);

      // 2. Remove from followers of target user
      transaction.delete(followerRef);

      // 3. Decrement followingsCount for current user
      transaction.update(currentUserRef, {
        followingsCount: increment(-1),
      });

      // 4. Decrement followersCount for target user
      transaction.update(targetUserRef, {
        followersCount: increment(-1),
      });
    });

    console.log(`User ${currentUserId} unfollowed ${targetUserId}`);
  };

  const isFollowing = async (currentUserId, targetUserId) => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      return false;
    }

    const followingRef = doc(
      db,
      `users/${currentUserId}/followings`,
      targetUserId
    );
    const followingSnap = await getDoc(followingRef);
    return followingSnap.exists();
  };

  const isFollowedBy = async (currentUserId, targetUserId) => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      return false;
    }

    const followerRef = doc(
      db,
      `users/${currentUserId}/followers`,
      targetUserId
    );
    const followerSnap = await getDoc(followerRef);
    return followerSnap.exists();
  };

  const blockUser = async (currentUserId, targetUserId) => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      throw new Error("Invalid user IDs");
    }

    const blockedRef = doc(
      db,
      `users/${targetUserId}/blockedByIds`,
      currentUserId
    );

    await runTransaction(db, async (transaction) => {
      const blockSnap = await transaction.get(blockedRef);
      if (blockSnap.exists()) {
        throw new Error("User is already blocked.");
      }

      // Add the blocking user to target user's blockedByIds
      transaction.set(blockedRef, {});
    });

    console.log(`User ${currentUserId} blocked ${targetUserId}`);
  };

  const unblockUser = async (currentUserId, targetUserId) => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      throw new Error("Invalid user IDs");
    }

    const blockedRef = doc(
      db,
      `users/${targetUserId}/blockedByIds`,
      currentUserId
    );

    await runTransaction(db, async (transaction) => {
      const blockSnap = await transaction.get(blockedRef);
      if (!blockSnap.exists()) {
        throw new Error("User is not blocked.");
      }

      transaction.delete(blockedRef);
    });

    console.log(`User ${currentUserId} unblocked ${targetUserId}`);
  };

  const getBlockedUsers = async (userId) => {
    try {
      const blockedRef = collection(db, "users", userId, "blockedByIds");
      const snapshot = await getDocs(blockedRef);

      const blockedUserIds = snapshot.docs.map((doc) => doc.id);

      const blockedUsers = [];

      for (const blockedId of blockedUserIds) {
        const userDocRef = doc(db, "users", blockedId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          blockedUsers.push({
            id: userDocSnap.id,
            ...userDocSnap.data(),
          });
        }
      }

      return blockedUsers;
    } catch (error) {
      console.error("Error fetching blocked users:", error);
      throw error;
    }
  };

  const hasBlocked = async (currentUserId, targetUserId) => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      return false;
    }

    const blockedDocRef = doc(
      db,
      `users/${targetUserId}/blockedByIds`,
      currentUserId
    );

    const docSnap = await getDoc(blockedDocRef);
    return docSnap.exists();
  };

  const isBlockedBy = async (currentUserId, targetUserId) => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      return false;
    }

    const blockedDocRef = doc(
      db,
      `users/${currentUserId}/blockedByIds`,
      targetUserId
    );

    const docSnap = await getDoc(blockedDocRef);
    return docSnap.exists();
  };

  const reportUser = async (currentUserId, targetUserId) => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      throw new Error("Invalid user IDs");
    }

    const reportRef = doc(
      db,
      `users/${targetUserId}/reportedByIds`,
      currentUserId
    );

    await runTransaction(db, async (transaction) => {
      const reportSnap = await transaction.get(reportRef);
      if (reportSnap.exists()) {
        throw new Error("User has already been reported.");
      }

      // Add the reporting user to target user's reportedByIds
      transaction.set(reportRef, {});
    });

    console.log(`User ${currentUserId} reported ${targetUserId}`);
  };

  // const joinSpace = async (spaceId, memberId, name, profileUrl) => {
  //   if (!spaceId || !memberId || !name || !profileUrl) {
  //     throw new Error("Missing required fields to join the space.");
  //   }

  //   const spaceRef = doc(db, "spaces", spaceId);
  //   const memberRef = doc(spaceRef, "members", memberId);

  //   await runTransaction(db, async (transaction) => {
  //     const memberSnap = await transaction.get(memberRef);
  //     if (memberSnap.exists()) {
  //       throw new Error("User is already a member of this space.");
  //     }

  //     transaction.set(memberRef, {
  //       memberId,
  //       name,
  //       profileUrl,
  //       joinedAt: serverTimestamp(),
  //       isHost: false,
  //     });

  //     // Optional: increment membersCount in the main space doc
  //     transaction.update(spaceRef, {
  //       membersCount: increment(1),
  //     });
  //   });

  //   console.log(`User ${memberId} joined space ${spaceId}`);
  // };

  const joinSpace = async (spaceId, user) => {
    if (!spaceId || !user?.id || !user.name || !user.photoUrl) {
      throw new Error("Missing required fields to join the space.");
    }

    const memberId = user.id;
    const spaceRef = doc(db, "spaces", spaceId);
    const memberRef = doc(spaceRef, "members", memberId);

    // ✅ Step 1: Pre-fetch space data
    const spaceSnap = await getDoc(spaceRef);
    if (!spaceSnap.exists()) {
      throw new Error("Space not found.");
    }

    const spaceData = spaceSnap.data();
    const spaceOwnerId = spaceData?.hostId;

    if (!spaceOwnerId) {
      throw new Error("Space owner ID not found.");
    }

    // ✅ Step 2: Transaction to safely join the space
    await runTransaction(db, async (transaction) => {
      const memberSnap = await transaction.get(memberRef);
      if (memberSnap.exists()) {
        throw new Error("User is already a member of this space.");
      }

      // Set member document
      transaction.set(memberRef, {
        memberId,
        name: user.name,
        profileUrl: user.photoUrl,
        joinedAt: serverTimestamp(),
        isHost: false,
      });

      // Increment members count
      transaction.update(spaceRef, {
        membersCount: increment(1),
      });
    });

    // ✅ Step 3: Notify space owner (if the user isn’t the owner)
    const notificationRef = collection(
      db,
      "users",
      spaceOwnerId,
      "notifications"
    );
    await addDoc(notificationRef, {
      sentAt: serverTimestamp(),
      sentById: user.id,
      sentByName: user.name,
      sentByPhotoUrl: user.photoUrl,
      spaceId,
      spaceTitle: spaceData?.bubbleTitle || "",
      spaceCat: spaceData?.category || "",
      type: "join",
      seen: false,
    });

    console.log(`User ${user.id} joined space ${spaceId}`);
  };

  const leaveSpace = async (spaceId, memberId) => {
    if (!spaceId || !memberId) {
      throw new Error("Missing space ID or member ID.");
    }

    const spaceRef = doc(db, "spaces", spaceId);
    const memberRef = doc(spaceRef, "members", memberId);

    await runTransaction(db, async (transaction) => {
      const memberSnap = await transaction.get(memberRef);
      if (!memberSnap.exists()) {
        throw new Error("User is not a member of this space.");
      }

      const isHost = memberSnap.data()?.isHost;
      if (isHost) {
        throw new Error("Host cannot leave the space.");
      }

      transaction.delete(memberRef);

      // Optional: Decrease members count
      transaction.update(spaceRef, {
        membersCount: increment(-1),
      });
    });

    console.log(`User ${memberId} left space ${spaceId}`);
  };

  // const isMemberOfSpace = async (spaceId, memberId) => {
  //   if (!spaceId || !memberId) {
  //     return false;
  //   }

  //   const memberRef = doc(db, `spaces/${spaceId}/members`, memberId);
  //   const memberSnap = await getDoc(memberRef);
  //   return memberSnap.exists();
  // };

  const isMemberOfSpace = async (spaceId, memberId) => {
    if (!spaceId || !memberId) {
      console.log("Missing spaceId or memberId.");
      return { isMember: false, isHost: false };
    }

    const memberRef = doc(db, `spaces/${spaceId}/members`, memberId);
    const memberSnap = await getDoc(memberRef);

    if (!memberSnap.exists()) {
      console.log("User is NOT a member of the space.");
      return { isMember: false, isHost: false };
    }

    const data = memberSnap.data();
    const result = {
      isMember: true,
      isHost: !!data.isHost,
    };

    console.log(
      `🟢 User is a member of the space. Host status: ${result.isHost}`
    );
    return result;
  };

  const getSpacesFromFollowings = async (userId) => {
    try {
      const followingsRef = collection(db, `users/${userId}/followings`);
      const followingsSnap = await getDocs(followingsRef);
      const followingIds = followingsSnap.docs.map((doc) => doc.id);

      const allSpaces = [];

      // Firestore `in` query supports up to 10 values at a time
      for (let i = 0; i < followingIds.length; i += 10) {
        const batch = followingIds.slice(i, i + 10);

        const spacesQuery = query(
          collection(db, "spaces"),
          where("hostId", "in", batch)
        );

        const batchSnap = await getDocs(spacesQuery);
        batchSnap.forEach((doc) => {
          allSpaces.push({ id: doc.id, ...doc.data() });
        });
      }

      // Sort by createdAt (Firestore Timestamp) descending
      allSpaces.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

      console.log(allSpaces);
      return allSpaces;
    } catch (error) {
      console.error("Error fetching spaces from followings:", error);
      return [];
    }
  };

  const updateUserMoodAndActivity = async (userId, mood, activity) => {
    if (!userId || !mood || !activity) {
      throw new Error("User ID, mood, and activity are required.");
    }

    const userRef = doc(db, "users", userId);

    try {
      await updateDoc(userRef, {
        mood,
        activity,
      });
    } catch (error) {
      console.error("Error updating user mood and activity:", error);
      throw error;
    }
  };

  const getSpaceWithQueue = async (spaceId) => {
    try {
      // 1. Get the main space document
      const spaceRef = doc(db, "spaces", spaceId);
      const spaceSnap = await getDoc(spaceRef);

      if (!spaceSnap.exists()) {
        throw new Error(`Space with ID ${spaceId} does not exist`);
      }

      const spaceData = { id: spaceSnap.id, ...spaceSnap.data() };

      // 2. Get all documents from the "queue" subcollection
      const queueRef = collection(spaceRef, "queue");
      const queueQuery = query(queueRef, orderBy("addedAt", "asc"));
      const queueSnap = await getDocs(queueQuery);

      const queueItems = queueSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log({ spaceData, queueItems });

      return {
        space: spaceData,
        queue: queueItems,
      };
    } catch (error) {
      console.error("Error getting space with queue:", error);
      throw error;
    }
  };

  const addSongToQueue = async (spaceId, song, user) => {
    try {
      const spaceRef = doc(db, "spaces", spaceId);
      const queueRef = collection(spaceRef, "queue");

      const queueDoc = {
        addedAt: serverTimestamp(),
        addedById: user.id,
        addedByName: user.name,
        profileImageUrl: user.photoUrl || "",
        assetId: song.id,
        assetName: song.attributes.name,
        artist: song.attributes.artistName,
        coverUrl:
          song.attributes.artwork?.url
            ?.replace("{w}", "100")
            ?.replace("{h}", "100") || "",
        genre: song.attributes.genreNames?.[0] || "",
        year: song.attributes.releaseDate?.split("-")[0] || "",
      };

      const docRef = await addDoc(queueRef, queueDoc);
      console.log("Song added to queue with ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Error adding song to queue:", error);
      throw error;
    }
  };

  const fetchFollowersData = async (userId) => {
    if (!userId) {
      throw new Error("User ID is required.");
    }

    const followersRef = collection(db, `users/${userId}/followers`);

    try {
      const snapshot = await getDocs(followersRef);

      const followerIds = snapshot.docs.map((doc) => doc.id);

      const followerDataPromises = followerIds.map(async (id) => {
        const userDoc = await getDoc(doc(db, "users", id));
        return userDoc.exists() ? { id, ...userDoc.data() } : null;
      });

      const followersData = (await Promise.all(followerDataPromises)).filter(
        Boolean
      );

      console.log(followersData);
      return followersData;
    } catch (error) {
      console.error("Error fetching followers' data:", error);
      throw error;
    }
  };

  const fetchMembersFromSpace = async (spaceId) => {
    if (!spaceId) {
      throw new Error("Space ID is required.");
    }

    const membersRef = collection(db, `spaces/${spaceId}/members`);

    try {
      const snapshot = await getDocs(membersRef);
      const members = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log(members);
      return members;
    } catch (error) {
      console.error("Error fetching space members:", error);
      throw error;
    }
  };

  const sendMessageToSpace = async (
    spaceId,
    username,
    photoUrl,
    message,
    type,
    gifUrl = null
  ) => {
    console.log(spaceId, username, photoUrl, message, type);
    if (!spaceId || !username || !photoUrl || !message || !type) {
      throw new Error("Missing required fields to send a message.");
    }

    const chatRef = collection(db, `spaces/${spaceId}/chat`);

    const messageData = {
      addedByName: username,
      profilePhotoUrl: photoUrl,
      message,
      type,
      gifUrl: type === "gif" ? gifUrl : null,
      addedAt: serverTimestamp(),
    };

    await addDoc(chatRef, messageData);
  };

  const [messages, setMessages] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);

  const loadInitialMessages = async (spaceId) => {
    if (!spaceId) throw new Error("Space ID is required.");

    const chatRef = collection(db, `spaces/${spaceId}/chat`);
    const q = query(chatRef, orderBy("addedAt", "desc"), limit(2));

    const snapshot = await getDocs(q);

    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

    return { messages, lastDoc };
  };

  const loadOlder = async () => {
    if (!lastDoc) return;
    const { messages: olderMessages, lastDoc: newLastDoc } =
      await loadMoreMessages(spaceId, lastDoc);
    setMessages((prev) => [...prev, ...olderMessages]);
    setLastDoc(newLastDoc);
  };

  const loadMoreMessages = async (spaceId, lastVisibleDoc) => {
    if (!spaceId || !lastVisibleDoc)
      throw new Error("Space ID and lastVisibleDoc are required.");

    const chatRef = collection(db, `spaces/${spaceId}/chat`);
    const q = query(
      chatRef,
      orderBy("addedAt", "desc"),
      startAfter(lastVisibleDoc),
      limit(2)
    );

    const snapshot = await getDocs(q);

    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

    return { messages, lastDoc: newLastDoc };
  };

  useEffect(() => {
    const fetchInitial = async () => {
      const { messages, lastDoc } = await loadInitialMessages(spaceId);
      setMessages(messages);
      setLastDoc(lastDoc);
    };

    fetchInitial();
  }, []);

  // const likeSpace = async (spaceId, userId) => {
  //   if (!spaceId || !userId) {
  //     throw new Error("spaceId and userId are required.");
  //   }

  //   const spaceRef = doc(db, "spaces", spaceId);
  //   const likeRef = doc(db, `spaces/${spaceId}/likedByIds`, userId);

  //   await runTransaction(db, async (transaction) => {
  //     const likeSnap = await transaction.get(likeRef);
  //     if (likeSnap.exists()) {
  //       throw new Error("User already liked this space.");
  //     }

  //     // Add userId to likedByIds subcollection
  //     transaction.set(likeRef, { likedAt: new Date().toISOString() });
  //   });
  // };

  const likeSpace = async (spaceId, user) => {
    if (!spaceId || !user?.id || !user.name || !user.photoUrl) {
      throw new Error("Missing required fields to like the space.");
    }

    const spaceRef = doc(db, "spaces", spaceId);
    const likeRef = doc(db, `spaces/${spaceId}/likedByIds`, user.id);

    // ✅ Step 1: Pre-fetch space data
    const spaceSnap = await getDoc(spaceRef);
    if (!spaceSnap.exists()) {
      throw new Error("Space not found.");
    }

    const spaceData = spaceSnap.data();
    const hostId = spaceData?.hostId;

    if (!hostId) {
      throw new Error("Space owner ID not found.");
    }

    // ✅ Step 2: Transaction to safely like the space
    await runTransaction(db, async (transaction) => {
      const likeSnap = await transaction.get(likeRef);
      if (likeSnap.exists()) {
        throw new Error("User already liked this space.");
      }

      transaction.set(likeRef, {
        likedAt: serverTimestamp(),
      });
    });

    // ✅ Step 3: Send notification to host (if user isn’t host)

    const notificationRef = collection(db, "users", hostId, "notifications");
    await addDoc(notificationRef, {
      sentAt: serverTimestamp(),
      sentById: user.id,
      sentByName: user.name,
      sentByPhotoUrl: user.photoUrl,
      spaceId,
      spaceTitle: spaceData?.bubbleTitle || "",
      spaceCat: spaceData?.category || "",
      type: "like",
      seen: false,
    });

    console.log(`User ${user.id} liked space ${spaceId}`);
  };

  const unlikeSpace = async (spaceId, userId) => {
    if (!spaceId || !userId) {
      throw new Error("spaceId and userId are required.");
    }

    const likeRef = doc(db, `spaces/${spaceId}/likedByIds`, userId);

    await runTransaction(db, async (transaction) => {
      const likeSnap = await transaction.get(likeRef);
      if (!likeSnap.exists()) {
        throw new Error("User hasn't liked this space.");
      }

      // Remove the user's like document
      transaction.delete(likeRef);
    });
  };

  const hasUserLikedSpace = async (spaceId, userId) => {
    if (!spaceId || !userId) {
      throw new Error("spaceId and userId are required.");
    }

    const likeRef = doc(db, `spaces/${spaceId}/likedByIds`, userId);
    const likeSnap = await getDoc(likeRef);
    return likeSnap.exists();
  };

  // fetch requests

  const [hasNewRequest, setHasNewRequest] = useState(false);

  const getRequests = async (spaceId) => {
    try {
      const reqRef = collection(db, "spaces", spaceId, "requests");
      const q = query(reqRef, orderBy("addedAt", "desc"), limit(20));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching requests:", error);
      throw error;
    }
  };

  // const listenToNewRequest = (spaceId, callback) => {
  //   const reqRef = collection(db, "spaces", spaceId, "requests");
  //   const q = query(reqRef, orderBy("addedAt", "desc"), limit(1));

  //   const unsubscribe = onSnapshot(q, (snapshot) => {
  //     console.log("Snapshot size:", snapshot.size);
  //     const latest = snapshot.docs[0]?.data();
  //     console.log("Latest doc:", latest);
  //     if (latest && !latest.seen) {
  //       console.log("New unseen request detected!");
  //       callback(true);
  //     } else {
  //       console.log("No new unseen request.");
  //       callback(false);
  //     }
  //   });

  //   return unsubscribe;
  // };

  // useEffect(() => {
  //   if (!spaceId) return;

  //   console.log("Listening to requests for space:", spaceId);

  //   const unsubscribe = listenToNewRequest(spaceId, (isNew) => {
  //     console.log("Callback triggered, new request:", isNew);
  //     setHasNewRequest(isNew);
  //   });

  //   return () => unsubscribe();
  // }, [spaceId]);

  const markRequestAsSeen = async (spaceId, requestId) => {
    try {
      const reqRef = doc(db, "spaces", spaceId, "requests", requestId);
      await updateDoc(reqRef, { seen: true });
    } catch (error) {
      console.error("Error marking request as seen:", error);
      throw error;
    }
  };

  // get user from userId

  const getUserById = async (userId) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        console.log({
          success: true,
          user: { id: userSnap.id, ...userSnap.data() },
        });
        return { success: true, user: { id: userSnap.id, ...userSnap.data() } };
      } else {
        return { success: false, error: "User not found" };
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      return { success: false, error: error.message };
    }
  };

  // fetch notifications

  const [notifications, setNotifications] = useState([]);

  // const listenToNotifications = (userId, callback) => {
  //   const notificationsRef = collection(db, "users", userId, "notifications");
  //   const q = query(notificationsRef, orderBy("addedAt", "desc"));

  //   const unsubscribe = onSnapshot(q, (snapshot) => {
  //     const notifications = snapshot.docs.map((doc) => ({
  //       id: doc.id,
  //       ...doc.data(),
  //     }));
  //     callback(notifications);
  //   });

  //   return unsubscribe;
  // };

  // useEffect(() => {
  //   if (!userId) return;

  //   const unsubscribe = listenToNotifications(userId, (notifications) => {
  //     setNotifications(notifications);
  //   });

  //   return () => unsubscribe(); // Cleanup on unmount
  // }, [userId]);

  // search spaces

  // const searchSpacesByFields = async (searchTerm) => {
  //   try {
  //     const spacesRef = collection(db, "spaces");

  //     // Generate different case formats
  //     const lower = searchTerm.toLowerCase();
  //     const upper = searchTerm.toUpperCase();
  //     const title =
  //       searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase();
  //     const sentence =
  //       searchTerm[0].toUpperCase() + searchTerm.slice(1).toLowerCase(); // Same as title for single word

  //     const variants = [lower, upper, title, sentence];

  //     const fields = ["mood", "activity", "category", "hostName"];

  //     // Create a query for each field-case combination
  //     const queries = [];
  //     for (const field of fields) {
  //       for (const variant of variants) {
  //         queries.push(query(spacesRef, where(field, "==", variant)));
  //       }
  //     }

  //     const results = await Promise.all(queries.map(getDocs));

  //     // Merge results and remove duplicates
  //     const seen = new Set();
  //     const mergedResults = [];
  //     results.forEach((snapshot) => {
  //       snapshot.forEach((doc) => {
  //         if (!seen.has(doc.id)) {
  //           seen.add(doc.id);
  //           mergedResults.push({ id: doc.id, ...doc.data() });
  //         }
  //       });
  //     });

  //     console.log(mergedResults);

  //     return { success: true, results: mergedResults };
  //   } catch (error) {
  //     console.error("Search error:", error);
  //     return { success: false, error: error.message };
  //   }
  // };

  const searchSpacesByKeyword = async (searchTerm) => {
    if (!searchTerm || typeof searchTerm !== "string") return [];

    const lowerTerm = searchTerm.toLowerCase().trim();

    // 1. Search spaces by keyword
    const q = query(
      collection(db, "spaces"),
      where("keywords", "array-contains", lowerTerm),
      orderBy("likesCount", "desc"),
      limit(20)
    );

    const snapshot = await getDocs(q);
    const spaces = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // 2. For each host, fetch their status from Firestore /users/{hostId}
    const enrichedSpaces = await Promise.all(
      spaces.map(async (space) => {
        const hostRef = doc(db, "users", space.hostId);
        try {
          const hostSnap = await getDoc(hostRef);
          const hostData = hostSnap.exists() ? hostSnap.data() : {};

          return {
            ...space,
            hostStatus: hostData.status || "offline",
          };
        } catch (err) {
          console.warn(`Error fetching host ${space.hostId}:`, err);
          return {
            ...space,
            hostStatus: "offline",
          };
        }
      })
    );

    console.log(enrichedSpaces);

    return enrichedSpaces;
  };

  const searchUserProfiles = async (searchTerm) => {
    if (!searchTerm) return [];

    const usersRef = collection(db, "users");

    // Generate different case formats
    const lower = searchTerm.toLowerCase();
    const upper = searchTerm.toUpperCase();
    const title =
      searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase();
    const sentence =
      searchTerm[0].toUpperCase() + searchTerm.slice(1).toLowerCase(); // Same as title for single word

    const variants = [lower, upper, title, sentence];

    // Create queries for each case variant
    const queries = variants.map((term) =>
      query(usersRef, orderBy("name"), startAt(term), endAt(term + "\uf8ff"))
    );

    try {
      const results = await Promise.all(queries.map(getDocs));

      // Merge results and remove duplicates
      const seen = new Set();
      const mergedResults = [];
      results.forEach((snapshot) => {
        snapshot.forEach((doc) => {
          if (!seen.has(doc.id)) {
            seen.add(doc.id);
            mergedResults.push({ id: doc.id, ...doc.data() });
          }
        });
      });

      console.log(mergedResults);
      return mergedResults;
    } catch (error) {
      console.error("Error searching users:", error);
      return [];
    }
  };

  const fetchRandomSpaces = async () => {
    const spacesRef = collection(db, "spaces");

    // Step 1: Fetch first 20 doc IDs ordered by doc ID
    const first20Query = query(spacesRef, orderBy("__name__"), limit(20));
    const first20Snapshot = await getDocs(first20Query);

    if (first20Snapshot.empty) return [];

    // Step 2: Extract all doc IDs
    const docIds = first20Snapshot.docs.map((doc) => doc.id);

    // Step 3: Pick random doc ID
    const randomIndex = Math.floor(Math.random() * docIds.length);
    const randomDocId = docIds[randomIndex];

    // Step 4: Fetch 10 docs starting at randomDocId
    const randomStartQuery = query(
      spacesRef,
      orderBy("__name__"),
      startAt(randomDocId),
      limit(10)
    );

    const snapshot = await getDocs(randomStartQuery);

    if (snapshot.empty) return [];

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  };

  // const listenToNewChatMessage = (spaceId, callback) => {
  //   const chatRef = collection(db, "spaces", spaceId, "chat");
  //   const q = query(chatRef, orderBy("timestamp", "desc"), limit(1));

  //   const unsubscribe = onSnapshot(q, (snapshot) => {
  //     const latest = snapshot.docs[0]?.data();
  //     if (latest) {
  //       callback(latest);
  //     } else {
  //       callback(null);
  //     }
  //   });

  //   return unsubscribe;
  // };

  // useEffect(() => {
  //   if (!spaceId) return;

  //   const unsubscribe = listenToNewChatMessage(spaceId, (newMessage) => {
  //     if (newMessage) {
  //       console.log("🟢 New chat message detected:", newMessage);
  //     } else {
  //       console.log("⚪ No chat message found.");
  //     }
  //   });

  //   // Cleanup on unmount
  //   return () => {
  //     unsubscribe();
  //   };
  // }, [spaceId]);

  return (
    <div className="funcs-container">
      <h2>Firebase Function Tester</h2>
      <div className="function-block">
        <h3>Create Space</h3>
        <input type="file" onChange={handleFileChange} />
        <button
          onClick={() =>
            createSpace(
              "journaling",
              "For scribbled truths, silent screams, and sentences that almost say it all.",
              "music",
              imageFile,
              "When you're pouring your heart out in cursive but pretending it’s just ink.",
              "v15o3rit7nNPTiTQHW0u08ThEx42",
              "Dipin Chopra",
              "https://firebasestorage.googleapis.com/v0/b/plugged-dev-252d8.firebasestorage.app/o/userPhotos%2Fdefault_pic.png?alt=media&token=d0facec0-fdca-4267-beae-1522947c3941",
              "fake fine",
              {
                artist: "Sia",
                assetId: "882945383",
                assetName: "Chandelier",
                coverUrl:
                  "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/00/bf/72/00bf72a2-3e50-e5e7-ae78-dc35bbf9bcda/886444578219.jpg/100x100bb.jpg",
                previewUrl:
                  "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/42/18/1d/42181d34-d6aa-71de-4ec9-c4f9efe78690/mzaf_18195570915402914768.plus.aac.p.m4a",
                profileImageUrl:
                  "https://firebasestorage.googleapis.com/v0/b/plugged-dev-252d8.firebasestorage.app/o/userPhotos%2Fdefault_pic.png?alt=media&token=d0facec0-fdca-4267-beae-1522947c3941",
              }
            )
          }
        >
          Create Space
        </button>
        {result && <div className="result">{result}</div>}
      </div>

      <div className="function-block">
        <h3>Add keywords to space</h3>
        <button onClick={() => addKeywordsToSpace("znzKpJXmlXD7k48zx6mc")}>
          Add keywords
        </button>
      </div>

      <div className="function-block">
        <h3>Create user in firestore</h3>
        <input type="file" onChange={handleFileChange} />
        <button
          onClick={() =>
            createUser(
              "v15o3rit7nNPTiTQHW0u08ThEx42",
              "Dipin Chopra",
              "chill",
              "waiting",
              imageFile
            )
          }
        >
          Create user
        </button>
      </div>
      <div className="function-block">
        <h3>Get bubbles based on mood and activity</h3>
        <button onClick={() => loadMoreSpaces(mood, activity)}>
          Load more spaces
        </button>
      </div>
      <div className="function-block">
        <h3>Get bubbles based on mood and activity</h3>
        <button onClick={() => refreshSpacesList(mood, activity)}>
          Refresh spaces
        </button>
      </div>
      <div className="function-block">
        <h3>Follow user</h3>
        <button onClick={() => followUser(user, targetId)}>Follow user</button>
      </div>
      <div className="function-block">
        <h3>Unfollow user</h3>
        <button onClick={() => unfollowUser(sourceId, targetId)}>
          Unfollow user
        </button>
      </div>
      <div className="function-block">
        <h3>Do I follow the user</h3>
        <button onClick={() => isFollowing(sourceId, targetId)}>
          Am I a follower ?
        </button>
      </div>
      <div className="function-block">
        <h3>Does this user follow me</h3>
        <button onClick={() => isFollowedBy(sourceId, targetId)}>
          Am I being followed ?
        </button>
      </div>
      <div className="function-block">
        <h3>Block user</h3>
        <button onClick={() => blockUser(sourceId, targetId)}>
          Block user
        </button>
      </div>
      <div className="function-block">
        <h3>Unblock user</h3>
        <button onClick={() => unblockUser(sourceId, targetId)}>
          Unblock user
        </button>
      </div>
      <div className="function-block">
        <h3>Have I blocked this user</h3>
        <button onClick={() => hasBlocked(sourceId, targetId)}>
          Have I blocked this user ?
        </button>
      </div>
      <div className="function-block">
        <h3>Am I blocked by this user</h3>
        <button onClick={() => isBlockedBy(sourceId, targetId)}>
          Am I blocked ?
        </button>
      </div>
      <div className="function-block">
        <h3>Join Space</h3>
        <button onClick={() => joinSpace(spaceId, user)}>join</button>
      </div>

      <div className="function-block">
        <h3>Am I a member ?</h3>
        <button onClick={() => isMemberOfSpace(spaceId, memberId)}>
          Am I a member ?
        </button>
      </div>
      <div className="function-block">
        <h3>Get Spaces from followings</h3>
        <button onClick={() => getSpacesFromFollowings(user.id)}>Get</button>
      </div>
      <div className="function-block">
        <h3>Get Space Data</h3>
        <button onClick={() => getSpaceWithQueue(spaceId)}>Get</button>
      </div>
      <div className="function-block">
        <h3>Add to queue</h3>
        <button onClick={() => addSongToQueue(spaceId, song5, user)}>
          Add
        </button>
      </div>
      <div className="function-block">
        <h3>Fetch followers's data</h3>
        <button onClick={() => fetchFollowersData(sourceId)}>Fetch</button>
      </div>
      <div className="function-block">
        <h3>Fetch members</h3>
        <button onClick={() => fetchMembersFromSpace(spaceId)}>Fetch</button>
      </div>
      <div className="function-block">
        <h3>Send messages</h3>
        <button
          onClick={() =>
            sendMessageToSpace(spaceId, name, profileUrl, message, type)
          }
        >
          Send
        </button>
      </div>
      <div className="function-block">
        <h3>Load more messages</h3>
        <button onClick={() => loadOlder()}>Fetch</button>
      </div>
      <div className="function-block">
        <h3>Search spaces through search term</h3>
        <button onClick={() => searchSpacesByKeyword("dipin")}>Fetch</button>
      </div>
      <div className="function-block">
        <h3>Search users</h3>
        <button onClick={() => searchUserProfiles("dipin")}>Fetch</button>
      </div>
      <div className="function-block">
        <h3>Search spaces</h3>
        <button onClick={() => getUserSpaces(userId)}>Fetch</button>
      </div>
      <div className="function-block">
        <h3>Search spaces</h3>
        <button onClick={() => fetchRandomSpaces()}>Fetch</button>
      </div>
      <div className="function-block">
        <h3>Like space</h3>
        <button onClick={() => likeSpace(spaceId, user)}>like</button>
      </div>
      <div className="function-block">
        <h3>Get user by id</h3>
        <button onClick={() => getUserById(userId)}>like</button>
      </div>
      {/* <div className="function-block">
        <h3>Update User Profile</h3>
        <input
          type="text"
          placeholder="Enter User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <button onClick={updateUserProfile}>Update</button>
        {result && <div className="result">{result}</div>}
      </div> */}
      {/* Add more function blocks below as needed */}
    </div>
  );
};

export default Funcs;
