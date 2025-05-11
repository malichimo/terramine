import React from "react";
import "./App.css";
import logo from "./assets/terramine logo.png";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "./firebase";

function App() {
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <img src={logo} alt="TerraMine Logo" className="logo" />
        <h1 className="title">Welcome to TerraMine</h1>
        <button className="google-login-button" onClick={handleGoogleLogin}>
          Login with Google
        </button>
      </header>
    </div>
  );
}

export default App;
