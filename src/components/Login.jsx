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
      <h2>Welcome to TerraMine</h2>
      <Image src="terramine logo.png" alt="TerraMine Logo" /> 
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
