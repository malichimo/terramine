// src/components/Login.jsx
import React, { useEffect } from "react";
import { signInWithRedirect, getRedirectResult } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import "./Login.css";

const Login = ({ onLoginSuccess }) => {
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("✅ Redirect result found:", result.user);
          onLoginSuccess(result.user); // ✅ Pass the user back to App.jsx
        } else {
          console.log("ℹ️ No redirect result found.");
        }
      })
      .catch((error) => {
        console.error("❌ Error during redirect sign-in:", error);
      });
  }, []);

  const handleLogin = () => {
    signInWithRedirect(auth, googleProvider);
  };

  return (
    <div className="login-container">
      <h1>Welcome to TerraMine</h1>
      <img src="/terramine logo.png" alt="TerraMine Logo" style={{ width: "100px", marginBottom: "20px" }} />
      <button onClick={handleLogin}>Sign In with Google</button>
    </div>
  );
};

export default Login;
