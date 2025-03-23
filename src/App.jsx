import React, { useState, useEffect, useCallback, useMemo, Suspense, useRef } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
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
  const fetchTerracresRef = useRef(false);

  // ---- Snapping and Grid Helpers ----
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

  const snapToGridCenter = useCallback((lat, lng, gridCells) => {
    const cell = gridCells?.find(cell =>
      lat >= cell.paths[0].lat && lat < cell.paths[1].lat &&
      lng >= cell.paths[0].lng && lng < cell.paths[2].lng
    );
    return cell?.center ?? getGridIdFromLatLng(lat, lng);
  }, []);

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
      const { lat, lng } = getGridIdFromLatLng(terracre.lat, terracre.lng);
      return (
        <Marker
          key={terracre.id}
          position={{ lat, lng }}
          icon={{
            path: "M -34,-34 L 34,-34 L 34,34 L -34,34 Z",
            scale: Math.max(1, Math.min(4, Math.pow(2, zoom - 18))),
            fillColor: terracre.ownerId === user.uid ? "blue" : "green",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#fff",
          }}
          title={`Terracre owned by ${terracre.ownerId === user.uid ? "you" : "someone else"}`}
        />
      );
    }),
    [ownedTerracres, zoom, user?.uid]
  );

  const handlePurchase = async (gridCenter) => {
    if (!user || !gridCenter) return;
    const snapped = getGridIdFromLatLng(gridCenter.lat, gridCenter.lng);
    const terracreId = snapped.id;
    const terracresRef = collection(db, "terracres");
    const terracreRef = doc(terracresRef, terracreId);
    const terracreSnap = await getDoc(terracreRef);

    if (terracreSnap.exists()) {
      console.log(`⚠️ Terracre ${terracreId} already owned`);
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();
    const terrabucks = userData.terrabucks ?? 0;
    const TERRACRE_COST = 100;

    if (terrabucks < TERRACRE_COST) {
      setError("Not enough TerraBucks to purchase.");
      return;
    }

    const newTerracre = {
      id: terracreId,
      lat: snapped.lat,
      lng: snapped.lng,
      ownerId: user.uid,
      purchasedAt: new Date().toISOString(),
      lastCollected: new Date().toISOString(),
      earningRate: 0.05,
      taType: "Rock Mine"
    };

    await setDoc(terracreRef, newTerracre);
    await updateDoc(userRef, { terrabucks: terrabucks - TERRACRE_COST });
    setPurchaseTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    if (!isDevelopment) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => setError("Failed to get location.")
      );
    }
  }, [isDevelopment]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const earnings = ownedTerracres
        .filter(t => t.ownerId === user?.uid)
        .reduce((acc, t) => {
          const hours = (now - new Date(t.lastCollected)) / (1000 * 60 * 60);
          return acc + hours * (t.earningRate ?? 0);
        }, 0);
      setTotalEarnings(earnings);
    }, 30000);
    return () => clearInterval(interval);
  }, [ownedTerracres, user?.uid]);

  // -- Type counts --
  const countMines = (type) =>
    ownedTerracres.filter((t) => t.taType === type && t.ownerId === user?.uid).length;
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
          <Suspense fallback={<p>Loading map resources...</p>}>
            <LoadScript
              googleMapsApiKey={GOOGLE_MAPS_API_KEY}
              libraries={libraries}
              onLoad={() => setApiLoaded(true)}
              onError={(e) => setError("Failed to load map.")}
            >
              {apiLoaded && userLocation ? (
                <GoogleMap
                  key={mapKey}
                  mapContainerClassName="map-container"
                  center={userLocation || defaultCenter}
                  zoom={zoom}
                  mapContainerStyle={{
                    width: "min(80vw, 500px)",
                    height: "min(80vw, 500px)",
                    aspectRatio: "1 / 1",
                    margin: "10px auto",
                  }}
                  onLoad={(map) => {
                    mapRef.current = map;
                    map.addListener("zoom_changed", () => {
                      const newZoom = map.getZoom();
                      setZoom(newZoom);
                      setMapKey(Date.now());
                    });
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
                        fillColor: "#4285F4",
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: "#fff",
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
          <div className="greeting">
            Welcome, {user?.displayName || "User"}! You have {user?.terrabucks ?? 0} TB available.
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
