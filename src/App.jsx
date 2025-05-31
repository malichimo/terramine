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
  const [needsSetup, setNeedsSetup] = useState(null); // null = unknown

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("👥 Auth state changed:", firebaseUser);
      setUser(firebaseUser);

      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          console.log("✅ Existing user found.");
          setNeedsSetup(false);
        } else {
          console.log("👤 New user. Needs setup.");
          setNeedsSetup(true);
        }
      } else {
        setNeedsSetup(false); // No user logged in
      }

      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  if (!authChecked || needsSetup === null) return <div>Loading...</div>;

  return (
    <Routes>
      {!user ? (
        <Route path="*" element={<Login />} />
      ) : needsSetup ? (
        <Route
          path="*"
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
          <Route path="*" element={<Navigate to="/main" replace />} />
        </>
      )}
    </Routes>
  );
}
