// src/components/Profile.jsx
import React from "react";

function Profile({ user, onSignOut }) {
  if (!user) return null; // If user is not logged in, return nothing

  return (
    <div>
      <img src={user.photoURL} alt="Profile" style={{ width: "50px", borderRadius: "50%" }} />
      <p><strong>Name:</strong> {user.displayName}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Terrabucks:</strong> {user.terrabucks ?? "Loading..."}</p>
      <button onClick={onSignOut}>Sign Out</button>
    </div>
  );
}

export default Profile;
