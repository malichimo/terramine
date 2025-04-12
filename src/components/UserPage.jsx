
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
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
      const q = query(collection(db, "checkins"), where("terracreOwnerId", "==", user.uid));
      const snapshot = await getDocs(q);
      const messages = snapshot.docs
        .map(doc => doc.data())
        .filter(data => data.message)
        .map(data => `${data.userId}: ${data.message}`);
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
            {checkInMessages.map((entry, index) => (
              <li key={index}>
                <strong>{entry.username}</strong>: {entry.message}
              </li>
            ))}
          </ul>

        </div>
      </div>
    </div>
  );
};

export default UserPage;
