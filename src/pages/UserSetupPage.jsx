import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function UserSetupPage({ user, onSetupComplete }) {
  const [nickname, setNickname] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    const userDoc = {
      email: user.email,
      nickname: nickname.trim(),
      createdAt: serverTimestamp(),
      terraBucks: 1000,
    };

    try {
      await setDoc(doc(db, "users", user.uid), userDoc);
      console.log("✅ User setup complete.");
      onSetupComplete(); // Tell App.jsx to update
      navigate("/main"); // Redirect to /main
    } catch (error) {
      console.error("❌ Error setting up user:", error);
    }
  };

  return (
    <div className="login-container">
      <h2>USER SETUP</h2>
      <p>WELCOME, {user.email.toUpperCase()}!</p>
      <label htmlFor="nickname">
        NICKNAME (OPTIONAL):{" "}
        <input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Enter your nickname"
        />
      </label>
      <br />
      <label htmlFor="email">
        EMAIL ADDRESS:{" "}
        <input id="email" type="text" value={user.email} disabled />
      </label>
      <br />
      <button onClick={handleSubmit}>Finish Setup</button>
    </div>
  );
}
