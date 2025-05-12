import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import SignOutButton from "./components/SignOutButton";
import MainPage from "./pages/MainPage";
import UserSetupPage from "./pages/UserSetupPage";
import Login from "./components/Login";
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
          // Create placeholder to flag setup
          await setDoc(userRef, {
            email: firebaseUser.email,
            createdAt: new Date().toISOString(),
          });
          setNeedsSetup(true);
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
        setNeedsSetup(false);
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
                needsSetup ? <Navigate to="/setup" /> : <Navigate to="/main" />
              ) : (
                <Login onLoginSuccess={() => window.location.reload()} />
              )
            }
          />
          <Route path="/setup" element={<UserSetupPage user={user} setUser={setUser} />} />
          <Route path="/main" element={<MainPage user={user} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
