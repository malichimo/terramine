import React, { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut, getRedirectResult } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker, Polygon } from "@react-google-maps/api";
import Login from "./components/Login";
import CheckInButton from "./components/CheckInButton";
import PurchaseButton from "./components/PurchaseButton";
import "./App.css";

// Define constants for map and grid settings
const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us";
const TERRACRE_SIZE_METERS = 30;
const GRID_SIZE = 5;
const libraries = ["marker"];

console.log("TerraMine v1.30b - 30m grid, popup auth with URL logging, TA snaps to exact user cell");

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
  const [zoom, setZoom] = useState(18);
  const mapRef = useRef(null);

  useEffect(() => {
    console.log("Auth Listener Initialized ✅");
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        console.log("✅ User signed in:", currentUser.uid);
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          console.log("🚀 New user detected, creating Firestore profile...");
          await setDoc(userRef, { uid: currentUser.uid, terrabucks: 1000 });
        }
        setUser(currentUser);
        fetchOwnedTerracres();
      } else {
        setUser(null);
        setOwnedTerracres([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => setUserLocation(defaultCenter)
      );
    } else {
      setUserLocation(defaultCenter);
    }
  }, []);

  const fetchOwnedTerracres = useCallback(async () => {
    if (!user) return;
    try {
      console.log("📡 Fetching Terracres for user:", user.uid);
      const terracresRef = collection(db, "terracres");
      const querySnapshot = await getDocs(terracresRef);
      const now = Date.now();

      const properties = querySnapshot.docs
        .map((doc) => {
          const data = doc.data();
          if (data.ownerId !== user.uid) return null;

          // ✅ New Feature: Calculate earnings based on time owned
          const purchaseTime = new Date(data.purchasedAt).getTime();
          const hoursOwned = (now - purchaseTime) / (1000 * 60 * 60);
          const earnings = (hoursOwned * data.rate).toFixed(2);

          return { id: doc.id, ...data, earnings };
        })
        .filter(Boolean);

      setOwnedTerracres(properties);
    } catch (error) {
      console.error("🔥 Terracres fetch error:", error);
      setOwnedTerracres([]);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchOwnedTerracres();
  }, [fetchOwnedTerracres, purchaseTrigger, user]);

  return (
    <div className="app-container">
      <header className="app-header">
        {user && <button className="signout-button" onClick={() => signOut(auth)}>Sign Out</button>}
        <h1>TerraMine</h1>
      </header>
      <Suspense fallback={<p>Loading map resources...</p>}>
        <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries}>
          {apiLoaded && userLocation ? (
            <GoogleMap mapContainerStyle={{ width: "100%", height: "500px" }} center={userLocation} zoom={zoom}>
              {user && <Marker position={userLocation} label="You" zIndex={1000} />}
              {ownedTerracres.map((terracre) => (
                <Marker key={terracre.id} position={{ lat: terracre.lat, lng: terracre.lng }} />
              ))}
            </GoogleMap>
          ) : (
            <p>Getting your location...</p>
          )}
        </LoadScript>
      </Suspense>

      {user && (
        <>
          <p className="greeting">Welcome {user.displayName || "User"}, you have {user.terrabucks ?? 0} TB.</p>
          <CheckInButton user={user} />
          <PurchaseButton user={user} onPurchase={() => setPurchaseTrigger(purchaseTrigger + 1)} />
          <h3>Your Owned Terracres & Earnings</h3>
          <ul>
            {ownedTerracres.map((terracre) => (
              <li key={terracre.id}>
                <strong>{terracre.type.toUpperCase()}</strong> - Earnings: ${terracre.earnings}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;

