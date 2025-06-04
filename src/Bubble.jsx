import React, { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import Chatroom from "./Chatroom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
const currentUser = {
  id: "sumit_151000",
  name: "sumit sharma",
  photoUrl:
    "https://cdn.pixabay.com/photo/2015/04/23/22/00/new-year-background-736885_1280.jpg",
};
const music = MusicKit.getInstance();

export default function Bubble() {
  const { bubbleId } = useParams();
  const location = useLocation();
  const { bubble } = location.state || {};
  const audioRef = useRef(null);
  const controlAudioRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [books, setBooks] = useState([]);
  const [songs, setSongs] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);

  const isHost = currentUser.name === bubble?.host;

  const GOOGLE_BOOKS_API_KEY = "AIzaSyDrk4-QQIHpjGahxwYiBoW9B8yVYirSoJs";

  const handleSearch = async () => {
    if (!searchTerm) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
          searchTerm
        )}&key=${GOOGLE_BOOKS_API_KEY}`
      );
      const data = await response.json();
      setBooks(data.items || []);
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMusicSearch = async () => {
    if (!searchTerm) return;

    setLoading(true);
    try {
      const query = encodeURIComponent(searchTerm.trim());
      const url = `https://api.music.apple.com/v1/catalog/us/search?types=songs&term=${query}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjIzS0Y5Qjg2MjYifQ.eyJpYXQiOjE3NDY0MjA4NTcsImV4cCI6MTc2MTk3Mjg1NywiaXNzIjoiNFpaTjVaRzVSMiJ9.q9TlxLvkcaE3om0u-OqVK7WEUesGBJ55RccZffI3IcHjFDylEdh2N4SDFC16ix4p6yT3YvmiVUTwtmE521iV5Q`,
        },
      });

      const data = await response.json();
      console.log(data);

      setSongs(data.results?.songs?.data || []);
    } catch (err) {
      console.error("Music search error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log(music);
  }, []);

  useEffect(() => {
    if (!bubbleId) return;

    const queueRef = collection(db, "bubbles", bubbleId, "queue");
    const unsubscribe = onSnapshot(queueRef, (snapshot) => {
      const songs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Optional: Sort by addedAt
      songs.sort((a, b) => a.addedAt?.seconds - b.addedAt?.seconds);
      setQueue(songs);
    });

    return () => unsubscribe();
  }, [bubbleId]);

  useEffect(() => {
    const handlePlaybackChange = () => {
      if (music.playbackState === 2) {
        if (currentIndex < queue.length - 1) {
          playSong(currentIndex + 1); // Play next song
        }
      }
    };

    music.addEventListener("playbackStateDidChange", handlePlaybackChange);

    return () => {
      music.removeEventListener("playbackStateDidChange", handlePlaybackChange);
    };
  }, [currentIndex, queue]);

  const playSongAtIndex = (index) => {
    const songId = queue[index].songId;
    if (!songId) return;

    setCurrentIndex(index);

    music.stop();
    music.setQueue({ song: songId }).then(() => {
      music.play();
    });
  };

  const playPreview = (previewUrl) => {
    if (!previewUrl) {
      console.warn("No preview URL provided.");
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = previewUrl;
      audioRef.current.play();
    }
  };

  const playControlPreview = (previewUrl) => {
    if (!previewUrl) {
      console.warn("No preview URL provided.");
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = previewUrl;
      audioRef.current.play();
    }
  };

  const sendSongRequest = async (song, user) => {
    const requestRef = collection(db, "spaces", bubbleId, "requests");

    const artworkUrl = song.attributes?.artwork?.url?.replace(
      "{w}x{h}",
      "200x200"
    );
    const title = song.attributes?.name;
    const artist = song.attributes?.artistName;
    const previewUrl = song.attributes?.previews?.[0]?.url;

    await addDoc(requestRef, {
      assetId: song.id,
      assetName: title,
      artist: artist,
      coverUrl: artworkUrl,
      previewUrl: previewUrl,
      profilePhotoUrl: user.photoUrl,
      requestedByName: user.name,
      requesteById: user.id,
      addedAt: serverTimestamp(),
      seen: false,
    });
  };

  const sendMovieRequest = async (movie, user) => {
    const requestRef = collection(db, "spaces", bubbleId, "requests");

    await addDoc(requestRef, {
      assetId: movie.id.toString(),
      assetName: movie.title,
      coverUrl: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : "",
      year: movie.release_date?.slice(0, 4) || "",
      genre: movie.genre_ids || [],
      previewUrl: null,
      profilePhotoUrl: user.photoUrl,
      requestedByName: user.name,
      requesteById: user.id,
      addedAt: serverTimestamp(),
      seen: false,
    });
  };

  const sendTVShowRequest = async (tvShow, user) => {
    const requestRef = collection(db, "spaces", bubbleId, "requests");

    await addDoc(requestRef, {
      assetId: tvShow.id.toString(),
      assetName: tvShow.name,
      coverUrl: tvShow.poster_path
        ? `https://image.tmdb.org/t/p/w500${tvShow.poster_path}`
        : "",
      year: tvShow.first_air_date?.slice(0, 4) || "",
      genre: tvShow.genre_ids || [],
      previewUrl: null,
      profilePhotoUrl: user.photoUrl,
      requestedByName: user.name,
      requesteById: user.id,
      addedAt: serverTimestamp(),
      seen: false,
    });
  };

  const sendBookRequest = async (book, user) => {
    const requestRef = collection(db, "spaces", bubbleId, "requests");
    const info = book.volumeInfo || {};

    await addDoc(requestRef, {
      assetId: book.id,
      assetName: info.title || "",
      artist: info.authors || [],
      coverUrl:
        info.imageLinks?.thumbnail?.replace("http://", "https://") || "",
      year: info.publishedDate?.slice(0, 4) || "",
      genre: info.categories || [],
      previewUrl: null,
      profilePhotoUrl: user.photoUrl,
      requestedByName: user.name,
      requestedById: user.id,
      addedAt: serverTimestamp(),
      seen: false,
    });
  };

  // const acceptRequest = async (
  //   spaceId,
  //   requestId,
  //   requestData,
  //   hostId,
  //   hostName,
  //   profileImageUrl
  // ) => {
  //   const queueRef = collection(db, "spaces", spaceId, "queue");
  //   const requestRef = doc(db, "spaces", spaceId, "requests", requestId);

  //   const queueData = {
  //     addedAt: serverTimestamp(),
  //     addedById: hostId,
  //     addedByName: hostName,
  //     artist: requestData.artist || null,
  //     assetId: requestData.assetId || null,
  //     assetName: requestData.assetName || null,
  //     coverUrl: requestData.coverUrl || null,
  //     genre: requestData.genre || null,
  //     previewUrl: requestData.previewUrl || null,
  //     profileImageUrl,
  //     year: requestData.year || null,
  //   };

  //   await addDoc(queueRef, queueData);
  //   await deleteDoc(requestRef);
  // };

  const acceptRequest = async (spaceId, requestId) => {
    const requestRef = doc(db, "spaces", spaceId, "requests", requestId);
    const queueRef = collection(db, "spaces", spaceId, "queue");

    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) {
      console.error("Request not found");
      return;
    }

    const requestData = requestSnap.data();

    const queueData = {
      addedAt: serverTimestamp(),
      addedById: requestData.requesteById || null,
      addedByName: requestData.requestedByName || null,
      artist: requestData.artist || null,
      assetId: requestData.assetId || null,
      assetName: requestData.assetName || null,
      coverUrl: requestData.coverUrl || null,
      genre: requestData.genre || null,
      previewUrl: requestData.previewUrl || null,
      profileImageUrl: requestData.profilePhotoUrl || null,
      year: requestData.year || null,
    };

    await addDoc(queueRef, queueData);
    await deleteDoc(requestRef);
  };

  const rejectRequest = async (spaceId, requestId) => {
    const requestRef = doc(db, "spaces", spaceId, "requests", requestId);
    await deleteDoc(requestRef);
  };

  const addToQueue = async (spaceId, user, category, queueInputs) => {
    const queueRef = collection(db, "spaces", spaceId, "queue");

    const commonFields = {
      addedAt: serverTimestamp(),
      addedById: user.uid,
      addedByName: user.name,
      profileImageUrl: user.profileImageUrl,
    };

    let categoryFields = {};

    switch (category) {
      case "music":
        categoryFields = {
          artist: queueInputs.artist,
          assetId: queueInputs.assetId,
          assetName: queueInputs.assetName,
          coverUrl: queueInputs.coverUrl,
          previewUrl: queueInputs.previewUrl,
        };
        break;
      case "movie":
      case "tvshow":
        categoryFields = {
          assetId: queueInputs.assetId,
          assetName: queueInputs.assetName,
          coverUrl: queueInputs.coverUrl,
          genre: queueInputs.genre,
          year: queueInputs.year,
        };
        break;
      case "book":
        categoryFields = {
          artist: queueInputs.artist,
          assetId: queueInputs.assetId,
          assetName: queueInputs.assetName,
          coverUrl: queueInputs.coverUrl,
          bookGenre: queueInputs.bookGenre,
          year: queueInputs.year,
        };
        break;
      default:
        console.error("Unsupported category:", category);
        return;
    }

    const docData = {
      ...commonFields,
      ...categoryFields,
    };

    try {
      await addDoc(queueRef, docData);
      console.log("Item added to queue successfully.");
    } catch (error) {
      console.error("Error adding to queue:", error);
    }
  };

  const addMusicToQueue = async (spaceId, user, queueInputs) => {
    const { artist, assetId, assetName, coverUrl, previewUrl } = queueInputs;

    const queueRef = collection(db, "spaces", spaceId, "queue");

    const data = {
      addedAt: serverTimestamp(),
      addedById: user.id,
      addedByName: user.name,
      profileImageUrl: user.photoUrl,
      artist,
      assetId,
      assetName,
      coverUrl,
      previewUrl,
    };

    try {
      await addDoc(queueRef, data);
      console.log("Music added to queue");
    } catch (error) {
      console.error("Error adding music:", error);
    }
  };

  const addMovieToQueue = async (spaceId, user, queueInputs) => {
    const { assetId, assetName, coverUrl, genre, year } = queueInputs;

    const queueRef = collection(db, "spaces", spaceId, "queue");

    const data = {
      addedAt: serverTimestamp(),
      addedById: user.id,
      addedByName: user.name,
      profileImageUrl: user.photoUrl,
      assetId,
      assetName,
      coverUrl,
      genre,
      year,
    };

    try {
      await addDoc(queueRef, data);
      console.log("Movie added to queue");
    } catch (error) {
      console.error("Error adding movie:", error);
    }
  };

  const addTVShowToQueue = async (spaceId, user, queueInputs) => {
    const { assetId, assetName, coverUrl, genre, year } = queueInputs;

    const queueRef = collection(db, "spaces", spaceId, "queue");

    const data = {
      addedAt: serverTimestamp(),
      addedById: user.id,
      addedByName: user.name,
      profileImageUrl: user.photoUrl,
      assetId,
      assetName,
      coverUrl,
      genre,
      year,
    };

    try {
      await addDoc(queueRef, data);
      console.log("TV show added to queue");
    } catch (error) {
      console.error("Error adding TV show:", error);
    }
  };

  const addBookToQueue = async (spaceId, user, queueInputs) => {
    const { artist, assetId, assetName, coverUrl, bookGenre, year } =
      queueInputs;

    const queueRef = collection(db, "spaces", spaceId, "queue");

    const data = {
      addedAt: serverTimestamp(),
      addedById: user.id,
      addedByName: user.name,
      profileImageUrl: user.photoUrl,
      artist,
      assetId,
      assetName,
      coverUrl,
      bookGenre,
      year,
    };

    try {
      await addDoc(queueRef, data);
      console.log("Book added to queue");
    } catch (error) {
      console.error("Error adding book:", error);
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "bubbles", bubbleId, "requests"),
      (snapshot) => {
        const newRequests = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRequests(newRequests);
      }
    );

    return () => unsub();
  }, [bubbleId, isHost]);

  return (
    <div>
      <h2>User Profile</h2>
      <p>bubbleId: {bubbleId}</p>

      {/* Book Bubble Specific Content */}
      {bubble?.category === "book" && (
        <div style={{ marginBottom: 24 }}>
          <h3>Search Books</h3>
          <input
            type="text"
            value={searchTerm}
            placeholder="Search books..."
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: 8, marginRight: 8 }}
          />
          <button onClick={handleSearch}>Search</button>

          {loading && <p>Loading...</p>}

          <div style={{ marginTop: 16 }}>
            {books.map((book) => (
              <div
                key={book.id}
                style={{
                  marginBottom: 12,
                  padding: 12,
                  border: "1px solid #ccc",
                  borderRadius: 6,
                }}
              >
                <h4>{book.volumeInfo.title}</h4>
                <p>{book.volumeInfo.authors?.join(", ") || "No author info"}</p>
                {book.volumeInfo.imageLinks?.thumbnail && (
                  <img
                    src={book.volumeInfo.imageLinks.thumbnail}
                    alt={book.volumeInfo.title}
                    style={{ height: 100 }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h3>Search Music (Apple Music)</h3>
        <input
          type="text"
          value={searchTerm}
          placeholder="Search songs..."
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: 8, marginRight: 8 }}
        />
        <button onClick={handleMusicSearch}>Search</button>

        {loading && <p>Loading...</p>}

        <div style={{ marginTop: 16 }}>
          {songs.map((song) => (
            <div
              key={song.id}
              style={{
                marginBottom: 12,
                padding: 12,
                border: "1px solid #ccc",
                borderRadius: 6,
                position: "relative",
              }}
            >
              <h4>{song.attributes.name}</h4>
              <p>{song.attributes.artistName}</p>
              {song.attributes.artwork?.url && (
                <img
                  src={song.attributes.artwork.url
                    .replace("{w}", "100")
                    .replace("{h}", "100")}
                  alt={song.attributes.name}
                  style={{ height: 100 }}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  display: "flex",
                  right: 20,
                  bottom: "40%",
                  gap: 20,
                }}
              >
                <button onClick={() => sendSongRequest(song, currentUser)}>
                  Request to add
                </button>
                <button
                  onClick={() =>
                    playPreview(song.attributes?.previews?.[0]?.url)
                  }
                >
                  Play preview
                </button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24 }}>
          <h3>Song Queue</h3>
          {queue.length === 0 ? (
            <p>No songs in queue</p>
          ) : (
            queue.map((song, index) => (
              <div
                key={song.id}
                onClick={() => playSongAtIndex(index)}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 8,
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  marginBottom: 8,
                  cursor: "pointer",
                  backgroundColor: "#FAE3C6",
                  color: "#533B4D",
                }}
              >
                {song.coverUrl && (
                  <img
                    src={song.coverUrl}
                    alt="cover"
                    style={{ width: 60, height: 60, borderRadius: 4 }}
                  />
                )}
                <div>
                  <strong>{song.songId}</strong>
                  <br />
                  <small>Added by: {song.addedBy || "Unknown"}</small>
                </div>
                <audio ref={audioRef} />
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <h3>Song Requests</h3>
        {requests.map((req) => (
          <div
            key={req.id}
            style={{
              border: "1px solid #ccc",
              marginBottom: 12,
              padding: 12,
              borderRadius: 8,
            }}
          >
            <img src={req.coverUrl} alt="cover" style={{ height: 60 }} />
            <p>
              <strong>{req.songTitle}</strong> by {req.artist}
            </p>
            <p>Requested by: {req.requestedBy}</p>

            <audio
              controls
              src={req.previewUrl}
              onPlay={() => playControlPreview(req.previewUrl)}
            ></audio>

            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => approveRequest(req.id, req)}
                style={{ marginRight: 8 }}
              >
                Approve
              </button>
              <button onClick={() => rejectRequest(req.id)}>Reject</button>
            </div>
          </div>
        ))}
      </div>

      {/* Chatroom always visible */}
      <Chatroom bubbleId={bubbleId} />
    </div>
  );
}
