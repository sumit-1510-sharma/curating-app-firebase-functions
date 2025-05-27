import React, { useEffect, useState } from "react";
import "./Homepage.css";

// const track = {
//   name: "",
//   album: {
//     images: [{ url: "" }],
//   },
//   artists: [{ name: "" }],
// };

// function App() {
//   const [player, setPlayer] = useState(undefined);
//   const [is_paused, setPaused] = useState(false);
//   const [is_active, setActive] = useState(false);
//   const [current_track, setTrack] = useState(track);
//   const [device_id, setDevideId] = useState(null);

//   const token =
//     "BQBTwStZF8tV976bJLj_Fp67Nug71DXX-P2BfmxeIS1pNq_75s2yMUl5gKbt-AqIFnhftPeP2cgZev1EPczAt8UKnuGn2IJXEn1C8KGE3HFakKCsyCHBKVb83Nky-1FYZXQpOHiDe-LPSLD3nBiuxvulZJJjV2uaTBhIPJxjcEYkGAqz3T3OsgQ_ALutHu9OdjC7Ubdw7NgcsHG5kFMt2Mzi6ac-3c-ziJjD9ErD2SJbIyvLvAKS63c7XTxLJhOYjOLi";

//   const addToQueue = async () => {
//     console.log(device_id + ", " + token);
//     if (!device_id || !token) return;

//     console.log("function called");

//     // Optional: Transfer playback to your web player
//     await fetch("https://api.spotify.com/v1/me/player", {
//       method: "PUT",
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         device_ids: [device_id],
//         play: true,
//       }),
//     });

//     // Replace with the actual album URI you want to play
//     const albumUri =
//       "https://open.spotify.com/playlist/6YX4E0B3M7tBpCC5oprqb8?si=5cd78209a2f2423c"; // Example: Ed Sheeran - Divide

//     // Play the album
//     await fetch(
//       `https://api.spotify.com/v1/me/player/play?device_id=${device_id}`,
//       {
//         method: "PUT",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           context_uri: albumUri,
//           offset: { position: 0 }, // Start at the beginning
//           position_ms: 0,
//         }),
//       }
//     );
//   };

//   useEffect(() => {
//     const script = document.createElement("script");
//     script.src = "https://sdk.scdn.co/spotify-player.js";
//     script.async = true;

//     document.body.appendChild(script);

//     window.onSpotifyWebPlaybackSDKReady = () => {
//       const player = new window.Spotify.Player({
//         name: "Web Playback SDK",
//         getOAuthToken: (cb) => {
//           cb(token);
//         },
//         volume: 0.5,
//       });

//       console.log(player);

//       setPlayer(player);

//       player.addListener("ready", ({ device_id }) => {
//         console.log("Ready with Device ID", device_id);
//         setDevideId(device_id);
//       });

//       player.addListener("not_ready", ({ device_id }) => {
//         console.log("Device ID has gone offline", device_id);
//       });

//       player.addListener("player_state_changed", (state) => {
//         if (!state) {
//           return;
//         }

//         setTrack(state.track_window.current_track);
//         console.log(state.track_window.current_track);
//         setPaused(state.paused);

//         player.getCurrentState().then((state) => {
//           !state ? setActive(false) : setActive(true);
//         });
//       });

//       player.connect();
//     };
//   }, []);

//   return (
//     <div className="container">
//       <div className="main-wrapper">
//         <img
//           src={current_track.album.images[0].url}
//           className="now-playing__cover"
//           alt=""
//         />

//         <div className="now-playing__side">
//           <div className="now-playing__name">{current_track.name}</div>

//           <div className="now-playing__artist">
//             {current_track.artists[0].name}
//           </div>
//         </div>

//         <button
//           className="btn-spotify"
//           onClick={() => {
//             player.previousTrack();
//           }}
//         >
//           &lt;&lt;
//         </button>

//         <button
//           className="btn-spotify"
//           onClick={() => {
//             player.togglePlay();
//           }}
//         >
//           {is_paused ? "PLAY" : "PAUSE"}
//         </button>

//         <button
//           className="btn-spotify"
//           onClick={() => {
//             player.nextTrack();
//           }}
//         >
//           &gt;&gt;
//         </button>
//       </div>
//       <button onClick={() => addToQueue()}>Add to Queue</button>
//     </div>
//   );
// }

