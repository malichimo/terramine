import React from "react";
import "./UserPage.css";

const UserPage = ({ user, onClose, earnings, rockMines, coalMines, goldMines, diamondMines, checkInMessages }) => {
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
        <p># of Rock Mines: {rockMines}</p>
        <p># of Coal Mines: {coalMines}</p>
        <p># of Gold Mines: {goldMines}</p>
        <p># of Diamond Mines: {diamondMines}</p>
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