import React from "react";
import { auth } from "../firebase";
import { GoogleAuthProvider, signInWithRedirect } from "firebase/auth";

const Login = ({ onLoginSuccess }) => {
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
      // onLoginSuccess handled by App.jsx onAuthStateChanged
    } catch (error) {
      console.error("Google login error:", error);
    }
  };

  return (
    <div className="login-container">
      <h2>Welcome to TerraMine</h2>
      <button onClick={handleGoogleLogin} className="google-login-button">
        Login with Google
      </button>
    </div>
  );
};

export default Login;
