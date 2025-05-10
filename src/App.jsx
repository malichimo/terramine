import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, onSnapshot } from "firebase/firestore";

import Login from "./components/Login";
import CheckInButton from "./components/CheckInButton";
import CheckInGallery from "./components/CheckInGallery";
import PurchaseButton from "./components/PurchaseButton";
import SignOutButton from "./components/SignOutButton";
import UserButton from "./components/UserButton";
import UserPage from "./components/UserPage";
import UserProfile from "./components/UserProfile";
import TAProfile from "./components/TAProfile";
import ErrorBoundary from "./components/ErrorBoundary";
import "./App.css";

// import { GoogleMap, LoadScript, Marker, Polyline } from "@react-google-maps/api"; // Commented out

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const TERRACRE_SIZE_METERS = 30;

function App() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [checkInStatus, setCheckInStatus] = useState("");
  const [showUserPage, setShowUserPage] = useState(false);
  const [error, setError] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const isDevelopment = import.meta.env.MODE === "development";


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUser(firebaseUser ? { uid: firebaseUser.uid, displayName: firebaseUser.displayName } : null);
        setAuthLoading(false);
      },
      (error) => {
        console.error("Auth error:", error);
        setUser(null);
        setAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isDevelopment) {
      setUser({ uid: "devUser", displayName: "Developer", terrabucks: 1000 });
      setUserLocation(defaultCenter);
      setAuthLoading(false);
    } else if (user && !authLoading) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {
          setError("Failed to get location.");
          setUserLocation(defaultCenter);
        }
      );
    }
  }, [user, authLoading, isDevelopment]);

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    window.location.reload();
  };

  const handleLoginSuccess = (firebaseUser) => {
    setUser({ uid: firebaseUser.uid, displayName: firebaseUser.displayName });
  };

  function MainContent() {
    const location = useLocation();
    const isMainPage = location.pathname === "/";

    if (authLoading) return <div>Loading authentication...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!user && !isDevelopment) return <Login onLoginSuccess={handleLoginSuccess} />;

    return (
      <div className="app-container">
        {user && (
          <>
            {!showUserPage && <UserButton onUser={() => setShowUserPage(true)} />}
            <SignOutButton onSignOut={handleSignOut} />
          </>
        )}

        {showUserPage ? (
          <UserPage
            user={user}
            onClose={() => setShowUserPage(false)}
            earnings={0}
            rockMines={0}
            coalMines={0}
            goldMines={0}
            diamondMines={0}
            checkInMessages={[]}
          />
        ) : (
          <>
            <header className="app-header"><h1>TerraMine</h1></header>
            <div style={{ width: "100%", height: "300px", background: "#eee", textAlign: "center", paddingTop: "140px" }}>
              [Map temporarily removed while upgrading]
            </div>
            <div className="greeting">
              Welcome, {user?.displayName || "User"}! You have {user?.terrabucks ?? 0} TB.
            </div>
            <div className="button-container">
              {/*<CheckInButton user={user} userLocation={userLocation} setCheckInStatus={setCheckInStatus} />*/}
              <PurchaseButton user={user} userLocation={userLocation} setUser={setUser} onPurchase={() => {}} gridCenter={userLocation} />
            </div>
            {checkInStatus && <p>{checkInStatus}</p>}
          </>
        )}
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/*" element={<MainContent />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
