import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function UserSetupPage() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [nickname, setNickname] = useState("");

  const handleFinishSetup = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        nickname,
        createdAt: new Date().toISOString(),
        terrabucks: 1000
      });
      console.log("✅ User setup complete. Redirecting to /main");
      navigate("/main");
    } catch (error) {
      console.error("❌ Error saving user setup:", error);
    }
  };

  return (
    <div className="login-container">
      <h2>USER SETUP</h2>
      <p>WELCOME, {user?.email?.toUpperCase()}!</p>
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
        <input type="text" value={user?.email} disabled />
      </label>
      <button onClick={handleFinishSetup}>Finish Setup</button>
    </div>
  );
}
