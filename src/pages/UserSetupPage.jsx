// src/pages/UserSetupPage.jsx
import React, { useState } from "react";
import "../App.css"; // ensure this path is correct
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

function UserSetupPage({ user }) {
  const [nickname, setNickname] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        nickname: nickname || user.displayName || "User",
        terrabucks: 1000,
        createdAt: new Date().toISOString(),
      });
      navigate("/main");
    } catch (err) {
      console.error("Error setting up user:", err);
      alert("Setup failed. Try again.");
    }
  };

  return (
    <div className="setup-container">
      <h2>User Setup</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Email:
          <input value={user.email} disabled />
        </label>
        <label>
          Nickname (optional):
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter a nickname"
          />
        </label>
        <button type="submit">Complete Setup</button>
      </form>
    </div>
  );
}

export default UserSetupPage;
