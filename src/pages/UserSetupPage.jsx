import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";

export default function UserSetupPage({ user }) {
  const [nickname, setNickname] = useState("");
  const navigate = useNavigate();

  const handleSetup = async () => {
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);

    try {
      await setDoc(userDocRef, {
        email: user.email,
        nickname: nickname || "",
        createdAt: serverTimestamp(),
        terraBucks: 1000,
      });

      console.log("✅ User setup complete. Redirecting to /main");
      navigate("/main");
    } catch (error) {
      console.error("❌ Error setting up user:", error);
    }
  };

  return (
    <div className="login-container">
      <h2>USER SETUP</h2>
      <p>WELCOME, {user.email?.toUpperCase()}!</p>
      <label>
        NICKNAME (OPTIONAL):
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Enter your nickname"
        />
      </label>
      <label>
        EMAIL ADDRESS:
        <input value={user.email} disabled />
      </label>
      <button onClick={handleSetup}>Finish Setup</button>
      <button onClick={() => signOut(auth)}>Sign Out</button>
    </div>
  );
}
