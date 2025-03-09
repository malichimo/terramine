import React, { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
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
const GRID_SIZE = 1; // 3x3 grid (90m x 90m), centered on user

console.log("TerraMine v1.19 - 30m grid = Terracre, zoom 18 start");

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
    const scale = TERRACRE_SIZE_METERS / metersPerPixel / 20; // ~30m at zoom 18
    console.log("Scale calc - Lat:", lat, "Zoom:", zoom, "Meters/Pixel:", metersPerPixel, "Scale:", scale);
    return isNaN(scale) || scale <= 0 ? 1 : scale;
  };

  const getGridLines = (center) => {
    if (!center) return [];
    const { lat, lng } = center;
    const grid = [];
    const metersPerDegreeLat = 111000; // Approx meters per degree latitude
    const metersPerDegreeLng = metersPerDegreeLat * Math.cos((lat * Math.PI) / 180);
    const deltaLat = TERRACRE_SIZE_METERS / metersPerDegreeLat;
    const deltaLng = TERRACRE_SIZE_METERS / metersPerDegreeLng;

    for (let i = -GRID_SIZE; i <= GRID_SIZE; i++) {
      for (let j = -GRID_SIZE; j <= GRID_SIZE; j++) {
        const baseLat = Math.round(lat / deltaLat) * deltaLat + i * deltaLat;
        const baseLng = Math.round(lng / deltaLng) * deltaLng + j * deltaLng;
        const centerLat = baseLat + deltaLat / 2;
        const centerLng = baseLng + deltaLng / 2;
        grid.push({
          paths: [
            { lat: baseLat, lng: baseLng },
            { lat: baseLat + deltaLat, lng: baseLng },
            { lat: baseLat + deltaLat, lng: baseLng + deltaLng },
            { lat: baseLat, lng: baseLng + deltaLng },
            { lat: baseLat, lng: baseLng },
          ],
          center: { lat: centerLat, lng: centerLng },
        });
      }
    }
    console.log("Grid generated:", grid.length, "cells");
    return grid;
  };

  if (error) return <div>Error: {error}</div>;
  if (!user && !apiLoaded) return <Login onLoginSuccess={setUser} />;

  const gridCells = getGridLines(userLocation);

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
              onLoad={(map) => {
                mapRef.current = map;
                console.log("✅ GoogleMap rendered");
                map.addListener("zoom_changed", () => {
                  const newZoom = map.getZoom();
                  setZoom(newZoom);
                  setMapKey(Date.now());
                  console.log("Zoom changed:", newZoom);
                });
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
                const gridCell = gridCells.find(
                  (cell) =>
                    Math.abs(cell.center.lat - terracre.lat) < 0.0001 &&
                    Math.abs(cell.center.lng - terracre.lng) < 0.0001
                );
                const position = gridCell ? gridCell.center : { lat: terracre.lat, lng: terracre.lng };
                return (
                  <Marker
                    key={terracre.id}
                    position={position}
                    icon={{
                      path: "M -13,-13 L 13,-13 L 13,13 L -13,13 Z",
                      scale: getMarkerScale(position.lat),
                      fillColor: terracre.ownerId === user.uid ? "blue" : "green",
                      fillOpacity: 1,
                      strokeWeight: 2,
                      strokeColor: "#fff",
                    }}
                    title={`Terracre owned by ${terracre.ownerId === user.uid ? "you" : "someone else"}`}
                  />
                );
              })}
              {gridCells.map((cell, index) => (
                <Polygon
                  key={index}
                  paths={cell.paths}
                  options={{
                    fillColor: "transparent",
                    strokeColor: "#999",
                    strokeOpacity: 0.8,
                    strokeWeight: 1,
                  }}
                />
              ))}
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
            gridCenter={
              gridCells.find((cell) =>
                userLocation.lat >= cell.paths[0].lat &&
                userLocation.lat < cell.paths[1].lat &&
                userLocation.lng >= cell.paths[0].lng &&
                userLocation.lng < cell.paths[2].lng
              )?.center
            }
          />
          {checkInStatus && <p>{checkInStatus}</p>}
        </>
      )}
    </div>
  );
}

export default App;
