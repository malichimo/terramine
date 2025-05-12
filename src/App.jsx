import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import SignOutButton from "./components/SignOutButton";
import MainPage from "./pages/MainPage";
import UserSetupPage from "./pages/UserSetupPage";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setNeedsSetup(false);
        } else {
          // Create a placeholder user record to signal setup in progress
          await setDoc(userRef, {
            email: firebaseUser.email,
            createdAt: new Date().toISOString(),
          });
          setNeedsSetup(true);
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="centered-text">Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        {user && <SignOutButton />}
        <Routes>
          <Route
            path="/"
            element={
              user ? (
                needsSetup ? (
                  <Navigate to="/setup" />
                ) : (
                  <Navigate to="/main" />
                )
              ) : (
                <WelcomeScreen />
              )
            }
          />
          <Route path="/setup" element={<UserSetupPage user={user} setUser={setUser} />} />
          <Route path="/main" element={<MainPage user={user} />} />
        </Routes>
      </div>
    </Router>
  );
}

function WelcomeScreen() {
  const navigate = useNavigate();

  const handleLogin = async () => {
    const provider = new auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    navigate("/");
  };

  return (
    <div className="centered-container">
      <div className="card">
        <img src="/terramine logo.png" alt="TerraMine Logo" className="logo" />
        <h1 className="welcome-title">Welcome to TerraMine</h1>
        <button onClick={handleLogin} className="google-button">
          Login with Google
        </button>
      </div>
    </div>
  );
}

export default App;

