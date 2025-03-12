import React, { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut, getRedirectResult } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker, Polygon } from "@react-google-maps/api";
import Login from "./components/Login";
import CheckInButton from "./components/CheckInButton";
import PurchaseButton from "./components/PurchaseButton";
import "./App.css";

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us";
const TERRACRE_SIZE_METERS = 30; // ~100ft
const GRID_SIZE = 5; // 11x11 grid (330m x 330m) at zoom 18

console.log("TerraMine v1.28 - 30m grid, popup/redirect auth, TA snaps to exact user cell");

function App() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [ownedTerracres, setOwnedTerracres] = useState([]);
  const [checkInStatus, setCheckInStatus] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const [error, setError] = useState(null);
  const [purchaseTrigger, setPurchaseTrigger] = useState(0);
  const [mapKey, setMapKey] = useState(Date.now());
  const [zoom, setZoom] = useState(18); // Initial zoom 18
  const [purchasedThisSession, setPurchasedThisSession] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    console.log("Auth Listener Initialized ✅");
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          console.log("✅ Redirect Sign-In Successful:", result.user.uid, result.user.email);
          setUser(result.user); // Set user state directly since onLoginSuccess isn't passed here
          const userRef = doc(db, "users", result.user.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            console.log("New user detected 🚀 - Creating Firestore profile...");
            const newUserData = { uid: result.user.uid, terrabucks: 1000 };
            await setDoc(userRef, newUserData);
            setUser((prev) => ({ ...prev, ...newUserData }));
          } else {
            const userData = userSnap.data();
            setUser((prev) => ({ ...prev, terrabucks: userData.terrabucks ?? 1000 }));
          }
          fetchOwnedTerracres();
          setMapKey(Date.now());
        }
      } catch (error) {
        console.error("❌ Redirect Result Error:", error.code, error.message);
      }
    };
    handleRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;
      console.log("Auth State Changed ✅:", currentUser?.uid || "No user");

      if (currentUser && !user) { // Only process if user isn't set from redirect
        const userRef = doc(db, "users", currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            console.log("New user detected 🚀 - Creating Firestore profile...");
            const newUserData = { uid: currentUser.uid, terrabucks: 1000 };
            await setDoc(userRef, newUserData);
            setUser({ ...currentUser, ...newUserData });
          } else {
            const userData = userSnap.data();
            setUser({ ...currentUser, terrabucks: userData.terrabucks ?? 1000 });
          }
          fetchOwnedTerracres();
          setMapKey(Date.now());
        } catch (err) {
          console.error("Firestore auth error:", err);
          setError("Failed to load user data.");
        }
      } else if (!currentUser) {
        setUser(null);
        setOwnedTerracres([]);
        setMapKey(Date.now());
      }
    });

    return () => {
      setIsMounted(false);
      unsubscribe();
    };
  }, []);

  // ... (rest of useEffect, fetchOwnedTerracres, handleSignOut, handlePurchase, getMarkerScale, getGridLines, snapToGridCenter, and return remain the same as v1.27)
  // ... (ensure the rest of the file matches the previous v1.27 App.jsx)

  return (
    // ... (return section remains the same as v1.27)
  );
}

export default App;
