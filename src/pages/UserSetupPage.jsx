import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { auth } from "../firebase";
import "./UserSetupPage.css";

const UserSetupPage = () => {
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
      setLoading(true);
      await setDoc(userRef, data);
      navigate("/main");
    } catch (err) {
      console.error("Error saving user setup:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-container">
      <h2>Complete Your Profile</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="nickname">Nickname (optional):</label>
        <input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Enter a nickname"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Start Mining!"}
        </button>
        {error && <p className="error-text">{error}</p>}
      </form>
    </div>
  );
};

export default UserSetupPage;
