import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { auth, firestore } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Login from "./components/Login";
import MainPage from "./pages/MainPage";
import UserSetupPage from "./pages/UserSetupPage";
import LoadingScreen from "./components/LoadingScreen";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("👥 Auth state changed:", firebaseUser);
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(firestore, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          console.log("✅ User doc found. Ready to load /main");
          setNeedsSetup(false);
        } else {
          console.log("👤 No user doc. Redirecting to /setup");
          setNeedsSetup(true);
        }
      } else {
        setUser(null);
        setNeedsSetup(false);
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  if (!authChecked) return <LoadingScreen />;

  return (
    <Router>
      <Routes>
        {!user && <Route path="*" element={<Login />} />}
        {user && needsSetup && <Route path="/setup" element={<UserSetupPage user={user} />} />}
        {user && !needsSetup && <Route path="/main" element={<MainPage user={user} />} />}
        {user && !needsSetup && <Route path="*" element={<Navigate to="/main" replace />} />}
      </Routes>
    </Router>
  );
}