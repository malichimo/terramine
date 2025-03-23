import React, { useState, useEffect, useCallback, useMemo, Suspense, useRef } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut, getRedirectResult } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker, Polygon } from "@react-google-maps/api";
import Login from "./components/Login";
import CheckInButton from "./components/CheckInButton";
import PurchaseButton from "./components/PurchaseButton";
import SignOutButton from './components/SignOutButton';
import UserButton from './components/UserButton';
import UserPage from './components/UserPage';
import "./App.css";

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us";
const TERRACRE_SIZE_METERS = 30;
const libraries = ["places"];

console.log("TerraMine v1.30b - 30m grid, popup auth with URL logging, TA snaps to exact user cell");

function App() {
  const isDevelopment = process.env.NODE_ENV === 'development';

  const [user, setUser] = useState(isDevelopment ? { uid: "devUser", displayName: "Developer", terrabucks: 1000 } : null);
  const [userLocation, setUserLocation] = useState(isDevelopment ? defaultCenter : null);
  const [ownedTerracres, setOwnedTerracres] = useState([]);
  const [checkInStatus, setCheckInStatus] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [purchaseTrigger, setPurchaseTrigger] = useState(0);
  const [mapKey, setMapKey] = useState(Date.now());
  const [zoom, setZoom] = useState(18);
  const [purchasedThisSession, setPurchasedThisSession] = useState(null);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [showUserPage, setShowUserPage] = useState(false);

  const mapRef = useRef(null);
  const fetchTerracresRef = useRef(false);

  const calculateTotalEarnings = useCallback(() => {
    const now = new Date();
    const earnings = ownedTerracres
      .filter(terracre => terracre.ownerId === user?.uid)
      .reduce((acc, terracre) => {
        const lastCollected = new Date(terracre.lastCollected);
        const hoursElapsed = (now - lastCollected) / (1000 * 60 * 60);
        return acc + (hoursElapsed * terracre.earningRate);
      }, 0);
    setTotalEarnings(earnings);
  }, [ownedTerracres, user?.uid]);

  useEffect(() => {
    const interval = setInterval(() => {
      calculateTotalEarnings();
    }, 30000);

    return () => clearInterval(interval);
  }, [calculateTotalEarnings]);

  const fetchOwnedTerracres = useCallback(async () => {
    if (!user || fetchTerracresRef.current) return;
    fetchTerracresRef.current = true;
    try {
      console.log("📡 Fetching Terracres for user:", user.uid);
      const terracresRef = collection(db, "terracres");
      const querySnapshot = await getDocs(terracresRef);
      const properties = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((t) => t.lat && t.lng && typeof t.lat === "number" && typeof t.lng === "number");
      console.log("✅ Terracres fetched with data:", properties);
      setOwnedTerracres(properties);
    } catch (error) {
      console.error("🔥 Terracres fetch error:", error);
      setOwnedTerracres([]);
    } finally {
      fetchTerracresRef.current = false;
    }
  }, [user]);

  function debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  const debouncedFetchOwnedTerracres = useCallback(
    debounce(fetchOwnedTerracres, 500),
    [fetchOwnedTerracres]
  );

  useEffect(() => {
    if (user) debouncedFetchOwnedTerracres();
  }, [debouncedFetchOwnedTerracres, purchaseTrigger, user]);

  const fetchUserData = useCallback(async (uid) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUser((prevUser) => {
          if (
            prevUser.terrabucks === userData.terrabucks &&
            prevUser.displayName === userData.displayName
          ) {
            return prevUser;
          }
          return { ...prevUser, ...userData };
        });
      }
    } catch (error) {
      console.error("🔥 User data fetch error:", error);
    }
  }, []);

  const debouncedFetchUserData = useCallback(debounce(fetchUserData, 500), [fetchUserData]);

  useEffect(() => {
    if (user) {
      debouncedFetchUserData(user.uid);
    }
  }, [user?.uid, debouncedFetchUserData]);

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

    if (terracreSnap.exists()) {
      console.log(`⚠️ Terracre ${terracreId} already owned, skipping.`);
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();
    const terrabucks = userData.terrabucks ?? 0;

    const TERRACRE_COST = 100;

    if (terrabucks < TERRACRE_COST) {
      console.log("❌ Not enough TerraBucks to purchase Terracre.");
      setError("Not enough TerraBucks to purchase Terracre.");
      return;
    }

    const newTerracre = {
      id: terracreId,
      lat: gridCenter.lat,
      lng: gridCenter.lng,
      ownerId: user.uid,
      purchasedAt: new Date().toISOString(),
      lastCollected: new Date().toISOString(),
      earningRate: 0.05,
      taType: "Rock Mine" // Example type, replace with actual logic
    };

    console.log(`✅ Purchasing new Terracre: ${terracreId}`);
    await setDoc(terracreRef, newTerracre);

    await updateDoc(userRef, {
      terrabucks: terrabucks - TERRACRE_COST,
    });

    setPurchaseTrigger((prev) => prev + 1);
  };

  const getGridLines = useCallback((center) => {
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
  }, []);

  const snapToGridCenter = useCallback((lat, lng, gridCells) => {
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
  }, []);

  const gridCells = useMemo(() => getGridLines(userLocation), [userLocation, mapRef.current]);
  const snappedUserGridCenter = useMemo(() => {
    if (!userLocation || !gridCells.length) return null;
    return snapToGridCenter(userLocation.lat, userLocation.lng, gridCells);
  }, [userLocation, gridCells]);

  const GridPolygons = useMemo(() =>
    gridCells.map((cell, index) => (
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
    )),
    [gridCells]
  );

  const TerracreMarkers = useMemo(() =>
    ownedTerracres.map((terracre) => {
      const snappedPosition = snapToGridCenter(terracre.lat, terracre.lng, gridCells);
      return (
        <Marker
          key={terracre.id}
          position={snappedPosition}
          icon={{
            path: "M -34,-34 L 34,-34 L 34,34 L -34,34 Z",
            scale: getMarkerScale(zoom),
            fillColor: terracre.ownerId === user.uid ? "blue" : "green",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#fff",
          }}
          title={`Terracre owned by ${terracre.ownerId === user.uid ? "you" : "someone else"}`}
        />
      );
    }),
    [ownedTerracres, zoom, user?.uid, gridCells, snapToGridCenter]
  );

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

  function getMarkerScale(zoom) {
    const scale = Math.pow(2, zoom - 18);
    return Math.max(1, Math.min(4, scale));
  }

  const handleUserPage = () => {
    setShowUserPage(!showUserPage);
  };

  // ✅ Fixed logic (counts only mines owned by the current user)
 // 🗺️ Optional: typeMap for consistent handling or future use
