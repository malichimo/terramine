import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useNavigate } from "react-router-dom";

export default function UserSetupPage({ user, onSetupComplete }) {
  const [nickname, setNickname] = useState("");
  const navigate = useNavigate();

  const handleSetup = async () => {
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        email: user.email,
        nickname: nickname,
        terraBucks: 1000, // 🎁 grant new users 1000 TB
      });
      console.log("✅ User setup complete. Redirecting to /main");
      onSetupComplete(); // 🔁 Triggers App.jsx state update
      navigate("/main"); // 🚀 Go to MainPage
    } catch (error) {
      console.error("❌ Error setting up user:", error.message);
    }
  };

  return (
    <div>
      <h1>Welcome, {user.email}</h1>
      <input
        type="text"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="Enter your nickname"
      />
      <button onClick={handleSetup}>Finish Setup</button>
    </div>
  );
}
