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
const libraries = ["marker"]; // Static libraries to fix LoadScript warning

console.log("TerraMine v1.30b - 30m grid, popup auth with URL logging, TA snaps to exact user cell");

function App() {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // State variables for user, location, map, and other app states
  const [user, setUser] = useState(isDevelopment ? { uid: "devUser", displayName: "Developer", terrabucks: 1000 } : null);
  const [userLocation, setUserLocation] = useState(isDevelopment ? defaultCenter : null);
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
  const [totalEarnings, setTotalEarnings] = useState(0);

  const mapRef = useRef(null);

  // Function to calculate total earnings
  const calculateTotalEarnings = useCallback(() => {
    const now = new Date();
    const earnings = ownedTerracres.reduce((acc, terracre) => {
      const lastCollected = new Date(terracre.lastCollected);
      const hoursElapsed = (now - lastCollected) / (1000 * 60 * 60);
      return acc + (hoursElapsed * terracre.earningRate);
    }, 0);
    setTotalEarnings(earnings);
  }, [ownedTerracres]);

  // Effect to update earnings every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      calculateTotalEarnings();
    }, 30000);

    return () => clearInterval(interval);
  }, [calculateTotalEarnings]);

  // Effect to handle authentication state changes and redirect results
  useEffect(() => {
    if (isDevelopment) return; // Skip auth handling in development mode

    console.log("Auth Listener Initialized ✅");
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          console.log("✅ Redirect Sign-In Successful:", result.user.uid, result.user.email);
          setUser(result.user);
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

      if (currentUser && !user) {
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
        setOwnedTerracres([]); // Clear ownedTerracres on sign-out
        setMapKey(Date.now());
      }
    });

    return () => {
      setIsMounted(false);
      unsubscribe();
    };
  }, [isDevelopment, isMounted, user]);

  // Effect to fetch user location
  useEffect(() => {
    if (!user || isDevelopment) return;
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
  }, [user, isDevelopment, isMounted]);

  // Function to fetch owned terracres from Firestore
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
        console.log("✅ Terracres fetched with data:", properties); // Log full data for debugging
        setOwnedTerracres(properties);
      }
    } catch (error) {
      console.error("🔥 Terracres fetch error:", error);
      setOwnedTerracres([]);
    }
  }, [user, isMounted]);

  // Effect to fetch owned terracres when user or purchaseTrigger changes
  useEffect(() => {
    if (user) fetchOwnedTerracres();
  }, [fetchOwnedTerracres, purchaseTrigger, user]);

  // Function to handle user sign-out
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

  const handlePurchase = async (gridCenter) => {
    if (!user || !gridCenter) return;

    const terracresRef = collection(db, "terracres");

    console.log("🔹 Attempting to purchase Terracre at:", gridCenter);

    const terracreId = `${gridCenter.lat.toFixed(7)}-${gridCenter.lng.toFixed(7)}`;
    const terracreRef = doc(terracresRef, terracreId);
    const terracreSnap = await getDoc(terracreRef);

    // Check if the terracre is already owned
    if (terracreSnap.exists()) {
      console.log(`⚠️ Terracre ${terracreId} already owned, skipping.`);
      return;
    }

    // Check if the user has enough TerraBucks
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();
    const terrabucks = userData.terrabucks ?? 0;

    const TERRACRE_COST = 100; // Define the cost of one TerraAcre

    if (terrabucks < TERRACRE_COST) {
      console.log("❌ Not enough TerraBucks to purchase Terracre.");
      setError("Not enough TerraBucks to purchase Terracre.");
      return;
    }

    // If not owned and user has enough TerraBucks, purchase it
    const newTerracre = {
      id: terracreId,
      lat: gridCenter.lat,
      lng: gridCenter.lng,
      ownerId: user.uid,
      purchasedAt: new Date().toISOString(),
      lastCollected: new Date().toISOString(),
      earningRate: 0.05, // Example earning rate, replace with actual logic
    };

    console.log(`✅ Purchasing new Terracre: ${terracreId}`);
    await setDoc(terracreRef, newTerracre);

    // Deduct the cost from the user's TerraBucks
    await updateDoc(userRef, {
      terrabucks: terrabucks - TERRACRE_COST,
    });

    fetchOwnedTerracres(); // Refresh owned properties
    setPurchaseTrigger((prev) => prev + 1);
  };

  // Function to calculate marker scale based on latitude and zoom level
  const getMarkerScale = (lat) => {
    const metersPerPixel = 156543.03392 * Math.cos((lat * Math.PI) / 180) / Math.pow(2, zoom);
    const scale = TERRACRE_SIZE_METERS / metersPerPixel / 35;
    console.log("Scale calc - Lat:", lat, "Zoom:", zoom, "Meters/Pixel:", metersPerPixel, "Scale:", scale);
    return isNaN(scale) || scale <= 0 ? 0.1 : scale;
  };

  // Function to generate grid lines for the map
  const getGridLines = (center) => {
    if (!center || !mapRef.current) return [];
    const bounds = mapRef.current.getBounds();
    if (!bounds) return [];
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const metersPerDegreeLat = 111000;
    const metersPerDegreeLng = metersPerDegreeLat * Math.cos((center.lat * Math.PI) / 180);
    const deltaLat = TERRACRE_SIZE_METERS / metersPerDegreeLat;
    const deltaLng = TERRACRE_SIZE_METERS / metersPerDegreeLng;

    const minLat = Math.floor(sw.lat() / deltaLat) * deltaLat;
    const maxLat = Math.ceil(ne.lat() / deltaLat) * deltaLat;
    const minLng = Math.floor(sw.lng() / deltaLng) * deltaLng;
    const maxLng = Math.ceil(ne.lng() / deltaLng) * deltaLng;

    const grid = [];
    for (let lat = minLat; lat < maxLat; lat += deltaLat) {
      for (let lng = minLng; lng < maxLng; lng += deltaLng) {
        const baseLat = lat;
        const baseLng = lng;
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

  // Function to snap user location to the center of the nearest grid cell
  const snapToGridCenter = (lat, lng, gridCells) => {
    if (!gridCells || !gridCells.length) return { lat, lng };
    const metersPerDegreeLat = 111000;
    const metersPerDegreeLng = metersPerDegreeLat * Math.cos((lat * Math.PI) / 180);
    const deltaLat = TERRACRE_SIZE_METERS / metersPerDegreeLat;
    const deltaLng = TERRACRE_SIZE_METERS / metersPerDegreeLng;
    const baseLat = Math.floor(lat / deltaLat) * deltaLat;
    const baseLng = Math.floor(lng / deltaLng) * deltaLng;
    const userCell = gridCells.find(
      (cell) =>
        lat >= cell.paths[0].lat && lat < cell.paths[1].lat && lng >= cell.paths[0].lng && lng < cell.paths[2].lng
    );
    const center = userCell ? userCell.center : { lat: baseLat + deltaLat / 2, lng: baseLng + deltaLng / 2 };
    console.log("Snapped - User:", { lat, lng }, "Cell:", center);
    return center;
  };

  // Render error message if any error occurs
  if (error) return <div>Error: {error}</div>;
  // Render login component if user is not authenticated and not in development mode
  if (!user && !apiLoaded && !isDevelopment) return <Login onLoginSuccess={setUser} />;

  // Generate grid cells and snap user location to grid center
  const gridCells = getGridLines(userLocation);
  const snappedUserGridCenter = userLocation ? snapToGridCenter(userLocation.lat, userLocation.lng, gridCells) : null;
  const terracreId = snappedUserGridCenter ? `${snappedUserGridCenter.lat.toFixed(7)}-${snappedUserGridCenter.lng.toFixed(7)}` : null;

  return (
    <div className="app-container">
      {user && (
        <div className="signout-container">
          <button className="signout-button" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      )}
      <header className="app-header">
        <h1>TerraMine</h1>
      </header>
      <p className="earnings">Earnings from Mining: ${totalEarnings.toFixed(2)}</p>
      <Suspense fallback={<p>Loading map resources...</p>}>
        <LoadScript
          googleMapsApiKey={GOOGLE_MAPS_API_KEY}
          libraries={libraries} // Use static libraries
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
              {ownedTerracres.map((terracre) => {
                const snappedPosition = snapToGridCenter(terracre.lat, terracre.lng, gridCells);
                return (
                  <Marker
                    key={terracre.id}
                    position={snappedPosition}
                    icon={{
                      path: "M -15,-15 L 15,-15 L 15,15 L -15,15 Z",
                      scale: getMarkerScale(snappedPosition.lat),
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
          <CheckInButton
            user={user}
            userLocation={userLocation}
            setCheckInStatus={setCheckInStatus}
            setUser={setUser}
          />
          <PurchaseButton
            user={user}
            userLocation={userLocation}
            setCheckInStatus={setCheckInStatus}
            setUser={setUser}
            fetchOwnedTerracres={fetchOwnedTerracres}
            onPurchase={handlePurchase}
            gridCenter={snappedUserGridCenter}
          />
          {checkInStatus && <p>{checkInStatus}</p>}
        </>
      )}
    </div>
  );
}

export default App;
