import React, { useEffect, useState } from "react";
import {
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";
import "./Login.css";

export default function Login({ onLoginSuccess }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("✅ Redirect result found:", result.user);
          setUser(result.user);
          onLoginSuccess(result.user);
        } else {
          console.log("ℹ️ No redirect result found.");
        }
      })
      .catch((error) => {
        console.error("❌ Redirect error:", error.message);
      });
  }, [onLoginSuccess]);

  const handleLogin = async () => {
    console.log("🔁 Initiating Google sign-in...");
    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" }); // 👈 forces popup
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("❌ Error initiating redirect:", error.message);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <div className="login-container">
      <h1>Welcome to TerraMine</h1>
      <img
        src="/terramine logo.png"
        alt="TerraMine Logo"
        className="login-image logo"
      />
      <button onClick={handleLogin} className="login-button">
        Sign In with Google
      </button>
      {user && (
        <button onClick={handleSignOut} className="logout-button">
          Sign Out
        </button>
      )}
    </div>
  );
}
