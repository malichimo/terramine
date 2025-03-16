import React, { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker, Polygon } from "@react-google-maps/api";
import Login from "./components/Login";
import CheckInButton from "./components/CheckInButton";
import PurchaseButton from "./components/PurchaseButton";
import "./App.css";

// Map and grid settings
const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";
const TERRACRE_SIZE_METERS = 30;
const libraries = ["marker"];

// Terracre types and earnings per hour
const TERRACRE_TYPES = [
  { type: "Rock Mine", rate: 0.01 },
  { type: "Coal Mine", rate: 0.05 },
  { type: "Gold Mine", rate: 0.15 },
  { type: "Diamond Mine", rate: 0.50 },
];

console.log("TerraMine v1.31b - Earnings & Ownership Types Implemented ✅");

function App() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [ownedTerracres, setOwnedTerracres] = useState([]);
  const [checkInStatus, setCheckInStatus] = useState("");
  const [earnings, setEarnings] = useState(0);
  const [purchaseTrigger, setPurchaseTrigger] = useState(0);
  const mapRef = useRef(null);

  // ✅ Handle User Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        console.log("Auth State Changed ✅:", currentUser.uid);
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, { uid: currentUser.uid, terrabucks: 1000 });
        }
        setUser({ ...currentUser, terrabucks: userSnap.data()?.terrabucks || 1000 });
        fetchOwnedTerracres();
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // ✅ Fetch User Location
  useEffect(() => {
    if (!user) return;
    console.log("Fetching User Location... 📍");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("❌ Location error:", error);
          setUserLocation(defaultCenter);
        }
      );
    } else {
      setUserLocation(defaultCenter);
    }
  }, [user]);

  // ✅ Fetch Owned Terracres
  const fetchOwnedTerracres = useCallback(async () => {
    if (!user) return;
    try {
      const terracresRef = collection(db, "terracres");
      const querySnapshot = await getDocs(terracresRef);
      const properties = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setOwnedTerracres(properties);
    } catch (error) {
      console.error("🔥 Terracres fetch error:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchOwnedTerracres();
  }, [fetchOwnedTerracres, purchaseTrigger, user]);

  // ✅ Collect Earnings
  const collectEarnings = async () => {
    if (!user) return;
    let totalEarnings = 0;
    const userRef = doc(db, "users", user.uid);

    for (const terracre of ownedTerracres) {
      if (terracre.ownerId !== user.uid) continue;
      const terracreRef = doc(db, "terracres", terracre.id);
      const now = new Date();
      const lastCollected = new Date(terracre.lastCollected || now);
      const hoursOwned = (now - lastCollected) / (1000 * 60 * 60);
      const earnings = hoursOwned * (terracre.earningRate || 0);
      totalEarnings += earnings;

      await updateDoc(terracreRef, { lastCollected: now.toISOString() });
    }

    if (totalEarnings > 0) {
      setEarnings((prev) => prev + totalEarnings);
      setCheckInStatus(`💰 Collected $${totalEarnings.toFixed(2)} from Terracres`);
    } else {
      setCheckInStatus("No earnings available yet!");
    }
  };

  // ✅ Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      window.location.reload();
    } catch (error) {
      console.error("❌ Sign-out error:", error);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        {user && (
          <button className="signout-button" onClick={handleSignOut}>
            Sign Out
          </button>
        )}
        <h1>TerraMine</h1>
      </header>
      <Suspense fallback={<p>Loading map resources...</p>}>
        <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
          {userLocation ? (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "500px" }}
              center={userLocation}
              zoom={15}
              ref={mapRef}
            >
              <Marker position={userLocation} label="You" />
              {ownedTerracres.map((terracre) => (
                <Marker
                  key={terracre.id}
                  position={{ lat: terracre.lat, lng: terracre.lng }}
                  icon={{
                    path: "M -15,-15 L 15,-15 L 15,15 L -15,15 Z",
                    fillColor: terracre.ownerId === user.uid ? "blue" : "green",
                    fillOpacity: 1,
                    strokeWeight: 2,
                  }}
                />
              ))}
            </GoogleMap>
          ) : (
            <p>Loading map...</p>
          )}
        </LoadScript>
      </Suspense>

      <CheckInButton user={user} setCheckInStatus={setCheckInStatus} />
      <PurchaseButton
        user={user}
        gridCenter={userLocation}
        setCheckInStatus={setCheckInStatus}
        setUser={setUser}
        fetchOwnedTerracres={fetchOwnedTerracres}
      />
      <button className="earnings-button" onClick={collectEarnings}>Collect Earnings 💰</button>
      <p className="earnings-info">Total Earnings: ${earnings.toFixed(2)}</p>
      {checkInStatus && <p>{checkInStatus}</p>}
    </div>
  );
}

export default App;
