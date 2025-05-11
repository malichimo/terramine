import React from "react";
import "./App.css";
import logo from "./assets/terramine logo.png";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "./firebase";
import SignOutButton from "./components/SignOutButton";

function App() {
  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.reload();
    } catch (err) {
      console.error("Sign-out failed:", err);
    }
  };

  return (
    <div className="landing-screen">
      <div className="top-right">
        <SignOutButton onSignOut={handleSignOut} />
      </div>
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
