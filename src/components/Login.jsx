// src/components/Login.jsx
import React from "react";
import { signInWithRedirect } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import "./Login.css";

const Login = () => {
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
