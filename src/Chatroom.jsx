import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  limit,
  startAfter,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import "./Chatroom.css";

const Chatroom = ({ bubbleId, userId = "sumit_sharma" }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const gifUrl = "https://media.tenor.com/MBDpdI_PKwkAAAAC/music-bollywood.gif";
  const MESSAGES_LIMIT = 5;

  const listenToRecentMessages = (spaceId, onUpdate) => {
    const messagesRef = collection(db, "spaces", spaceId, "chat");
    const q = query(
      messagesRef,
      orderBy("time", "desc"),
      limit(MESSAGES_LIMIT)
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      onUpdate(messages); // Call your UI setter with latest messages
    });
  };

  const fetchOlderMessages = async (spaceId, lastVisibleDoc) => {
    const messagesRef = collection(db, "spaces", spaceId, "chat");

    const q = query(
      messagesRef,
      orderBy("time", "desc"),
      startAfter(lastVisibleDoc),
      limit(MESSAGES_LIMIT)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  };

  const getMessageDocById = async (spaceId, messageId) => {
    const docRef = doc(db, "spaces", spaceId, "chat", messageId);
    return await getDoc(docRef);
  };

  const sendMessage = async (spaceId, userId, data, clearInputCallback) => {
    if (data.type === "text" && !data.message.trim()) return;

    const chatRef = collection(db, "spaces", spaceId, "chat");

    if (data.type === "text" && typeof clearInputCallback === "function") {
      clearInputCallback(); // clear input field (owptional)
    }

    const payload = {
      userId,
      time: serverTimestamp(),
      type: data.type,
    };

    if (data.type === "text") {
      payload.message = data.message;
    } else if (data.type === "gif") {
      payload.gifUrl = data.gifUrl;
    }

    await addDoc(chatRef, payload);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && input.trim()) {
      sendMessage(bubbleId, userId, { type: "text", message: input }, () =>
        setInput("")
      );
    }
  };

  const loadOlderMessages = async () => {
    const lastDoc = await getMessageDocById(
      bubbleId,
      messages[messages.length - 1].id
    );
    const older = await fetchOlderMessages(bubbleId, lastDoc);
    setMessages((prev) => [...prev, ...older]);
  };

  useEffect(() => {
    const unsub = listenToRecentMessages(bubbleId, (messages) => {
      setMessages(messages); // your state
    });

    return () => unsub(); // cleanup on unmount
  }, [bubbleId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: 16,
        width: "60%",
        margin: "auto",
      }}
    >
      <p>{bubbleId}</p>
      <h3>{userId}</h3>
      <div
        style={{
          height: 600,
          overflowY: "auto",
          marginBottom: 10,
          padding: 8,
          background: "#C68EFD",
          borderRadius: 4,
        }}
      >
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: 12, color: "black" }}>
            <strong>{msg.username}:</strong>{" "}
            {msg.type === "text" && <span>{msg.message}</span>}
            {msg.type === "gif" && (
              <div>
                <img
                  src={msg.gifUrl}
                  alt="GIF"
                  style={{
                    maxWidth: "300px",
                    maxHeight: "300px",
                    borderRadius: 8,
                  }}
                />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <input
        style={{ width: "75%", padding: 6 }}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Type your message..."
      />
      <button
        onClick={() =>
          sendMessage(bubbleId, userId, { type: "text", message: input }, () =>
            setInput("")
          )
        }
        style={{ width: "23%", marginLeft: "2%" }}
      >
        Send message
      </button>

      <button
        onClick={() =>
          sendMessage(bubbleId, userId, { type: "gif", gifUrl: gifUrl })
        }
        style={{ width: "23%", marginLeft: "2%" }}
      >
        Send gif
      </button>

      <button
        onClick={() => loadOlderMessages()}
        style={{ width: "23%", marginLeft: "2%" }}
      >
        Load previous messages
      </button>
    </div>
  );
};

export default Chatroom;
