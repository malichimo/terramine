import React, { useEffect } from "react";
import "./UserPage.css";

const UserPage = ({
  user,
  onClose,
  earnings,
  rockMines,
  coalMines,
  goldMines,
  diamondMines,
  checkInMessages,
}) => {
  useEffect(() => {
    console.log("📦 UserPage mounted");
    return () => {
      console.log("👋 UserPage unmounted");
    };
  }, []);

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
            {checkInMessages.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UserPage;
