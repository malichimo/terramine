import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut, getRedirectResult } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

import Login from "./components/Login";
import SignOutButton from "./components/SignOutButton";
import MainPage from "./pages/MainPage";
import UserSetupPage from "./pages/UserSetupPage";
import "./App.css";

function AppRoutes({ user, setUser }) {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserDocument = async () => {
      if (!user?.uid) return;

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setNeedsSetup(false);
          navigate("/main");
        } else {
          setNeedsSetup(true);
          navigate("/setup");
        }
      } catch (err) {
        console.error("❌ Failed to check user document:", err);
      } finally {
        setLoading(false);
      }
    };

    checkUserDocument();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="loading-screen">
        <p>Welcome, new user!</p>
        <p>Redirecting...</p>
      </div>
    );
  }

  return (
    <>
      <SignOutButton onSignOut={() => signOut(auth).then(() => setUser(null))} />
      <Routes>
        <Route path="/main" element={<MainPage user={user} />} />
        <Route path="/setup" element={<UserSetupPage user={user} />} />
        <Route path="*" element={<Navigate to={needsSetup ? "/setup" : "/main"} />} />
      </Routes>
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Handle redirect result from Google login
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("✅ Google login redirect result:", result.user);
          setUser(result.user);
        }
      })
      .catch((error) => {
        console.error("❌ Redirect login failed:", error);
      });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("👤 Auth state changed:", firebaseUser);
      setUser(firebaseUser);
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  if (!authChecked) {
    return <div className="loading-screen">Checking authentication...</div>;
  }

  return (
    <Router>
      {user ? (
        <AppRoutes user={user} setUser={setUser} />
      ) : (
        <Login onLoginSuccess={(user) => setUser(user)} />
      )}
    </Router>
  );
}

export default App;
