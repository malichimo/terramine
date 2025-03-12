import React from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase";

function Login({ onLoginSuccess }) {
  const handleLogin = async (event) => {
    event.preventDefault(); // Prevent default navigation
    console.log("handleLogin triggered, checking popup...");

    // Test if popup can open
    const testWindow = window.open("", "_blank", "width=500,height=500");
    if (!testWindow || testWindow.closed || typeof testWindow.closed === "undefined") {
      console.warn("⚠️ Popup blocked by browser during test.");
      alert("Popup blocked! Please allow popups for https://terramine.onrender.com and try again.");
      return;
    }
    testWindow.close();

    try {
      console.log("Attempting sign-in with popup...");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("✅ Popup Sign-In Successful:", user.uid, user.email);
      if (onLoginSuccess) onLoginSuccess(user);
    } catch (error) {
      console.error("❌ Popup Sign-In Error:", error.code, error.message);
      if (error.code === "auth/popup-blocked") {
        console.warn("⚠️ Popup blocked by browser during sign-in.");
        alert("Popup blocked! Please allow popups for https://terramine.onrender.com and try again.");
      } else if (error.code === "auth/cancelled-popup-request") {
        console.warn("⚠️ Popup request cancelled.");
      } else {
        console.error("Unexpected error:", error);
      }
    }
  };

  return (
    <div className="login-container">
      <h2>Welcome to TerraMine</h2>
      <button className="google-login-button" onClick={handleLogin}>
        Sign in with Google
      </button>
    </div>
  );
}

export default Login;