const typeMap = {
  'Rock Mine': 'rock',
  'Coal Mine': 'coal',
  'Gold Mine': 'gold',
  'Diamond Mine': 'diamond',
};

// 🧮 Corrected counts based on taType and ownership
const rockMines = ownedTerracres.filter(
  (terracre) => terracre.taType === 'Rock Mine' && terracre.ownerId === user?.uid
).length;

const coalMines = ownedTerracres.filter(
  (terracre) => terracre.taType === 'Coal Mine' && terracre.ownerId === user?.uid
).length;

const goldMines = ownedTerracres.filter(
  (terracre) => terracre.taType === 'Gold Mine' && terracre.ownerId === user?.uid
).length;

const diamondMines = ownedTerracres.filter(
  (terracre) => terracre.taType === 'Diamond Mine' && terracre.ownerId === user?.uid
).length;



  if (error) return <div>Error: {error}</div>;
  if (!user && !apiLoaded && !isDevelopment) return <Login onLoginSuccess={setUser} />;

  return (
    <div className="app-container">
      {user && (
        <>
          {!showUserPage && <UserButton onUser={handleUserPage} />}
          <SignOutButton onSignOut={handleSignOut} />
        </>
      )}
      {showUserPage ? (
        <UserPage user={user} onClose={() => setShowUserPage(false)} earnings={totalEarnings} rockMines={rockMines} coalMines={coalMines} goldMines={goldMines} diamondMines={diamondMines} checkInMessages={[]} />
      ) : (
        <>
          <header className="app-header">
            <h1>TerraMine</h1>
          </header>
          <div className="earnings">Earnings from Mining: ${totalEarnings.toFixed(2)}</div>
          <Suspense fallback={<p>Loading map resources...</p>}>
            <LoadScript
              googleMapsApiKey={GOOGLE_MAPS_API_KEY}
              libraries={libraries}
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
                  mapContainerStyle={{
                    width: 'min(80vw, 500px)',
                    aspectRatio: '1 / 1',
                    height: 'min(80vw, 500px)',
                    margin: '10px auto',
                    display: 'block',
                    position: 'relative',
                  }}
                  onLoad={(map) => {
                    mapRef.current = map;
                    console.log("✅ GoogleMap rendered");
                    let zoomTimeout;
                    map.addListener("zoom_changed", () => {
                      clearTimeout(zoomTimeout);
                      zoomTimeout = setTimeout(() => {
                        const newZoom = map.getZoom();
                        setZoom(newZoom);
                        setMapKey(Date.now());
                        console.log("Zoom changed:", newZoom);
                      }, 300); // Delay to prevent rapid firing
                    });
                  }}
                  onBoundsChanged={() => {
                    if (mapRef.current) {
                      const center = mapRef.current.getCenter();
                      setUserLocation({ lat: center.lat(), lng: center.lng() });
                    }
                  }}
                >
                  {GridPolygons}
                  {TerracreMarkers}
                  {userLocation && (
                    <Marker
                      position={userLocation}
                      icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: "#4285F4", // Google's blue
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: "#ffffff",
                      }}
                      title="You"
                    />
                  )}
                </GoogleMap>
              ) : (
                <p>{userLocation ? "Initializing map..." : "Getting your location..."}</p>
              )}
            </LoadScript>
          </Suspense>
          {user && (
            <>
              <div className="greeting">
                Welcome, {user.displayName || "User"}! You have {user.terrabucks ?? 0} TB available.
              </div>
              <div className="button-container">
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
              </div>
              {checkInStatus && <p>{checkInStatus}</p>}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
