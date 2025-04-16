// src/components/CheckInGallery.jsx
import React from "react";
import "./CheckInGallery.css";

const CheckInGallery = ({ messages, onClose }) => {
  return (
    <div className="gallery-overlay">
      <div className="gallery-container">
        <h2>📬 Check-In Gallery</h2>
        <button className="close-button" onClick={onClose}>×</button>
        {messages.length === 0 ? (
          <p>No messages yet.</p>
        ) : (
          <ul className="gallery-messages">
            {messages.map((msg, index) => (
              <li key={index}>{msg}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CheckInGallery;
