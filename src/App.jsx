import React, { useState, useEffect, useCallback, Suspense } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import Login from "./components/Login";
import CheckInButton from "./components/CheckInButton";
import PurchaseButton from "./components/PurchaseButton";
import "./App.css";

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us";
const TERRACRE_SIZE_METERS = 30; // ~100ft

console.log("TerraMine v1.13 - Zoom-adjusted 30m squares, initial zoom 18");

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
      console.log("📡 Fetching Terracres for user:", user.uid);
      const terracresRef = collection(db, "terracres");
      const querySnapshot = await getDocs(terracresRef);
      const properties = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((t) => t.lat && t.lng && typeof t.lat === "number" && typeof t.lng === "number");
      if (isMounted) {
        console.log("✅ Terracres fetched:", properties);
        setOwnedTerracres(properties);
      }
    } catch (error) {
      console.error("🔥 Terracres fetch error:", error);
      setOwnedTerracres([]);
    }
  }, [user, isMounted]);

  useEffect(() => {
    if (user) fetchOwnedTerracres();
  }, [fetchOwnedTerracres, purchaseTrigger, user]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log("✅ User signed out");
      setUser(null);
      setApiLoaded(false);
      setMapLoaded(false);
      window.location.reload();
    } catch (error) {
      console.error("❌ Sign-out error:", error);
      setError("Failed to sign out.");
    }
  };

  const handlePurchase = (terracreId) => {
    setPurchaseTrigger((prev) => prev + 1);
    setPurchasedThisSession(terracreId);
    console.log("✅ Purchase trigger incremented:", purchaseTrigger + 1, "Purchased:", terracreId);
    fetchOwnedTerracres();
    setMapKey(Date.now());
  };

  const getMarkerScale = (lat) => {
    const metersPerPixel = 156543.03392 * Math.cos((lat * Math.PI) / 180) / Math.pow(2, zoom);
    const scale = TERRACRE_SIZE_METERS / metersPerPixel / 1.5; // ~30m at zoom 15
    console.log("Scale calc - Lat:", lat, "Zoom:", zoom, "Meters/Pixel:", metersPerPixel, "Scale:", scale);
    return isNaN(scale) || scale <= 0 ? 1 : scale;
  };

  if (error) return <div>Error: {error}</div>;
  if (!user && !apiLoaded) return <Login onLoginSuccess={setUser} />;

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
        <LoadScript
          googleMapsApiKey={GOOGLE_MAPS_API_KEY}
          onLoad={() => {
            console.log("✅ LoadScript loaded");
            setApiLoaded(true);
            setMapLoaded(true);
          }}
          onError={(e) => {
            console.error("❌ LoadScript error:", e);
            setError("Failed to load map.");
          }}
        >
          {apiLoaded && userLocation ? (
            <GoogleMap
              key={mapKey}
              mapContainerStyle={{ width: "100%", height: "500px" }}
              center={userLocation || defaultCenter}
              zoom={zoom}
              onLoad={() => console.log("✅ GoogleMap rendered")}
              onZoomChanged={(map) => {
                if (map) {
                  const newZoom = map.getZoom();
                  setZoom(newZoom);
                  setMapKey(Date.now()); // Rerender on zoom
                  console.log("Zoom changed:", newZoom);
                }
              }}
            >
              {console.log(
                "Rendering map - User:",
                user?.uid,
                "Location:",
                userLocation,
                "Terracres:",
                ownedTerracres.map((t) => ({ id: t.id, lat: t.lat, lng: t.lng, ownerId: t.ownerId })),
                "Purchased this session:",
                purchasedThisSession
              )}
              {user && userLocation && (
                purchasedThisSession === `${userLocation.lat.toFixed(4)}_${userLocation.lng.toFixed(4)}`
                  ? console.log("Pin hidden - Purchased this session:", userLocation)
                  : console.log("Pin shown - Not purchased this session:", userLocation) || (
                      <Marker position={userLocation} label="You" zIndex={1000} />
                    )
              )}
              {ownedTerracres.map((terracre) => {
                const scale = getMarkerScale(terracre.lat);
                console.log("Marker render:", terracre.id, "Lat:", terracre.lat, "Lng:", terracre.lng, "Scale:", scale);
                return (
                  <Marker
                    key={terracre.id}
                    position={{ lat: Number(terracre.lat), lng: Number(terracre.lng) }}
                    icon={{
                      path: "M -13,-13 L 13,-13 L 13,13 L -13,13 Z",
                      scale: scale,
                      fillColor: terracre.ownerId === user.uid ? "blue" : "green",
                      fillOpacity: 1,
                      strokeWeight: 2,
                      strokeColor: "#fff",
                    }}
                    title={`Terracre owned by ${terracre.ownerId === user.uid ? "you" : "someone else"}`}
                  />
                );
              })}
            </GoogleMap>
          ) : (
            <p>{userLocation ? "Initializing map..." : "Getting your location..."}</p>
          )}
        </LoadScript>
      </Suspense>
      {user && (
        <>
          <p className="greeting">
            Welcome {user.displayName || "User"}, you have {user.terrabucks ?? 0} TB available.
          </p>
          <CheckInButton user={user} userLocation={userLocation} setCheckInStatus={setCheckInStatus} />
          <PurchaseButton
            user={user}
            userLocation={userLocation}
            setCheckInStatus={setCheckInStatus}
            setUser={setUser}
            fetchOwnedTerracres={fetchOwnedTerracres}
            onPurchase={handlePurchase}
          />
          {checkInStatus && <p>{checkInStatus}</p>}
        </>
      )}
    </div>
  );
}

export default App;
