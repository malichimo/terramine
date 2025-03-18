import React from 'react';
import './SignOutButton.css';

const SignOutButton = ({ onSignOut }) => {
  return (
    <div className="signout-container">
      <button className="signout-button" onClick={onSignOut}>
        Sign Out
      </button>
    </div>
  );
};

export default SignOutButton;