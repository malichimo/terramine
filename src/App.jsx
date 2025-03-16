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
const libraries = ["marker"];

console.log("TerraMine v1.30b - Time tracking enabled");

function App() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [ownedTerracres, setOwnedTerracres] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0); // ✅ NEW: Earnings State
  const [checkInStatus, setCheckInStatus] = useState("");
  const [error, setError] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    console.log("Auth Listener Initialized ✅");
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          console.log("✅ Redirect Sign-In Successful:", result.user.uid);
          setUser(result.user);
          await initializeUser(result.user);
        }
      } catch (error) {
        console.error("❌ Redirect Result Error:", error.message);
      }
    };
    handleRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth State Changed ✅:", currentUser?.uid || "No user");
      if (currentUser) {
        await initializeUser(currentUser);
      } else {
        setUser(null);
        setOwnedTerracres([]);
      }
    });

    return () => unsubscribe();
  }, []);

  async function initializeUser(currentUser) {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      console.log("🚀 New user detected - Creating Firestore profile...");
      await setDoc(userRef, { uid: currentUser.uid, terrabucks: 1000, earnings: 0 });
      setUser({ ...currentUser, terrabucks: 1000, earnings: 0 });
    } else {
      const userData = userSnap.data();
      setUser({ ...currentUser, ...userData });
      calculateEarnings(userData.uid); // ✅ NEW: Calculate earnings on login
    }
    fetchOwnedTerracres();
  }

  useEffect(() => {
    if (!user) return;
    console.log("Fetching User Location... 📍");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("✅ Location Retrieved:", position.coords);
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

  const fetchOwnedTerracres = useCallback(async () => {
    if (!user) return;
    try {
      console.log("📡 Fetching Terracres for user:", user.uid);
      const terracresRef = collection(db, "terracres");
      const querySnapshot = await getDocs(terracresRef);
      const properties = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setOwnedTerracres(properties);
    } catch (error) {
      console.error("🔥 Terracres fetch error:", error);
    }
  }, [user]);

  // ✅ NEW: Function to calculate earnings
  const calculateEarnings = async (userId) => {
    try {
      const terracresRef = collection(db, "terracres");
      const querySnapshot = await getDocs(terracresRef);
      let totalEarnings = 0;

      querySnapshot.forEach((doc) => {
        const terracre = doc.data();
        if (terracre.ownerId === userId) {
          const purchasedAt = new Date(terracre.purchasedAt);
          const hoursOwned = (Date.now() - purchasedAt.getTime()) / (1000 * 60 * 60);

          let ratePerHour = 0.01; // Default: Rock Mine (1 cent per hour)
          if (terracre.type === "coalMine") ratePerHour = 0.05;
          if (terracre.type === "goldMine") ratePerHour = 0.15;
          if (terracre.type === "diamondMine") ratePerHour = 0.50;

          totalEarnings += hoursOwned * ratePerHour;
        }
      });

      setTotalEarnings(totalEarnings);
      await updateDoc(doc(db, "users", userId), { earnings: totalEarnings });

      console.log("✅ Earnings Updated:", totalEarnings);
    } catch (error) {
      console.error("🔥 Earnings Calculation Error:", error);
    }
  };

  if (error) return <div>Error: {error}</div>;
  if (!user) return <Login onLoginSuccess={setUser} />;

  return (
    <div className="app-container">
      <header className="app-header">
        {user && (
          <button className="signout-button" onClick={() => signOut(auth)}>
            Sign Out
          </button>
        )}
        <h1>TerraMine</h1>
      </header>
      <p className="earnings">💰 Total Earnings: ${totalEarnings.toFixed(2)}</p>

      <Suspense fallback={<p>Loading map resources...</p>}>
        <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries}>
          {userLocation && (
            <GoogleMap mapContainerStyle={{ width: "100%", height: "500px" }} center={userLocation} zoom={15}>
              <Marker position={userLocation} label="You" />
              {ownedTerracres.map((terracre) => (
                <Marker
                  key={terracre.id}
                  position={{ lat: terracre.lat, lng: terracre.lng }}
                  icon={{
                    path: "M -15,-15 L 15,-15 L 15,15 L -15,15 Z",
                    scale: 1.5,
                    fillColor: terracre.ownerId === user.uid ? "blue" : "green",
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: "#fff",
                  }}
                />
              ))}
            </GoogleMap>
          )}
        </LoadScript>
      </Suspense>

      <CheckInButton user={user} userLocation={userLocation} setCheckInStatus={setCheckInStatus} setUser={setUser} />
      <PurchaseButton user={user} userLocation={userLocation} fetchOwnedTerracres={fetchOwnedTerracres} />
      {checkInStatus && <p>{checkInStatus}</p>}
    </div>
  );
}

export default App;


