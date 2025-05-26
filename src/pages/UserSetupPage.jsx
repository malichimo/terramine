import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { auth, firestore } from "../firebase";
import { signOut } from "firebase/auth";

export default function UserSetupPage({ user }) {
  const [nickname, setNickname] = useState("");
  const navigate = useNavigate();

  const handleFinishSetup = async () => {
    if (!user) return;

    const userRef = doc(firestore, "users", user.uid);

    try {
      console.log("📦 Creating user doc with TB...");
      await setDoc(userRef, {
        email: user.email,
        nickname: nickname || "",
        createdAt: new Date().toISOString(),
        terraBucks: 1000,
      });

      console.log("✅ User setup complete. Redirecting to /main");
      navigate("/main");
    } catch (error) {
      console.error("❌ Error writing user document:", error);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="user-setup-container">
      <h1>User Setup</h1>
      <p>Welcome, {user?.email?.toUpperCase()}!</p>
      <label>
        Nickname (optional):{" "}
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
      </label>
      <br />
      <label>
        Email Address: <input type="text" value={user?.email} disabled />
      </label>
      <br />
      <button onClick={handleFinishSetup}>Finish Setup</button>
      <button onClick={handleLogout} style={{ marginLeft: "10px" }}>
        Sign Out
      </button>
    </div>
  );
}