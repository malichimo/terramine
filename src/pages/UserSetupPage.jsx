import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import "../App.css";

function UserSetupPage({ user }) {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        nickname: nickname || user.displayName || "",
        terrabucks: 1000,
        createdAt: Timestamp.now(),
      });
      navigate("/main");
    } catch (err) {
      console.error("Setup failed:", err);
      setError("Failed to complete setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="centered-container">
      <div className="card">
        <h2>Complete Your Profile</h2>
        <form onSubmit={handleSubmit}>
          <p>Email: <strong>{user.email}</strong></p>
          <input
            type="text"
            placeholder="Optional nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Finish Setup"}
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}

export default UserSetupPage;
