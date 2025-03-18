import React from 'react';
import './UserPage.css';

const UserPage = ({ user, onClose }) => {
  return (
    <div className="user-page">
      <div className="page-header">
        <h1 className="page-title">TerraMine</h1>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      <div className="user-info">
        <p>Name: {user.displayName}</p>
        <p>TerraBucks: {user.terrabucks}</p>
        {/* Add more user information as needed */}
      </div>
    </div>
  );
};

export default UserPage;