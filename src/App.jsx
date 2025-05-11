import React from "react";
import "./App.css";
import logo from "./assets/terramine logo.png";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase";

function App() {
  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="landing-screen">
      <div className="landing-box">
        <img src={logo} alt="TerraMine Logo" className="landing-logo" />
        <h1 className="landing-title">Welcome to TerraMine</h1>
        <button className="google-login-button" onClick={handleGoogleLogin}>
          Login with Google
        </button>
      </div>
    </div>
  );
}

export default App;

