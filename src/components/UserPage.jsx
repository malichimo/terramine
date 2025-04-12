import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import "./UserPage.css";

const UserPage = ({
  user,
  onClose,
  earnings,
  rockMines,
  coalMines,
  goldMines,
  diamondMines,
}) => {
  const [checkInMessages, setCheckInMessages] = useState([]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!user) return;
      const snapshot = await getDocs(collection(db, "checkins"));
      const messages = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (!data.terracreId || !data.message) continue;

        // Get terracre to see if current user is the owner
        const terracreRef = doc(db, "terracres", data.terracreId);
        const terracreSnap = await getDoc(terracreRef);
        const terracre = terracreSnap.exists() ? terracreSnap.data() : null;

        if (terracre?.ownerId === user.uid) {
          // Get the visitor's name
          const visitorRef = doc(db, "users", data.userId);
          const visitorSnap = await getDoc(visitorRef);
          const visitorName = visitorSnap.exists() ? visitorSnap.data().name || "Anonymous" : "Unknown visitor";

          messages.push({ username: visitorName, message: data.message });
        }
      }

      setCheckInMessages(messages);
    };

    fetchMessages();
  }, [user]);

  return (
    <div className="user-page">
      <div className="page-header">
        <h1 className="page-title">TerraMine</h1>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      <div className="user-info">
        <p>Name: {user.displayName}</p>
        <p>TerraBucks: {user.terrabucks}</p>
        <p>Earnings from Mines: ${earnings.toFixed(2)}</p>
        <p>🪨 Rock Mines: {rockMines}</p>
        <p>⛏️ Coal Mines: {coalMines}</p>
        <p>🪙 Gold Mines: {goldMines}</p>
        <p>💎 Diamond Mines: {diamondMines}</p>

        <div className="check-in-messages">
          <h2>Check-In Messages</h2>
          <ul>
            {checkInMessages.length === 0 ? (
              <li>No check-ins yet.</li>
            ) : (
              checkInMessages.map((entry, index) => (
                <li key={index}>
                  <strong>{entry.username}</strong>: {entry.message}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UserPage;