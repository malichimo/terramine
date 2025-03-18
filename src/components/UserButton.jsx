import React from 'react';
import './UserButton.css';

const UserButton = ({ onUser }) => {
  return (
    <div className="user-container">
      <button className="user-button" onClick={onUser}>
        User
      </button>
    </div>
  );
};

export default UserButton;