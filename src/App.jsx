import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

import MainPage from "./pages/MainPage";
import UserSetupPage from "./pages/UserSetupPage";
import Login from "./components/Login";

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("👥 Auth state changed:", firebaseUser);
      setUser(firebaseUser);
      setAuthChecked(true);

      if (firebaseUser) {
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            console.log("✅ User doc found. Ready to load /main");
            console.log("✅ User data ready:", userData);
            setNeedsSetup(false);
          } else {
            console.log("👤 No user doc. Redirecting to /setup");
            setNeedsSetup(true);
          }
        } catch (error) {
          console.error("🔥 Error checking user in Firestore:", error);
          setNeedsSetup(true);
        }
      }
    });

    const timeout = setTimeout(() => {
      if (!authChecked) {
        console.error("🔥 onAuthStateChanged did not fire within 5 seconds");
        setAuthChecked(true); // Force proceed to avoid infinite loading
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (!authChecked || needsSetup === null) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      {!user ? (
        <Route path="/" element={<Login />} />
      ) : needsSetup ? (
        <Route
          path="/setup"
          element={
            <UserSetupPage
              user={user}
              onSetupComplete={() => {
                console.log("🎉 Setup complete");
                setNeedsSetup(false);
              }}
            />
          }
        />
      ) : (
        <>
          <Route path="/main" element={<MainPage user={user} />} />
          <Route path="/" element={<Navigate to="/main" replace />} />
          <Route path="*" element={<Navigate to="/main" replace />} />
        </>
      )}
    </Routes>
  );
}