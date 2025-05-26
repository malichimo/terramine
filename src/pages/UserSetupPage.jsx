import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";

export default function UserSetupPage() {
  const user = auth.currentUser;
  const [nickname, setNickname] = useState("");
  const navigate = useNavigate();

  const handleFinishSetup = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        email: user.email,
        nickname: nickname.trim() || null,
        createdAt: serverTimestamp(),
        terraBucks: 1000, // Set initial TB here
      });

      console.log("✅ User setup complete. Redirecting to /main");
      navigate("/main");
    } catch (error) {
      console.error("❌ Failed to set up user:", error.message);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <div className="login-container">
      <h2>USER SETUP</h2>
      <p>WELCOME, <strong>{user?.email?.toUpperCase()}</strong>!</p>
      <label>
        NICKNAME (OPTIONAL):
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Enter your nickname"
        />
      </label>
      <label>
        EMAIL ADDRESS:
        <input value={user?.email} disabled />
      </label>
      <button onClick={handleFinishSetup}>Finish Setup</button>
      <button onClick={handleSignOut}>Sign Out</button>
    </div>
  );
}
