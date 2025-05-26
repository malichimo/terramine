import React, { useEffect, useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import { AppRoutes } from "./AppRoutes";
import LoadingScreen from "./components/LoadingScreen";

export default function App() {
  const [user, setUser] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("👥 Auth state changed:", firebaseUser);
      setUser(firebaseUser);
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const docRef = doc(db, "users", user.uid);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          console.log("✅ User doc found. Ready to load /main");
          setNeedsSetup(false);
        } else {
          console.log("👤 No user doc. Redirecting to /setup");
          setNeedsSetup(true);
        }
      });

      return () => unsubscribe();
    }
  }, [user]);

  if (!authChecked) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <AppRoutes user={user} needsSetup={needsSetup} />
    </Router>
  );
}
