import React from "react";
import { signInWithRedirect } from "firebase/auth";
import { auth, provider } from "../firebase";

function Login({ onLoginSuccess }) {
  const handleLogin = async (event) => {
    event.preventDefault();
    console.log("handleLogin triggered, forcing redirect...");

    try {
      console.log("Attempting sign-in with redirect, redirect URL: https://terramine.onrender.com/");
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("❌ Redirect Sign-In Error:", error.code, error.message);
      alert("Redirect failed. Please check console for details and ensure popups/redirects are allowed.");
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
