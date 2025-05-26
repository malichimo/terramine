import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function UserSetupPage({ user }) {
  const [nickname, setNickname] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!user) return;

    const userDoc = {
      email: user.email,
      nickname: nickname.trim() || "",
      createdAt: serverTimestamp(),
      terraBucks: 1000, // ✅ Initial grant
    };

    try {
      await setDoc(doc(db, "users", user.uid), userDoc);
      console.log("✅ User setup complete. Redirecting to /main");
      navigate("/main");
    } catch (error) {
      console.error("❌ Error setting up user:", error);
    }
  };

  return (
    <div className="login-container">
      <h2>USER SETUP</h2>
      <p>WELCOME, {user.email.toUpperCase()}!</p>
      <label>
        NICKNAME (OPTIONAL):{" "}
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Enter your nickname"
        />
      </label>
      <br />
      <label>
        EMAIL ADDRESS: <input type="text" value={user.email} disabled />
      </label>
      <br />
      <button onClick={handleSubmit}>Finish Setup</button>
    </div>
  );
}
