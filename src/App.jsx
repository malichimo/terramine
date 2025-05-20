// App.jsx
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import {
  onAuthStateChanged,
  getRedirectResult,
  signOut,
} from "firebase/auth";
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

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          console.log("✅ User document exists. Redirecting to main.");
          setNeedsSetup(false);
          navigate("/main");
        } else {
          console.log("👤 New user detected. Redirecting to setup.");
          setNeedsSetup(true);
          navigate("/setup");
        }
      } catch (error) {
        console.error("🔥 Error checking user document:", error);
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
    // Listen for auth changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("👥 Auth state changed:", firebaseUser);
      if (!firebaseUser) {
        try {
          const result = await getRedirectResult(auth);
          if (result?.user) {
            console.log("🔁 Retrieved user from redirect result:", result.user);
            setUser(result.user);
          } else {
            console.log("⚠️ No redirect result found.");
          }
        } catch (err) {
          console.error("❌ Error getting redirect result:", err);
        }
      } else {
        setUser(firebaseUser);
      }

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
