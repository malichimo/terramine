import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import Login from "./components/Login";
import SignOutButton from "./components/SignOutButton";
import MainPage from "./pages/MainPage";
import UserSetupPage from "./pages/UserSetupPage";
import "./App.css";

export function AppRoutes({ user, needsSetup }) {
  return (
    <Routes>
      {needsSetup ? (
        <Route path="*" element={<Navigate to="/setup" replace />} />
      ) : (
        <>
          <Route path="/main" element={<MainPage user={user} />} />
          <Route path="*" element={<Navigate to="/main" replace />} />
        </>
      )}
    </Routes>
  );
}


function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupChecked, setSetupChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("👥 Auth state changed:", firebaseUser);
      setUser(firebaseUser);
      setAuthChecked(true);

      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          console.log("✅ User doc found. Ready to load /main");
          setNeedsSetup(false);
        } else {
          console.log("👤 No user doc. Redirecting to /setup");
          setNeedsSetup(true);
        }
        setSetupChecked(true);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!authChecked || (user && !setupChecked)) {
    return <div className="loading-screen">Checking authentication...</div>;
  }

  return (
    <Router>
      {user ? (
        <AppRoutes user={user} setUser={setUser} needsSetup={needsSetup} />
      ) : (
        <Login onLoginSuccess={(user) => setUser(user)} />
      )}
    </Router>
  );
}



export default App;
