import React, { useState } from "react";
import "./App.css";

function UserSetupPage({ user, onComplete }) {
  const [nickname, setNickname] = useState("");
  const [email] = useState(user?.email || "");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Placeholder for saving user setup to Firebase
    console.log("Saving user profile:", { email, nickname });

    // Simulate success
    setSubmitted(true);

    // Call onComplete to move to main page
    if (onComplete) onComplete();
  };

  if (submitted) {
    return (
      <div className="user-setup">
        <h2>Thank you, {nickname || user?.displayName || "user"}!</h2>
        <p>Your profile has been saved. Redirecting to your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="user-setup">
      <h2>Welcome to TerraMine!</h2>
      <p>Please confirm your email and choose a nickname (optional):</p>
      <form onSubmit={handleSubmit} className="setup-form">
        <label>Email Address:</label>
        <input type="email" value={email} disabled />

        <label>Nickname (optional):</label>
        <input
          type="text"
          placeholder="Enter nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />

        <button type="submit">Save and Continue</button>
      </form>
    </div>
  );
}

export default UserSetupPage;
