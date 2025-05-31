import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";

export default function UserSetupPage({ user, onSetupComplete }) {
  const [nickname, setNickname] = useState("");
  const navigate = useNavigate();

  const handleSetup = async () => {
    if (!nickname.trim()) return alert("Please enter a nickname.");
    try {
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        nickname: nickname.trim(),
        terraBucks: 1000,
      });
      console.log("✅ User setup complete. Redirecting to /main");
      onSetupComplete(); // Update App state to reflect setup is done
      navigate("/main"); // Redirect
    } catch (error) {
      console.error("❌ Error during user setup:", error.message);
      alert("Error setting up user. Please try again.");
    }
  };

  return (
    <div>
      <h1>Welcome, {user.email}</h1>
      <p>Please choose a nickname to get started:</p>
      <input
        type="text"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="Enter nickname"
      />
      <button onClick={handleSetup}>Finish Setup</button>
    </div>
  );
}