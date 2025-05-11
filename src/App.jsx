import React from "react";
import "./App.css";
import logo from "/src/assets/terramine logo.png";
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
        <img src={logo} alt="TerraMine Logo" style={{ width: "120px", marginBottom: "20px" }} />
        <h1>Welcome to TerraMine</h1>
      </header>
      <button
        style={{
          fontSize: "16px",
          padding: "10px 20px",
          backgroundColor: "#4285F4",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontFamily: "Trebuchet MS, sans-serif",
        }}
        onClick={handleGoogleLogin}
      >
        Login with Google
      </button>
    </div>
  );
}

export default App;

