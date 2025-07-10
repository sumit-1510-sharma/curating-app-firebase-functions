import React from "react";
import "./SearchPage.css";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "./firebase";

const SearchPage = () => {
  const fetchSpacesFromListWithHostStatus = async (listDocId) => {
    try {
      // Step 1: Get the specified document from "lists"
      const listDocRef = doc(db, "lists", listDocId);
      const listDocSnap = await getDoc(listDocRef);

      if (!listDocSnap.exists()) {
        console.error(`Document "${listDocId}" not found in lists`);
        return [];
      }

      const data = listDocSnap.data();
      const spaceIds = data.ids;

      if (!Array.isArray(spaceIds) || spaceIds.length === 0) {
        return [];
      }

      // Step 2: Fetch all space documents
      const spaceFetchPromises = spaceIds.map((spaceId) => {
        return getDoc(doc(db, "spaces", spaceId));
      });

      const spaceDocSnaps = await Promise.all(spaceFetchPromises);

      // Step 3: Collect valid spaces and extract host IDs
      const spaces = [];
      const hostIdSet = new Set();

      spaceDocSnaps.forEach((snap) => {
        if (snap.exists()) {
          const spaceData = snap.data();
          const hostId = spaceData.hostId;

          spaces.push({
            id: snap.id,
            ...spaceData,
          });

          if (hostId) {
            hostIdSet.add(hostId);
          }
        }
      });

      const hostIds = Array.from(hostIdSet);

      // Step 4: Fetch host user documents
      const hostFetchPromises = hostIds.map((uid) => {
        return getDoc(doc(db, "users", uid));
      });

      const hostDocSnaps = await Promise.all(hostFetchPromises);

      // Step 5: Map hostId => status
      const hostStatusMap = {};
      hostDocSnaps.forEach((snap) => {
        if (snap.exists()) {
          const userData = snap.data();
          hostStatusMap[snap.id] = userData.status || "offline";
        }
      });

      // Step 6: Merge host status into each space
      const result = spaces.map((space) => ({
        ...space,
        hostStatus: hostStatusMap[space.hostId] || "offline",
      }));

      console.log(result);
      return result;
    } catch (error) {
      console.error(`Error fetching spaces from ${listDocId}:`, error);
      return [];
    }
  };

  const fetchPopularUsers = async () => {
    try {
      // Step 1: Get the "popular_users" document from the "lists" collection
      const listDocRef = doc(db, "lists", "popular_users");
      const listDocSnap = await getDoc(listDocRef);

      if (!listDocSnap.exists()) {
        console.error("popular_users document not found");
        return [];
      }

      const data = listDocSnap.data();
      const userIds = data.ids;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return [];
      }

      // Step 2: Fetch each user document using the IDs
      const userFetchPromises = userIds.map((uid) => {
        return getDoc(doc(db, "users", uid));
      });

      const userDocSnaps = await Promise.all(userFetchPromises);

      // Step 3: Extract and return user data
      const users = userDocSnaps
        .filter((snap) => snap.exists())
        .map((snap) => ({
          id: snap.id,
          ...snap.data(),
        }));

      return users;
    } catch (error) {
      console.error("Error fetching popular users:", error);
      return [];
    }
  };

  const fetchTrendyContent = async (listName) => {
    try {
      const itemsRef = collection(db, "lists", listName, "items");
      const q = query(itemsRef, orderBy("rank", "asc"));

      const querySnapshot = await getDocs(q);

      const results = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log(results);
      return results;
    } catch (error) {
      console.error(`Error fetching trendy content from "${listName}":`, error);
      return [];
    }
  };

  return (
    <div className="funcs-container">
      <div className="function-block">
        <h3>Get top 10 popular spaces</h3>
        <button
          onClick={() => fetchSpacesFromListWithHostStatus("latest_random")}
        >
          get spaces
        </button>
      </div>

      <div className="function-block">
        <h3>Get top popular users</h3>
        <button onClick={() => fetchPopularUsers()}>get users</button>
      </div>

      <div className="function-block">
        <h3>Get top popular users</h3>
        <button onClick={() => fetchTrendyContent("trendy_music")}>get trendy content</button>
      </div>
    </div>
  );
};

export default SearchPage;
