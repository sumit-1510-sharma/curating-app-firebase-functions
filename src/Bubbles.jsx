import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { useNavigate } from "react-router-dom";
import Chatroom from "./Chatroom";

const Bubbles = () => {
  const [groupedBubbles, setGroupedBubbles] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBubbles = async () => {
      const bubblesSnap = await getDocs(collection(db, "bubbles"));
      const bubbles = bubblesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const grouped = bubbles.reduce((acc, bubble) => {
        const cat = bubble.category || "uncategorized";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(bubble);
        return acc;
      }, {});

      setGroupedBubbles(grouped);
    };

    fetchBubbles();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>All Bubbles</h2>

      <input
        type="text"
        placeholder="Search by title..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          padding: "8px 12px",
          width: "100%",
          maxWidth: 300,
          marginBottom: 20,
          fontSize: 14,
          border: "1px solid #ccc",
          borderRadius: 4,
        }}
      />

      {Object.entries(groupedBubbles).map(([category, bubbles]) => (
        <div key={category} style={{ marginBottom: 32 }}>
          <h3>{category.toUpperCase()}</h3>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              color: "purple",
            }}
          >
            {bubbles
              .filter((bubble) =>
                bubble.bubbleTitle
                  ?.toLowerCase()
                  .includes(searchTerm.toLowerCase())
              )
              .map((bubble) => (
                <div
                  onClick={() => {
                    navigate(`/bubble/${bubble.id}`, { state: { bubble } });
                  }}
                  key={bubble.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    padding: 12,
                    width: 200,
                    backgroundColor: "#fafafa",
                    justifyItems: "center",
                    cursor: "pointer",
                  }}
                >
                  {bubble.coverUrl && (
                    <img
                      src={bubble.coverUrl}
                      alt={bubble.bubbleTitle}
                      style={{ width: "100%", borderRadius: 6 }}
                    />
                  )}
                  <h4>{bubble.bubbleTitle}</h4>
                  <p style={{ fontSize: 12 }}>{bubble.description}</p>
                  <small>Mood: {bubble.mood}</small>
                  <br />
                  <small>Host: {bubble.host}</small>
                  <br />
                  <small>Type: {bubble.type}</small>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Bubbles;
