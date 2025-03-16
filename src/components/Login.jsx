// src/components/Login.jsx
import React, { useRef, useEffect } from "react";
import { signInWithPopup, signInWithRedirect } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import "./Login.css";

function Login({ onLoginSuccess }) {
  const loginButtonRef = useRef(null);

  useEffect(() => {
    if (loginButtonRef.current) {
      loginButtonRef.current.focus();
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLoginSuccess(result.user);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="login-container">
      <h1>Welcome to TerraMine</h1>
      <img src="terramine logo.png" alt="Login" className="login-image" />
      <h2>Login</h2>
      <button
        ref={loginButtonRef}
        className="login-button"
        onClick={handleGoogleSignIn}
      >
        Sign in with Google
      </button>
    </div>
  );
}

export default Login;
