import React from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

export default function Login() {
  const handleLogin = async () => {
    try {
      console.log("🔁 Starting login flow");
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("❌ Login error:", error.message);
      alert("Login failed. Please try again.");
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
      <button onClick={handleLogin}>Sign in with Google</button>
    </div>
  );
}