import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import Login from "./components/Login";
import MainPage from "./pages/MainPage";
import UserSetupPage from "./pages/UserSetupPage";

export default function App() {
  const [user, setUser] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkUserDoc = async (firebaseUser) => {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const docSnap = await getDoc(userDocRef);
    setNeedsSetup(!docSnap.exists());
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await checkUserDoc(firebaseUser);
      } else {
        setUser(null);
        setNeedsSetup(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>
        {!user && <Route path="*" element={<Login />} />}
        {user && needsSetup && (
          <Route
            path="*"
            element={<UserSetupPage user={user} onSetupComplete={() => setNeedsSetup(false)} />}
          />
        )}
        {user && !needsSetup && (
          <>
            <Route path="/main" element={<MainPage user={user} />} />
            <Route path="*" element={<Navigate to="/main" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}
