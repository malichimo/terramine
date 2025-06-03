import React from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import "../App.css";

const Login = () => {
  const signInWithGoogle = async () => {
    console.log("🔐 Attempting Google Sign-In...");
    try {
      await signInWithPopup(auth, googleProvider);
      console.log("✅ Google Sign-In successful");
    } catch (error) {
      console.error("🔥 Error during Google Sign-In:", error.message);
    }
  };

  return (
    <div className="login-container">
      <h2>Welcome to Terramine</h2>
      <button className="google-signin-button" onClick={signInWithGoogle}>
        Sign in with Google
      </button>
    </div>
  );
};

export default Login;