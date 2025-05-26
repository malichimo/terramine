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

function AppRoutes({ user, needsSetup, setUser }) {
  return (
    <>
      <SignOutButton onSignOut={() => signOut(auth).then(() => setUser(null))} />
      <Routes>
        <Route path="/main" element={<MainPage user={user} />} />
        <Route path="/setup" element={<UserSetupPage user={user} />} />
        <Route path="/" element={<Navigate to={needsSetup ? "/setup" : "/main"} />} />
        <Route path="*" element={<Navigate to={needsSetup ? "/setup" : "/main"} />} />
      </Routes>
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupChecked, setSetupChecked] = useState(false); // <-- NEW FLAG

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
        setSetupChecked(true); // <-- Set when Firestore check is done
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
