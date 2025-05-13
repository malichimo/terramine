import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
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
  const [needsSetup, setNeedsSetup] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserDocument = async () => {
      if (!user?.uid) return;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setNeedsSetup(false);
        navigate("/main");
      } else {
        setNeedsSetup(true);
        navigate("/setup");
      }

      setLoading(false);
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
        {needsSetup ? (
          <Route path="/setup" element={<UserSetupPage user={user} />} />
        ) : (
          <Route path="/main" element={<MainPage user={user} />} />
        )}
        <Route path="*" element={<MainPage user={user} />} />
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
