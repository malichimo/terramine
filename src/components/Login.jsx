import React from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import "./Login.css";

export default function Login({ onLoginSuccess }) {
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLoginSuccess(result.user);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="login-container">
      <h1>Welcome to TerraMine</h1>
      <img src="/logo.png" alt="Logo" />
      <button onClick={handleGoogleSignIn}>Sign in with Google</button>
    </div>
  );
}
