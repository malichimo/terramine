// src/components/Login.jsx
import React, { useEffect } from "react";
import { signInWithRedirect, getRedirectResult, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth } from "../firebase";
import "./Login.css";

export default function Login({ onLoginSuccess }) {
  useEffect(() => {
    // Check for redirect result on initial load
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("✅ Redirect result found:", result.user);
          onLoginSuccess(result.user);
        } else {
          console.log("ℹ️ No redirect result found.");
        }
      })
      .catch((error) => {
        console.error("❌ Redirect error:", error.message);
      });
  }, [onLoginSuccess]);

  const handleLogin = async () => {
    console.log("🔁 Initiating Google sign-in...");
    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("❌ Error initiating redirect:", error.message);
    }
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
    </div>
  );
}
