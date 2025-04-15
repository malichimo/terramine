import React, { useState, useEffect, useCallback, useMemo, Suspense, useRef } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker, Polygon } from "@react-google-maps/api";
import Login from "./components/Login";
import CheckInButton from "./components/CheckInButton";
import PurchaseButton from "./components/PurchaseButton";
import SignOutButton from "./components/SignOutButton";
import UserButton from "./components/UserButton";
import UserPage from "./components/UserPage";
import CheckInGallery from "./components/CheckInGallery"; // Added gallery component import
import "./App.css";

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us";
const TERRACRE_SIZE_METERS = 30;
const libraries = ["places"];

console.log("🌍 TerraMine v1.30b - Stable full version loaded");

function App() {
  const isDevelopment = process.env.NODE_ENV === "development";

  const [user, setUser] = useState(isDevelopment ? { uid: "devUser", displayName: "Developer", terrabucks: 1000 } : null);
  const [userLocation, setUserLocation] = useState(isDevelopment ? defaultCenter : null);
  const [ownedTerracres, setOwnedTerracres] = useState([]);
  const [checkInStatus, setCheckInStatus] = useState("");
  const [checkInMessages, setCheckInMessages] = useState([]);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [purchaseTrigger, setPurchaseTrigger] = useState(0);
  const [mapKey, setMapKey] = useState(Date.now());
  const [zoom, setZoom] = useState(18);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [showUserPage, setShowUserPage] = useState(false);
  const [showGallery, setShowGallery] = useState(false); // New state for gallery view

  const mapRef = useRef(null);
  const fetchTerracresRef = useRef(false);

  const TA_PROBABILITIES = [
    { type: "Rock Mine", rate: 0.05, chance: 0.5 },
    { type: "Coal Mine", rate: 0.1, chance: 0.3 },
    { type: "Gold Mine", rate: 0.2, chance: 0.15 },
    { type: "Diamond Mine", rate: 0.5, chance: 0.05 },
  ];

  const getRandomTaType = () => {
    const rand = Math.random();
    let sum = 0;
    for (const ta of TA_PROBABILITIES) {
      sum += ta.chance;
      if (rand <= sum) return ta;
    }
    return TA_PROBABILITIES[0];
  };

  const handlePurchase = async (gridCenter) => {
    console.log("🛒 handlePurchase called with:", { user, gridCenter });
  
    if (!user || !gridCenter) {
      return { message: "User or location not available." };
    }
    const terracreId = `${gridCenter.lat.toFixed(7)}-${gridCenter.lng.toFixed(7)}`;
    const terracreRef = doc(db, "terracres", terracreId);
    const terracreSnap = await getDoc(terracreRef);
    if (terracreSnap.exists()) return { message: "You cannot purchase this property. It is already owned." };

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();
    const terrabucks = userData.terrabucks ?? 0;
    const TERRACRE_COST = 100;
    if (terrabucks < TERRACRE_COST) return { message: "Not enough TerraBucks to purchase." };

    const chosenType = getRandomTaType();
    const newTerracre = {
      id: terracreId,
      lat: gridCenter.lat,
      lng: gridCenter.lng,
      ownerId: user.uid,
      purchasedAt: new Date().toISOString(),
      lastCollected: new Date().toISOString(),
      earningRate: chosenType.rate,
      taType: chosenType.type,
    };

    await setDoc(terracreRef, newTerracre);
    await updateDoc(userRef, { terrabucks: terrabucks - TERRACRE_COST });
    setPurchaseTrigger((prev) => prev + 1);
    return { message: `✅ You purchased a ${chosenType.type}!` };
  };

  const calculateTotalEarnings = useCallback(() => {
    const now = new Date();
    const earnings = ownedTerracres
      .filter(t => t.ownerId === user?.uid)
      .reduce((acc, t) => {
        const hours = (now - new Date(t.lastCollected)) / (1000 * 60 * 60);
        return acc + hours * (t.earningRate ?? 0);
      }, 0);
    setTotalEarnings(earnings);
  }, [ownedTerracres, user?.uid]);

  useEffect(() => {
    const interval = setInterval(() => calculateTotalEarnings(), 30000);
    return () => clearInterval(interval);
  }, [calculateTotalEarnings]);

  const fetchOwnedTerracres = useCallback(async () => {
    if (!user || fetchTerracresRef.current) return;
    fetchTerracresRef.current = true;
    try {
      const querySnapshot = await getDocs(collection(db, "terracres"));
      const all = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const owned = all.filter(t => t.lat && t.lng);
      setOwnedTerracres(owned);
      const checkInsSnapshot = await getDocs(collection(db, "checkins"));
      const messages = [];
      for (const docSnap of checkInsSnapshot.docs) {
        const data = docSnap.data();
        if (owned.some(t => t.id === data.terracreId && t.ownerId === user.uid) && data.message) {
          const visitorRef = doc(db, "users", data.userId);
          const visitorSnap = await getDoc(visitorRef);
          const visitorName = visitorSnap.exists() ? visitorSnap.data().name : "Unknown visitor";
          messages.push(`${visitorName}: ${data.message}`);
        }
      }
      setCheckInMessages(messages);
    } catch (err) {
      console.error("🔥 Error fetching terracres or check-ins:", err);
      setOwnedTerracres([]);
      setCheckInMessages([]);
    } finally {
      fetchTerracresRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchOwnedTerracres();
  }, [user, purchaseTrigger, fetchOwnedTerracres]);

  const fetchUserData = useCallback(async (uid) => {
    const userSnap = await getDoc(doc(db, "users", uid));
    if (userSnap.exists()) {
      const data = userSnap.data();
      setUser(prev => ({ ...prev, ...data }));
    }
  }, []);

  useEffect(() => {
    if (user) fetchUserData(user.uid);
  }, [user?.uid, fetchUserData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({ uid: firebaseUser.uid, displayName: firebaseUser.displayName });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const getGridLines = useCallback((center) => {
    if (!center || !mapRef.current) return [];
    const bounds = mapRef.current.getBounds();
    if (!bounds) return [];
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const metersPerDegreeLat = 111000;
    const metersPerDegreeLng = metersPerDegreeLat * Math.cos(center.lat * Math.PI / 180);
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

  const snapToGridCenter = useCallback((lat, lng, gridCells) => {
    if (!gridCells.length) return { lat, lng };
    return gridCells.find(cell =>
      lat >= cell.paths[0].lat && lat < cell.paths[1].lat &&
      lng >= cell.paths[0].lng && lng < cell.paths[2].lng
    )?.center || { lat, lng };
  }, []);

  const gridCells = useMemo(() => (mapLoaded ? getGridLines(userLocation) : []), [userLocation, mapLoaded]);
  const snappedUserGridCenter = useMemo(() => {
    if (!userLocation || !gridCells.length) return null;
    return snapToGridCenter(userLocation.lat, userLocation.lng, gridCells);
  }, [userLocation, gridCells]);

  const TerracreMarkers = useMemo(() => ownedTerracres.map(t => (
    <Marker
      key={t.id}
      position={snapToGridCenter(t.lat, t.lng, gridCells)}
      icon={{
        path: "M -34,-34 L 34,-34 L 34,34 L -34,34 Z",
        scale: Math.max(1, Math.min(4, Math.pow(2, zoom - 18))),
        fillColor: t.ownerId === user?.uid ? "blue" : "green",
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#fff",
      }}
    />
  )), [ownedTerracres, zoom, gridCells, snapToGridCenter, user?.uid]);

  useEffect(() => {
    if (!isDevelopment) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setError("Failed to get location.")
      );
    }
  }, [isDevelopment]);

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    window.location.reload();
  };

  if (error) return <div>Error: {error}</div>;
  if ((!user && !isDevelopment) || !userLocation) {
    return <Login onLoginSuccess={setUser} />;
  }

  return (
    <div className="app-container">
      {user && (
        <>
          {!showUserPage && <UserButton onUser={() => setShowUserPage(true)} />}
          <SignOutButton onSignOut={handleSignOut} />
          <button onClick={() => setShowGallery(true)}>📸 View Check-In Gallery</button>
        </>
      )}
      {showUserPage ? (
        <UserPage
          user={user}
          onClose={() => setShowUserPage(false)}
          earnings={totalEarnings}
          rockMines={ownedTerracres.filter(t => t.taType === "Rock Mine" && t.ownerId === user?.uid).length}
          coalMines={ownedTerracres.filter(t => t.taType === "Coal Mine" && t.ownerId === user?.uid).length}
          goldMines={ownedTerracres.filter(t => t.taType === "Gold Mine" && t.ownerId === user?.uid).length}
          diamondMines={ownedTerracres.filter(t => t.taType === "Diamond Mine" && t.ownerId === user?.uid).length}
          checkInMessages={checkInMessages}
        />
      ) : showGallery ? (
        <CheckInGallery messages={checkInMessages} onClose={() => setShowGallery(false)} />
      ) : (
        <>
          <header className="app-header"><h1>TerraMine</h1></header>
          <div className="earnings">Earnings from Mining: ${totalEarnings.toFixed(2)}</div>
          <Suspense fallback={<p>Loading map...</p>}>
            <LoadScript
              googleMapsApiKey={GOOGLE_MAPS_API_KEY}
              libraries={libraries}
              onLoad={() => {
                setApiLoaded(true);
                setMapLoaded(true);
              }}
            >
              {apiLoaded && userLocation && (
                <GoogleMap
                  key={mapKey}
                  mapContainerClassName="map-container"
                  center={userLocation}
                  zoom={zoom}
                  onLoad={(map) => {
                    mapRef.current = map;
                    map.addListener("zoom_changed", () => {
                      const z = map.getZoom();
                      setZoom(z);
                      setMapKey(Date.now());
                    });
                  }}
                  onBoundsChanged={() => {
                    if (mapRef.current) {
                      const c = mapRef.current.getCenter();
                      setUserLocation({ lat: c.lat(), lng: c.lng() });
                    }
                  }}
                  mapContainerStyle={{
                    width: "min(80vw, 500px)",
                    height: "min(80vw, 500px)",
                    aspectRatio: "1 / 1",
                    margin: "10px auto"
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
                  {TerracreMarkers}
                  {userLocation && (
                    <Marker
                      position={userLocation}
                      icon={{
                        path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
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
              )}
            </LoadScript>
          </Suspense>

          <div className="greeting">Welcome, {user.displayName || "User"}! You have {user.terrabucks ?? 0} TB.</div>
          <div className="button-container">
            <CheckInButton user={user} userLocation={userLocation} setCheckInStatus={setCheckInStatus} setUser={setUser} />
            <PurchaseButton user={user} userLocation={userLocation} setUser={setUser} onPurchase={handlePurchase} gridCenter={snappedUserGridCenter} />
          </div>
          {checkInStatus && <p>{checkInStatus}</p>}
        </>
      )}
    </div>
  );
}

export default App;
