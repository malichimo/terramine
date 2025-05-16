import React from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithRedirect } from "firebase/auth";
import "./Login.css";

export default function Login() {
  const handleGoogleSignIn = () => {
    signInWithRedirect(auth, googleProvider)
      .then(() => {
        console.log("Redirecting to Google login...");
      })
      .catch((error) => {
        console.error("Login failed:", error);
      });
  };

  return (
    <div className="login-container">
      <h1>Welcome to TerraMine</h1>
      <img src="/Terramine logo.png" alt="Logo" className="logo" />
      <button onClick={handleGoogleSignIn}>SIGN IN WITH GOOGLE</button>
    </div>
  );
}

