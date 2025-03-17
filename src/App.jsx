import React, { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut, getRedirectResult } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore";
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
const libraries = ["places"]; // Use "places" library for Google Maps

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

  // Fetch owned terracres
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

  // Function to fetch user data
  const fetchUserData = useCallback(async (uid) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUser((prevUser) => ({ ...prevUser, ...userData }));
      }
    } catch (error) {
      console.error("🔥 User data fetch error:", error);
    }
  }, []);

  // Effect to fetch user data on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchUserData(user.uid);
    }
  }, [user, fetchUserData]);

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
    fetchUserData(user.uid); // Refresh user data
    setPurchaseTrigger((prev) => prev + 1);
  };

  // Function to generate grid lines
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

  // Function to snap user location to grid center
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

  // Effect to get user location
  useEffect(() => {
    if (!isDevelopment) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          console.log("✅ Location Retrieved:", position.coords);
        },
        (error) => {
          console.error("❌ Error getting location:", error);
          setError("Failed to get location.");
        }
      );
    }
  }, [isDevelopment]);

  // Function to get marker scale based on zoom level
  function getMarkerScale(zoom) {
    // Example scale calculation based on zoom level
    const scale = Math.pow(2, zoom - 18);
    return Math.max(1, Math.min(4, scale)); // Ensure scale is between 1 and 4
  }

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
              mapContainerClassName="map-container"
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
                      path: "M -45,-45 L 45,-45 L 45,45 L -45,45 Z", // Adjusted size
                      scale: getMarkerScale(zoom),
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
