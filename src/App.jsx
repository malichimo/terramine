import React, { useEffect, useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { AppRoutes } from "./AppRoutes";
import LoadingScreen from "./components/LoadingScreen";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("👥 Auth state changed:", firebaseUser);

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          console.log("✅ User doc found. Ready to load /main");
          setNeedsSetup(false);
        } else {
          console.log("👤 No user doc. Redirecting to /setup");
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

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      console.log("🔁 Starting login flow");
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("❌ Login failed:", error.message);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <Router>
      <AppRoutes user={user} needsSetup={needsSetup} onLogin={handleLogin} />
    </Router>
  );
}
