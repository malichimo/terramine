// src/components/Login.jsx
import React, { useState, useEffect } from "react";
import {
  signInWithPopup,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../firebase";
import "./Login.css";

export default function Login({ onLoginSuccess }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("👥 Auth state changed:", firebaseUser);
      setUser(firebaseUser);
      if (firebaseUser) {
        onLoginSuccess(firebaseUser);
      }
    });
    return () => unsubscribe();
  }, [onLoginSuccess]);

  const handleLogin = async () => {
    console.log("🔁 Starting login flow"); // NEW
    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      console.log("✅ Popup login successful:", result.user);
      setUser(result.user);
      onLoginSuccess(result.user);
    } catch (error) {
      console.error("❌ Popup login error:", error.message);
    } 
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    console.log("👋 User signed out");
  };

  return (
    <div className="login-container">
      <h1>Welcome to TerraMine</h1>
      <img
        src="/terramine logo.png"
        alt="TerraMine Logo"
        className="login-image logo"
      />
      <button onClick={handleLogin} className="login-button">
        Sign In with Google
      </button>
      {user && (
        <button onClick={handleSignOut} className="logout-button">
          Sign Out
        </button>
      )}
    </div>
  );
}
