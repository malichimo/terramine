// src/components/Login.jsx
import React from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import "./Login.css";

const Login = ({ onLoginSuccess }) => {
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (onLoginSuccess) {
        onLoginSuccess(result.user);
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert("Google login failed. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <h1 className="login-title">Welcome to TerraMine</h1>
      <img src="/terramine logo.png" alt="TerraMine Logo" className="logo" />
      <button className="google-button" onClick={handleGoogleSignIn}>
        Sign in with Google
      </button>
    </div>
  );
};

export default Login;