import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "./firebase";
import { onForegroundMessage, requestNotificationPermission } from "./fcm";

const lobbyId = "Vx76JTACmWw6AmVinvol";

function Homepage() {
  const [musicKitInstance, setMusicKitInstance] = useState(null);
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    onForegroundMessage((payload) => {
      console.log("Foreground message received:", payload);
      // Show toast or update UI
    });
  }, []);

  useEffect(() => {
    const music = MusicKit.getInstance();
    console.log(music);
    setMusicKitInstance(music);
  }, []);

  useEffect(() => {
    const fetchQueue = async () => {
      const songs = await getQueueFromLobby(lobbyId);
      setQueue(songs);
    };
    fetchQueue();
  }, [lobbyId]);

  const getQueueFromLobby = async (lobbyId) => {
    const queueRef = collection(db, "lobbies", lobbyId, "queue");
    const q = query(queueRef, orderBy("added_at"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  };

  const handleAuthorize = async () => {
    if (!musicKitInstance) return;
    try {
      const token = await musicKitInstance.authorize();
      console.log("User token:", token);
    } catch (err) {
      console.error("Authorization failed", err);
    }
  };

  const handleUnauthorize = async () => {
    if (!musicKitInstance) {
      return;
    }
    try {
      const token = await musicKitInstance.unauthorize();
      console.log("User token:", token);
    } catch (err) {
      console.log("Unauthorization failed", err);
    }
  };

  const playTrack = async (lobbyId) => {
    if (!musicKitInstance) return;

    try {
      // Reference to queue subcollection
      const queueRef = collection(db, "lobbies", lobbyId, "queue");

      // Get the first track (customize this if needed)
      const q = query(queueRef, orderBy("added_at"), limit(1)); // use orderBy if you have timestamps
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log("No songs in lobby queue.");
        return;
      }

      // Extract track ID
      const songDoc = querySnapshot.docs[0];
      const songId = songDoc.data().track;

      // Play the song
      await musicKitInstance.setQueue({ song: songId });
      await musicKitInstance.play();
    } catch (err) {
      console.error("Failed to play track from Firestore:", err);
    }
  };

  const handlePlaySong = (index) => {
    if (!musicKitInstance || !queue || index >= queue.length) return;

    const playSongAtIndex = async (i) => {
      const songId = queue[i].track;
      try {
        await musicKitInstance.setQueue({ song: songId });
        await musicKitInstance.play();
        console.log("Now playing:", songId);
      } catch (err) {
        console.error("Playback failed", err);
      }
    };

    playSongAtIndex(index); // Start playing the requested song

    // Remove previous listener to avoid stacking
    musicKitInstance.removeEventListener(
      "playbackStateDidChange",
      musicKitInstance._nextListener
    );

    // Define and store a listener reference for cleanup later
    const nextListener = () => {
      const state = musicKitInstance.playbackState;
      if (
        state === MusicKit.PlaybackStates.stopped &&
        index + 1 < queue.length
      ) {
        handlePlaySong(index + 1);
      }
    };

    musicKitInstance._nextListener = nextListener; // Store for removal
    musicKitInstance.addEventListener("playbackStateDidChange", nextListener);
  };

  return (
    <div className="container">
      <h1>Apple Music Web App</h1>
      {musicKitInstance ? (
        <>
          <p>MusicKit is ready to use!</p>
          <div className="authorize">
            <button onClick={handleAuthorize}>Authorize Apple Music</button>
            <button onClick={handleUnauthorize}>Unauthorize Apple Music</button>
          </div>
          <button onClick={() => playTrack(lobbyId)}>Play Track</button>
          <button onClick={() => setupAutoPlayNext(musicKitInstance, queue, 0)}>
            Autoplay & Start
          </button>

          <button onClick={() => requestNotificationPermission()}>
            Request token
          </button>

          <div>
            <h2>Lobby Queue</h2>
            <ul>
              {queue.map((song, index) => (
                <li key={song.id}>
                  <button onClick={() => handlePlaySong(index)}>
                    ▶️ Play Song ID: {song.track}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {/* <p>{musicKitInstance.nowPlayingItem.attributes.name}</p>
          <p>{musicKitInstance.nowPlayingItem.attributes.artistName}</p> */}
        </>
      ) : (
        <p>Loading MusicKit...</p>
      )}
    </div>
  );
}

export default Homepage;
