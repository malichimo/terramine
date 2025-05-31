import React from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import "./Login.css"; // Optional: keep if you have styling

export default function Login() {
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("✅ Logged in:", result.user);
      // Firebase onAuthStateChanged in App.jsx will handle redirect
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
