import React from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase";

function Login({ onLoginSuccess }) {
  const handleLogin = async () => {
    try {
      console.log("Initiating sign-in with popup...");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("✅ Popup Sign-In Successful:", user.uid, user.email);
      if (onLoginSuccess) onLoginSuccess(user);
    } catch (error) {
      console.error("❌ Popup Sign-In Error:", error.code, error.message);
    }
  };

  return (
    <div className="login-container">
      <h2>Welcome to TerraMine</h2>
      <button onClick={handleLogin}>Sign in with Google</button>
    </div>
  );
}

export default Login;
