import React, { useState, useEffect, useCallback, Suspense } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth"; // ✅ Add signOut
import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import Login from "./components/Login";
import CheckInButton from "./components/CheckInButton";
import "./App.css";

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us"; // Replace with your actual key

function App() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [ownedTerracres, setOwnedTerracres] = useState([]);
  const [checkInStatus, setCheckInStatus] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("Auth Listener Initialized ✅");
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;
      console.log("Auth State Changed ✅:", currentUser?.uid || "No user");
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            console.log("New user detected 🚀 - Creating Firestore profile...");
            await setDoc(userRef, { uid: currentUser.uid, terrabucks: 1000 });
            setUser({ ...currentUser, terrabucks: 1000 });
          } else {
            console.log("User exists ✅", userSnap.data());
            setUser({ ...currentUser, terrabucks: userSnap.data()?.terrabucks || 1000 });
          }
        } catch (err) {
          console.error("Firestore auth error:", err);
          setError("Failed to load user data.");
        }
      } else {
        setUser(null);
      }
    });

    return () => {
      setIsMounted(false);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    console.log("Fetching User Location... 📍");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMounted) return;
          console.log("✅ Location Retrieved:", position.coords);
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
      console.warn("⚠️ Geolocation not supported");
      setUserLocation(defaultCenter);
    }

    return () => setIsMounted(false);
  }, [user]);

  const fetchOwnedTerracres = useCallback(async () => {
    if (!user) return;
    try {
      console.log("📡 Fetching Terracres...");
      const terracresRef = collection(db, "terracres");
      const querySnapshot = await getDocs(terracresRef);
      const properties = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((t) => t.lat && t.lng);
      if (isMounted) setOwnedTerracres(properties);
    } catch (error) {
      console.error("🔥 Terracres fetch error:", error);
      setOwnedTerracres([]);
    }
  }, [user]);

  useEffect(() => {
    fetchOwnedTerracres();
  }, [fetchOwnedTerracres]);

  // ✅ Sign-out function
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log("✅ User signed out");
      setUser(null); // This will trigger the Login screen
    } catch (error) {
      console.error("❌ Sign-out error:", error);
      setError("Failed to sign out.");
    }
  };

  if (error) return <div>Error: {error}</div>;
  if (!user) return <Login onLoginSuccess={setUser} />;

  return (
    <div className="app-container">
      <header className="app-header"> {/* ✅ Add header for layout */}
        <button className="signout-button" onClick={handleSignOut}>
          Sign Out
        </button>
        <h1>TerraMine</h1>
      </header>
      {!userLocation ? (
        <p>Getting your location...</p>
      ) : (
        <Suspense fallback={<p>Loading map resources...</p>}>
          <LoadScript
            googleMapsApiKey={GOOGLE_MAPS_API_KEY}
            onLoad={() => {
              console.log("✅ LoadScript loaded");
              setMapLoaded(true);
            }}
            onError={(e) => {
              console.error("❌ LoadScript error:", e);
              setError("Failed to load map.");
            }}
          >
            {mapLoaded ? (
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "500px" }}
                center={userLocation}
                zoom={15}
                onLoad={() => console.log("✅ GoogleMap rendered")}
              >
                <Marker position={userLocation} label="You" />
                {ownedTerracres.map((terracre) => (
                  <Marker
                    key={terracre.id}
                    position={{ lat: terracre.lat, lng: terracre.lng }}
                    icon={{
                      path: window.google.maps.SymbolPath.SQUARE,
                      scale: 10,
                      fillColor: terracre.ownerId === user.uid ? "blue" : "green",
                      fillOpacity: 1,
                      strokeWeight: 1,
                    }}
                  />
                ))}
              </GoogleMap>
            ) : (
              <p>Initializing map...</p>
            )}
          </LoadScript>
        </Suspense>
      )}
      <CheckInButton user={user} userLocation={userLocation} setCheckInStatus={setCheckInStatus} />
      {checkInStatus && <p>{checkInStatus}</p>}
    </div>
  );
}

export default App;
