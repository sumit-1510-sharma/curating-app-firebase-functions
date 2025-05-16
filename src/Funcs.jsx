import React, { useState } from "react";
import "./Funcs.css";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";

const Funcs = () => {
  // Example function state
  const [data, setData] = useState({
    bubbleTitle: "",
    category: "",
    description: "",
    host: "",
    mood: "",
    scope: "",
    type: "",
    movieTitle: "",
    showTitle: "",
    bookTitle: "",
    quote: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [result, setResult] = useState(null);

  const createUser = async (uid, name, mood, activity, imageFile = null) => {
    try {
      const defaultPhotoUrl = "https://yourdomain.com/default-user-image.png";
      let photoUrl = defaultPhotoUrl;

      if (imageFile) {
        const imageRef = ref(storage, `userPhotos/${uid}.jpg`);
        await uploadBytes(imageRef, imageFile);
        photoUrl = await getDownloadURL(imageRef);
      }

      const userRef = doc(db, "users", uid);
      await setDoc(userRef, {
        name,
        mood,
        activity,
        isBanned: false,
        photoUrl,
      });

      console.log(`User ${uid} created successfully.`);
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  };

  const getBubblesByMoodAndActivity = async (
    mood,
    activity,
    category = null
  ) => {
    try {
      const bubblesRef = collection(db, "bubbles");

      const conditions = [
        where("mood", "==", mood),
        where("activity", "==", activity),
      ];

      if (category) {
        conditions.push(where("category", "==", category));
      }

      const bubblesQuery = query(bubblesRef, ...conditions);
      const querySnapshot = await getDocs(bubblesQuery);

      const bubbles = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log(bubbles);
      return bubbles;
    } catch (error) {
      console.error("Error fetching bubbles:", error);
      throw error;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    const res = await createBubble(data, imageFile);
    setResult(
      res.success ? `Bubble created with ID: ${res.id}` : `Error: ${res.error}`
    );
  };

  const createBubble = async (data, imageFile) => {
    if (!imageFile) return;
    const { category } = data;

    try {
      // Step 1: Pre-generate Firestore doc ID
      const bubbleRef = doc(collection(db, "bubbles"));
      const bubbleId = bubbleRef.id;

      // Step 2: Upload image using bubbleId as filename
      const storageRef = ref(storage, `bubbles/${bubbleId}`);
      await uploadBytes(storageRef, imageFile);
      const coverUrl = await getDownloadURL(storageRef);

      // Step 3: Build the bubble object based on category
      let bubble = {
        bubbleTitle: data.bubbleTitle,
        category: data.category,
        coverUrl: coverUrl,
        description: data.description,
        host: data.host,
        mood: data.mood,
        scope: data.scope,
      };

      switch (category) {
        case "music":
          bubble = {
            ...bubble,
            type: data.type || "", // track, playlist, album
          };
          break;

        case "movie":
          bubble = {
            ...bubble,
            movieTitle: data.movieTitle || "",
          };
          break;

        case "tvshow":
          bubble = {
            ...bubble,
            showTitle: data.showTitle || "",
          };
          break;

        case "link":
          bubble = {
            ...bubble,
          };
          break;

        case "book":
          bubble = {
            ...bubble,
            bookTitle: data.bookTitle || "",
            quote: data.quote || "",
          };
          break;

        default:
          throw new Error(`Unsupported category: ${category}`);
      }

      // Step 4: Write to Firestore
      await setDoc(bubbleRef, bubble);

      return { success: true, id: bubbleId };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  return (
    <div className="funcs-container">
      <h2>Firebase Function Tester</h2>

      <div className="function-block">
        <h3>Create Bubble</h3>

        <input
          name="bubbleTitle"
          type="text"
          placeholder="Bubble Title"
          onChange={handleChange}
        />
        <input
          name="category"
          type="text"
          placeholder="Category (e.g., music, movie)"
          onChange={handleChange}
        />
        <input
          name="description"
          type="text"
          placeholder="Description"
          onChange={handleChange}
        />
        <input
          name="host"
          type="text"
          placeholder="Host"
          onChange={handleChange}
        />
        <input
          name="mood"
          type="text"
          placeholder="Mood"
          onChange={handleChange}
        />
        <input
          name="scope"
          type="text"
          placeholder="Scope"
          onChange={handleChange}
        />

        {/* Category-specific optional fields */}
        <input
          name="type"
          type="text"
          placeholder="Type (music only)"
          onChange={handleChange}
        />
        <input
          name="movieTitle"
          type="text"
          placeholder="Movie Title"
          onChange={handleChange}
        />
        <input
          name="showTitle"
          type="text"
          placeholder="Show Title"
          onChange={handleChange}
        />
        <input
          name="bookTitle"
          type="text"
          placeholder="Book Title"
          onChange={handleChange}
        />
        <input
          name="quote"
          type="text"
          placeholder="Quote (book only)"
          onChange={handleChange}
        />

        <input type="file" onChange={handleFileChange} />
        <button onClick={handleSubmit}>Create Bubble</button>

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
        <button
          onClick={() =>
            getBubblesByMoodAndActivity("emotional", "on a walk", "music")
          }
        >
          Get bubbles
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
