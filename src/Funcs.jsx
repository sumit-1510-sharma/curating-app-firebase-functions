import React, { useEffect, useState } from "react";
import "./Funcs.css";
import {
  collection,
  doc,
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
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";

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
  const [lastDoc, setLastDoc] = useState(null);

  const sourceId = "12345";
  const targetId = "54321";

  spaceId = "0ifF7IT7xHpjsBDG6Nmc";
  memberId = "12345";
  name = "sumit sharma";
  profileUrl =
    "https://plus.unsplash.com/premium_photo-1689568126014-06fea9d5d341?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8cHJvZmlsZXxlbnwwfHwwfHx8MA%3D%3D";

  const mood = "chill";
  const activity = "vibing";

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
      const defaultPhotoUrl =
        "https://firebasestorage.googleapis.com/v0/b/curating-app-1bb19.firebasestorage.app/o/userPhotos%2Fdefault_pic.png?alt=media&token=d38231ee-ef01-46bd-86e7-7b3e76df3d16";
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
    const { spaces: moreSpaces, lastVisible } = await getSpacesPaginated(
      mood,
      activity,
      lastDoc
    );
    setSpaces((prev) => [...prev, ...moreSpaces]);
    setLastDoc(lastVisible);
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
        // Insert startAfter before limit
        conditions.splice(conditions.length - 1, 0, startAfter(lastDoc));
      }

      const spacesQuery = query(spacesRef, ...conditions);

      const snapshot = await getDocs(spacesQuery);
      const spaces = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];

      console.log({ spaces, lastVisible });
      return { spaces, lastVisible };
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

  const followUser = async (currentUserId, targetUserId) => {
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
      // Check if already following
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

  const joinSpace = async (spaceId, memberId, name, profileUrl) => {
    if (!spaceId || !memberId || !name || !profileUrl) {
      throw new Error("Missing required fields to join the space.");
    }

    const spaceRef = doc(db, "spaces", spaceId);
    const memberRef = doc(spaceRef, "members", memberId);

    await runTransaction(db, async (transaction) => {
      const memberSnap = await transaction.get(memberRef);
      if (memberSnap.exists()) {
        throw new Error("User is already a member of this space.");
      }

      transaction.set(memberRef, {
        memberId,
        name,
        profileUrl,
        joinedAt: serverTimestamp(),
        isHost: false,
      });

      // Optional: increment membersCount in the main space doc
      transaction.update(spaceRef, {
        membersCount: increment(1),
      });
    });

    console.log(`User ${memberId} joined space ${spaceId}`);
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

  const isMemberOfSpace = async (spaceId, memberId) => {
    if (!spaceId || !memberId) {
      return false;
    }

    const memberRef = doc(db, `spaces/${spaceId}/members`, memberId);
    const memberSnap = await getDoc(memberRef);
    return memberSnap.exists();
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
      console.error("Error fetching spaces from followers:", error);
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

  return (
    <div className="funcs-container">
      <h2>Firebase Function Tester</h2>

      <div className="function-block">
        <h3>Create Space</h3>
        <input type="file" onChange={handleFileChange} />
        <button
          onClick={() =>
            createSpace(
              "avoiding responsibilities",
              "Pride and Prejudice Pause",
              "book",
              imageFile,
              "Indulge in classic romance and witty banter instead of chores.",
              "uid_book_06",
              "Snehal Joshi",
              "https://example.com/profiles/snehal.jpg",
              "romantic"
            )
          }
        >
          Create Space
        </button>
        {result && <div className="result">{result}</div>}
      </div>

      <div className="function-block">
        <h3>Create user in firestore</h3>
        <input type="file" onChange={handleFileChange} />
        <button
          onClick={() =>
            createUser("12345", "sumit", "chill", "driving", imageFile)
          }
        >
          Create user
        </button>
      </div>

      <div className="function-block">
        <h3>Get bubbles based on mood and activity</h3>
        <button onClick={() => loadMoreSpaces(mood, activity)}>
          Get bubbles
        </button>
      </div>
      <div className="function-block">
        <h3>Get bubbles based on mood and activity</h3>
        <button onClick={() => refreshSpacesList(mood, activity)}>
          Get bubbles
        </button>
      </div>

      <div className="function-block">
        <h3>Follow user</h3>
        <button onClick={() => followUser(sourceId, targetId)}>
          Follow user
        </button>
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
        <button onClick={() => joinSpace()}>join</button>
      </div>

      <div className="function-block">
        <h3>Get Spaces from followings</h3>
        <button onClick={() => getSpacesFromFollowings(spaceId, name)}>
          Get
        </button>
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
