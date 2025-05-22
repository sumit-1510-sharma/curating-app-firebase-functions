import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import "./Chatroom.css";

const Chatroom = ({ bubbleId, userId = "sumit_sharma" }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!bubbleId) return;

    const chatRef = collection(db, "bubbles", bubbleId, "chat");
    const q = query(chatRef, orderBy("time", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [bubbleId]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const chatRef = collection(db, "spaces", bubbleId, "chat");

    setInput("");

    await addDoc(chatRef, {
      message: input,
      userId: userId,
      time: serverTimestamp(),
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

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
          height: 300,
          overflowY: "auto",
          marginBottom: 10,
          padding: 8,
          background: "#C68EFD",
          borderRadius: 4,
        }}
      >
        {messages.map((msg) => (
          <div key={msg} style={{ marginBottom: 8, color: "black" }}>
            <strong>{msg.username}:</strong> {msg.message}
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
      <button onClick={sendMessage} style={{ width: "23%", marginLeft: "2%" }}>
        Send
      </button>
    </div>
  );
};

export default Chatroom;
