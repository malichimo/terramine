import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import logo from "./assets/terramine logo.png";
import { auth } from "./firebase";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import SignOutButton from "./components/SignOutButton";
import MainPage from "./pages/MainPage";
import UserSetupPage from "./pages/UserSetupPage";

function App() {
  const [user, setUser] = useState(null);
  const [userExists, setUserExists] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setUserExists(true);
        } else {
          setUserExists(false);
        }
      } else {
        setUser(null);
        setUserExists(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  const handleSetupComplete = async (nickname) => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        terrabucks: 1000,
        nickname: nickname || user.displayName || "User",
        createdAt: new Date().toISOString(),
      });
      setUserExists(true);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
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

  return (
    <Router>
      <div className="top-right">
        <SignOutButton onSignOut={handleSignOut} />
      </div>
      <Routes>
        {!userExists ? (
          <Route
            path="/*"
            element={<UserSetupPage user={user} onComplete={handleSetupComplete} />}
          />
        ) : (
          <Route path="/*" element={<MainPage user={user} />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
