import React from 'react';
import './UserPage.css';

const UserPage = ({ user, onClose }) => {
  return (
    <div className="user-page">
      <button className="close-button" onClick={onClose}>×</button>
      <h2>User Profile</h2>
      <div className="user-info">
        <p>Name: {user.displayName}</p>
        <p>TerraBucks: {user.terrabucks}</p>
        {/* Add more user information as needed */}
      </div>
    </div>
  );
};

export default UserPage;