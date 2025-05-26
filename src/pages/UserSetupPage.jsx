import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import "./UserSetupPage.css";

export default function UserSetupPage({ user }) {
  const [nickname, setNickname] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        nickname: nickname.trim() || user.displayName || "Anonymous",
        email: user.email,
        createdAt: new Date().toISOString(),
      });
      console.log("✅ User setup complete. Redirecting to /main");
      navigate("/main");
    } catch (err) {
      console.error("❌ Error saving user setup:", err.message);
    }
  };

  return (
    <div className="setup-page">
      <h1>User Setup</h1>
      <p>Welcome, {user?.email || "unknown user"}!</p>

      <form className="setup-form" onSubmit={handleSubmit}>
        <label>
          Nickname (optional):
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter your nickname"
          />
        </label>

        <label>
          Email Address:
          <input type="email" value={user?.email} disabled />
        </label>

        <button type="submit">Finish Setup</button>
      </form>
    </div>
  );
}
