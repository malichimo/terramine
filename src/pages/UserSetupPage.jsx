import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { auth, firestore } from "../firebase";
import { signOut } from "firebase/auth";

export default function UserSetupPage({ user }) {
  const [nickname, setNickname] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!user) return;

    const userRef = doc(firestore, "users", user.uid);
    await setDoc(userRef, {
      email: user.email,
      nickname: nickname || "",
      createdAt: new Date().toISOString(),
      terraBucks: 1000,
    });

    console.log("✅ User setup complete. Redirecting to /main");
    navigate("/main");
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="login-container">
      <h2>USER SETUP</h2>
      <p>Welcome, <strong>{user.email.toUpperCase()}</strong>!</p>
      <label>
        NICKNAME (OPTIONAL):
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
      </label>
      <label>
        EMAIL ADDRESS:
        <input type="text" value={user.email} readOnly />
      </label>
      <button onClick={handleSubmit}>Finish Setup</button>
      <button onClick={handleSignOut} style={{ backgroundColor: "red" }}>Sign Out</button>
    </div>
  );
}