import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
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

function AppRoutes({ user, setUser }) {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(null); // null means still checking
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserDocument = async () => {
      if (!user?.uid) return;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setNeedsSetup(false);
      } else {
        setNeedsSetup(true);
      }

      setLoading(false);
    };

    checkUserDocument();
  }, [user]);

  if (loading || needsSetup === null) {
    return (
      <div className="loading-screen">
        <p>Welcome, new user!</p>
        <p>Redirecting to setup page...</p>
      </div>
    );
  }

  return (
    <>
      <SignOutButton onSignOut={() => signOut(auth).then(() => setUser(null))} />
      <Routes>
        <Route
          path="/main"
          element={!needsSetup ? <MainPage user={user} /> : <Navigate to="/setup" />}
        />
        <Route
          path="/setup"
          element={needsSetup ? <UserSetupPage user={user} /> : <Navigate to="/main" />}
        />
        {/* Redirect unknown routes based on setup status */}
        <Route
          path="*"
          element={<Navigate to={needsSetup ? "/setup" : "/main"} />}
        />
      </Routes>
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
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
