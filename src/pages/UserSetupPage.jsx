import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { auth } from "../firebase";
import "./UserSetupPage.css"; // optional styling

const UserSetupPage = () => {
  const [nickname, setNickname] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;

    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const data = {
      uid: user.uid,
      email: user.email,
      nickname: nickname || user.displayName || "User",
      terrabucks: 1000,
      earnings: 0,
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(userRef, data);
      navigate("/main");
    } catch (err) {
      console.error("Error saving user setup:", err);
    }
  };

  return (
    <div className="setup-container">
      <h2>Complete Your Profile</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Nickname (optional):
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </label>
        <button type="submit">Start Mining!</button>
      </form>
    </div>
  );
};

export default UserSetupPage;
