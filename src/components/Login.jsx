import React, { useEffect } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

export default function Login() {
  const handleLogin = async () => {
    try {
      console.log("🔁 Starting login flow");
      const result = await signInWithPopup(auth, googleProvider);
      console.log("✅ Login successful:", result.user);
      // No need to manually redirect — App.jsx will react to onAuthStateChanged
    } catch (error) {
      console.error("❌ Login error:", error);
      alert("Login failed. Please check the console for details.");
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
