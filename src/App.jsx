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
const libraries = ["marker"]; // Static libraries to fix LoadScript warning

// Earning rates per hour (mock rates, can be adjusted)
const EARNING_RATES = {
  rockMine: 0.01, // $0.01 per hour
  coalMine: 0.05, // $0.05 per hour
  goldMine: 0.15, // $0.15 per hour
  diamondMine: 0.50, // $0.50 per hour
};

console.log("TerraMine v1.30c - 30m grid, ownership time tracking, earning tiers enabled");

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
  const [purchasedThisSession, setPurchasedThisSession] = useState(null);
  const mapRef = useRef(null);

  // ✅ Effect to handle authentication state changes
  useEffect(() => {
    console.log("Auth Listener Initialized ✅");
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          console.log("✅ Redirect Sign-In Successful:", result.user.uid);
          setUser(result.user);
          await setupUserData(result.user);
        }
      } catch (error) {
        console.error("❌ Redirect Result Error:", error);
      }
    };

    handleRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;
      console.log("Auth State Changed ✅:", currentUser?.uid || "No user");

      if (currentUser) {
        setUser(currentUser);
        await setupUserData(currentUser);
      } else {
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

  // ✅ Ensure Firestore user exists
  const setupUserData = async (currentUser) => {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.log("New user detected 🚀 - Creating Firestore profile...");
      await setDoc(userRef, { uid: currentUser.uid, terrabucks: 1000, earnings: 0 });
    } else {
      console.log("User exists ✅", userSnap.data());
    }
    fetchOwnedTerracres();
    setMapKey(Date.now());
  };

  // ✅ Fetch user location
  useEffect(() => {
    if (!user) return;
    console.log("Fetching User Location... 📍");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => {
          console.error("❌ Location error:", error);
          setUserLocation(defaultCenter);
        }
      );
    } else {
      console.warn("⚠️ Geolocation not supported");
      setUserLocation(defaultCenter);
    }
  }, [user]);

  // ✅ Fetch owned Terracres
  const fetchOwnedTerracres = useCallback(async () => {
    if (!user) return;
    try {
      const terracresRef = collection(db, "terracres");
      const querySnapshot = await getDocs(terracresRef);
      const properties = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setOwnedTerracres(properties);
    } catch (error) {
      console.error("🔥 Firestore Fetch Error:", error);
    }
  }, [user]);

  // ✅ Effect to track earnings for owned properties
  useEffect(() => {
    const updateEarnings = async () => {
      if (!user || ownedTerracres.length === 0) return;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      let totalEarnings = userData.earnings || 0;
      const now = new Date().getTime();

      for (const terracre of ownedTerracres) {
        if (!terracre.purchasedAt || !terracre.ownerId) continue;

        const purchaseTime = new Date(terracre.purchasedAt).getTime();
        const hoursOwned = (now - purchaseTime) / (1000 * 60 * 60);
        const earningRate = EARNING_RATES[terracre.type] || 0; // Default to $0 if type is undefined

        totalEarnings += hoursOwned * earningRate;
      }

      await updateDoc(userRef, { earnings: totalEarnings });
      console.log("💰 Earnings updated:", totalEarnings);
    };

    updateEarnings();
  }, [ownedTerracres, user]);

  // ✅ Function to handle purchase
  const handlePurchase = async (gridCenter) => {
    if (!user || !gridCenter) return;

    const terracreId = `${gridCenter.lat.toFixed(7)}-${gridCenter.lng.toFixed(7)}`;
    const terracreRef = doc(db, "terracres", terracreId);

    await setDoc(terracreRef, {
      lat: gridCenter.lat,
      lng: gridCenter.lng,
      ownerId: user.uid,
      purchasedAt: new Date().toISOString(),
      type: "rockMine", // Default type, can be changed later
    });

    fetchOwnedTerracres();
  };

  // ✅ Return UI
  return (
    <div className="app-container">
      <header className="app-header">
        {user && <button className="signout-button" onClick={() => signOut(auth)}>Sign Out</button>}
        <h1>TerraMine</h1>
      </header>

      <Suspense fallback={<p>Loading map resources...</p>}>
        <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries}>
          {apiLoaded && userLocation ? (
            <GoogleMap key={mapKey} center={userLocation} zoom={zoom}>
              {ownedTerracres.map((terracre) => (
                <Marker key={terracre.id} position={{ lat: terracre.lat, lng: terracre.lng }}
                  icon={{ fillColor: terracre.ownerId === user.uid ? "blue" : "green", fillOpacity: 1 }} />
              ))}
            </GoogleMap>
          ) : (
            <p>Loading map...</p>
          )}
        </LoadScript>
      </Suspense>

      {user && <p>💰 Earnings: ${user.earnings?.toFixed(2) || "0.00"}</p>}
    </div>
  );
}

export default App;

