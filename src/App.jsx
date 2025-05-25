import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

import { auth, db, googleProvider } from "./firebase";
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

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          console.log("✅ User document found, redirecting to /main");
          setNeedsSetup(false);
          navigate("/main");
        } else {
          console.log("👤 New user detected, redirecting to /setup");
          setNeedsSetup(true);
          navigate("/setup");
        }
      } catch (error) {
        console.error("❌ Error checking user document:", error);
      } finally {
        setLoading(false);
      }
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
        <Route path="/main" element={<MainPage user={user} />} />
        <Route path="/setup" element={<UserSetupPage user={user} />} />
        <Route path="/" element={<Navigate to={needsSetup ? "/setup" : "/main"} />} />
        <Route path="*" element={<Navigate to="/main" />} />
      </Routes>
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);



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
