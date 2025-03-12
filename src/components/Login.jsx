import React from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase";
import "./Login.css";

function Login({ onLoginSuccess }) {
  const handleLogin = async (event) => {
    event.preventDefault(); // Prevent default button behavior that might cause a redirect
    try {
      console.log("Initiating sign-in with popup...");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("✅ Popup Sign-In Successful:", user.uid, user.email);
      if (onLoginSuccess) onLoginSuccess(user);
    } catch (error) {
      console.error("❌ Popup Sign-In Error:", error.code, error.message);
      if (error.code === "auth/popup-blocked") {
        console.warn("⚠️ Popup blocked by browser. Please allow popups for this site.");
        alert("Popup blocked! Please allow popups for https://terramine.onrender.com and try again.");
      } else if (error.code === "auth/cancelled-popup-request") {
        console.warn("⚠️ Popup request cancelled.");
      }
    }
  };

  return (
    <div className="login-container">
      <h2>Welcome to TerraMine</h2>
      <button className="google-signin-button" onClick={handleLogin}>
        Sign in with Google
      </button>
    </div>
  );
}

export default Login;

export default Login;
