import React, { useState, useEffect, useCallback, useMemo, Suspense, useRef } from "react";
import { auth } from "./firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker, Polygon } from "@react-google-maps/api";
import Login from "./components/Login";
import CheckInButton from "./components/CheckInButton";
import PurchaseButton from "./components/PurchaseButton";
import SignOutButton from "./components/SignOutButton";
import UserButton from "./components/UserButton";
import UserPage from "./components/UserPage";
import "./App.css";

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us";
const TERRACRE_SIZE_METERS = 30;
const libraries = ["places"];

console.log("TerraMine v1.30c - Snapped grid purchase, reduced re-renders");

function App() {
  const isDevelopment = process.env.NODE_ENV === "development";

  const [user, setUser] = useState(isDevelopment ? { uid: "devUser", displayName: "Developer", terrabucks: 1000 } : null);
  const [userLocation, setUserLocation] = useState(isDevelopment ? defaultCenter : null);
  const [ownedTerracres, setOwnedTerracres] = useState([]);
  const [mapKey, setMapKey] = useState(Date.now());
  const [zoom, setZoom] = useState(18);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [showUserPage, setShowUserPage] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState("");
  const [apiLoaded, setApiLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [purchaseTrigger, setPurchaseTrigger] = useState(0);

  const mapRef = useRef(null);

  // GRID HELPERS
  const getGridIdFromLatLng = (lat, lng) => {
    const metersPerDegreeLat = 111000;
    const metersPerDegreeLng = metersPerDegreeLat * Math.cos((lat * Math.PI) / 180);
    const deltaLat = TERRACRE_SIZE_METERS / metersPerDegreeLat;
    const deltaLng = TERRACRE_SIZE_METERS / metersPerDegreeLng;
    const snappedLat = Math.floor(lat / deltaLat) * deltaLat + deltaLat / 2;
    const snappedLng = Math.floor(lng / deltaLng) * deltaLng + deltaLng / 2;
    return {
      lat: snappedLat,
      lng: snappedLng,
      id: `${snappedLat.toFixed(7)}-${snappedLng.toFixed(7)}`
    };
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

    const grid = [];
    for (let lat = sw.lat(); lat < ne.lat(); lat += deltaLat) {
      for (let lng = sw.lng(); lng < ne.lng(); lng += deltaLng) {
        const baseLat = Math.floor(lat / deltaLat) * deltaLat;
        const baseLng = Math.floor(lng / deltaLng) * deltaLng;
        const centerLat = baseLat + deltaLat / 2;
        const centerLng = baseLng + deltaLng / 2;

        grid.push({
          center: { lat: centerLat, lng: centerLng },
          paths: [
            { lat: baseLat, lng: baseLng },
            { lat: baseLat + deltaLat, lng: baseLng },
            { lat: baseLat + deltaLat, lng: baseLng + deltaLng },
            { lat: baseLat, lng: baseLng + deltaLng },
            { lat: baseLat, lng: baseLng }
          ]
        });
      }
    }

    return grid;
  }, []);

  const gridCells = useMemo(() => getGridLines(userLocation), [userLocation, mapKey]);

  const snappedUserGridCenter = useMemo(() => {
    if (!userLocation || !gridCells.length) return null;
    const match = gridCells.find(cell =>
      userLocation.lat >= cell.paths[0].lat &&
      userLocation.lat < cell.paths[1].lat &&
      userLocation.lng >= cell.paths[0].lng &&
      userLocation.lng < cell.paths[2].lng
    );
    return match?.center || getGridIdFromLatLng(userLocation.lat, userLocation.lng);
  }, [userLocation, gridCells]);

  // TERRACRE MARKERS
  const TerracreMarkers = useMemo(() =>
    ownedTerracres.map((t) => {
      const { lat, lng } = getGridIdFromLatLng(t.lat, t.lng);
      return (
        <Marker
          key={t.id}
          position={{ lat, lng }}
          icon={{
            path: "M -34,-34 L 34,-34 L 34,34 L -34,34 Z",
            scale: Math.max(1, Math.min(4, Math.pow(2, zoom - 18))),
            fillColor: t.ownerId === user?.uid ? "blue" : "green",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#fff"
          }}
        />
      );
    }), [ownedTerracres, zoom, user?.uid]);

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
    )), [gridCells]);

  // DATA FETCHING
  const fetchOwnedTerracres = useCallback(async () => {
    try {
      const snapshot = await getDocs(collection(db, "terracres"));
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOwnedTerracres(list);
    } catch (err) {
      console.error("❌ Error fetching terracres:", err);
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    if (!user) return;
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUser(prev => ({ ...prev, ...userData }));
      }
    } catch (err) {
      console.error("❌ Error fetching user data:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchOwnedTerracres();
      fetchUserData();
    }
  }, [user, purchaseTrigger]);

  useEffect(() => {
    if (!isDevelopment) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setError("Failed to get location.")
      );
    }
  }, [isDevelopment]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const earnings = ownedTerracres
        .filter(t => t.ownerId === user?.uid)
        .reduce((sum, t) => {
          const hours = (now - new Date(t.lastCollected)) / (1000 * 60 * 60);
          return sum + hours * (t.earningRate ?? 0);
        }, 0);
      setTotalEarnings(earnings);
    }, 30000);
    return () => clearInterval(interval);
  }, [ownedTerracres, user?.uid]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      window.location.reload();
    } catch (err) {
      setError("Sign out failed.");
    }
  };

  // MINE COUNTS
  const countMines = (type) =>
    ownedTerracres.filter(t => t.taType === type && t.ownerId === user?.uid).length;

  if (error) return <div>Error: {error}</div>;
  if (!user && !apiLoaded && !isDevelopment) return <Login onLoginSuccess={setUser} />;

  return (
    <div className="app-container">
      {user && (
        <>
          {!showUserPage && <UserButton onUser={() => setShowUserPage(true)} />}
          <SignOutButton onSignOut={handleSignOut} />
        </>
      )}
      {showUserPage ? (
        <UserPage
          user={user}
          onClose={() => setShowUserPage(false)}
          earnings={totalEarnings}
          rockMines={countMines("Rock Mine")}
          coalMines={countMines("Coal Mine")}
          goldMines={countMines("Gold Mine")}
          diamondMines={countMines("Diamond Mine")}
          checkInMessages={[]}
        />
      ) : (
        <>
          <header className="app-header">
            <h1>TerraMine</h1>
          </header>
          <div className="earnings">Earnings from Mining: ${totalEarnings.toFixed(2)}</div>
          <Suspense fallback={<p>Loading map...</p>}>
            <LoadScript
              googleMapsApiKey={GOOGLE_MAPS_API_KEY}
              libraries={libraries}
              onLoad={() => setApiLoaded(true)}
              onError={() => setError("Map load failed.")}
            >
              {apiLoaded && userLocation ? (
                <GoogleMap
                  key={mapKey}
                  mapContainerClassName="map-container"
                  center={userLocation}
                  zoom={zoom}
                  mapContainerStyle={{
                    width: "min(80vw, 500px)",
                    height: "min(80vw, 500px)",
                    aspectRatio: "1 / 1",
                    margin: "10px auto"
                  }}
                  onLoad={(map) => {
                    mapRef.current = map;
                    map.addListener("zoom_changed", () => {
                      setZoom(map.getZoom());
                      setMapKey(Date.now());
                    });
                  }}
                >
                  {GridPolygons}
                  {TerracreMarkers}
                  <Marker
                    position={userLocation}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 8,
                      fillColor: "#4285F4",
                      fillOpacity: 1,
                      strokeWeight: 2,
                      strokeColor: "#fff"
                    }}
                  />
                </GoogleMap>
              ) : (
                <p>{userLocation ? "Initializing map..." : "Getting your location..."}</p>
              )}
            </LoadScript>
          </Suspense>
          <div className="greeting">
            Welcome, {user?.displayName || "User"}! You have {user?.terrabucks ?? 0} TB.
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
    </div>
  );
}

export default App;
