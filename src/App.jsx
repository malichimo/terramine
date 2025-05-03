import React, { useState, useEffect, useCallback, useMemo, Suspense, useRef } from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, onSnapshot } from "firebase/firestore";
import Login from "./components/Login";
import CheckInButton from "./components/CheckInButton";
import PurchaseButton from "./components/PurchaseButton";
import SignOutButton from "./components/SignOutButton";
import UserButton from "./components/UserButton";
import UserPage from "./components/UserPage";
import UserProfile from "./components/UserProfile";
import CheckInGallery from "./components/CheckInGallery";
import TAProfile from "./components/TAProfile";
import ErrorBoundary from "./components/ErrorBoundary";
import "./App.css";

// Dynamically import Google Maps components
const GoogleMap = React.lazy(() => import("@react-google-maps/api").then((module) => ({ default: module.GoogleMap })));
const Marker = React.lazy(() => import("@react-google-maps/api").then((module) => ({ default: module.Marker })));
const Polygon = React.lazy(() => import("@react-google-maps/api").then((module) => ({ default: module.Polygon })));

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us";
const TERRACRE_SIZE_METERS = 30;
const libraries = ["places"];
const COORDINATE_PRECISION = 4;

console.log("🌍 TerraMine v1.43b - Updated @react-google-maps/api and added dynamic import for GoogleMap");

function App() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [ownedTerracres, setOwnedTerracres] = useState([]);
  const [checkInStatus, setCheckInStatus] = useState("");
  const [checkInMessages, setCheckInMessages] = useState([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [purchaseTrigger, setPurchaseTrigger] = useState(0);
  const [zoom, setZoom] = useState(18);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [showUserPage, setShowUserPage] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [isDomReady, setIsDomReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [mapLoadError, setMapLoadError] = useState(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  const isDevelopment = process.env.NODE_ENV === "development";
  const mapRef = useRef(null);
  const fetchTerracresRef = useRef(false);
  const geolocationRequestedRef = useRef(false);

  // Manually load the Google Maps API script with robust error handling
  useEffect(() => {
    console.log("🗺️ Executing useEffect for Google Maps API script loading");
    const loadGoogleMapsScript = () => {
      try {
        if (window.google && window.google.maps) {
          console.log("🗺️ Google Maps API already loaded");
          setIsGoogleMapsLoaded(true);
          return;
        }

        console.log("🗺️ Loading Google Maps API script...");
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=${libraries.join(",")}&callback=initGoogleMaps`;
        script.async = true;
        script.defer = true;
        script.onerror = (err) => {
          console.error("🗺️ Failed to load Google Maps API script:", err);
          setMapLoadError("Failed to load Google Maps API script. Please check your API key, network connection, or Content Security Policy settings.");
        };
        document.head.appendChild(script);
        console.log("🗺️ Google Maps API script appended to DOM");

        window.initGoogleMaps = () => {
          console.log("🗺️ Google Maps API script loaded and initialized");
          setIsGoogleMapsLoaded(true);
        };

        // Timeout mechanism to detect if the script fails to load
        const timeout = setTimeout(() => {
          if (!isGoogleMapsLoaded) {
            console.error("🗺️ Google Maps API script loading timed out after 10 seconds");
            setMapLoadError("Google Maps API script failed to load within 10 seconds. Please check your API key or network connection.");
            if (isDevelopment) {
              console.warn("🛠️ Development mode: Skipping map rendering due to script loading failure");
              setIsGoogleMapsLoaded(true); // Allow app to continue in development mode
            }
          }
        }, 10000);

        return () => {
          clearTimeout(timeout);
        };
      } catch (err) {
        console.error("🗺️ Error in loadGoogleMapsScript:", err);
        setMapLoadError("Failed to initialize Google Maps API script loading: " + err.message);
      }
    };

    loadGoogleMapsScript();

    return () => {
      console.log("🧹 Cleaning up Google Maps API script and callback");
      delete window.initGoogleMaps;
      const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
      scripts.forEach((script) => script.remove());
    };
  }, [isDevelopment]);

  const roundCoordinate = (value) => {
    const rounded = Number(value.toFixed(COORDINATE_PRECISION));
    console.log(`📏 Rounding ${value} to ${rounded}`);
    return rounded;
  };

  useEffect(() => {
    setIsDomReady(true);
  }, []);

  useEffect(() => {
    console.log("🔍 Setting up onAuthStateChanged");
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        console.log("🔥 onAuthStateChanged fired", firebaseUser);
        setUser(firebaseUser ? { uid: firebaseUser.uid, displayName: firebaseUser.displayName } : null);
        setAuthLoading(false);
      },
      (error) => {
        console.error("🔥 onAuthStateChanged error:", error);
        setError("Failed to check authentication state.");
        setUser(null);
        setAuthLoading(false);
      }
    );
    return () => {
      console.log("🧹 Cleaning up onAuthStateChanged");
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isDevelopment) {
      console.log("🛠️ Running in development mode");
      setUser({ uid: "devUser", displayName: "Developer", terrabucks: 1000 });
      setUserLocation(defaultCenter);
      setMapLoaded(true);
      setAuthLoading(false);
    }
  }, [isDevelopment]);

  const handleLoginSuccess = (firebaseUser) => {
    console.log("✅ Login successful:", firebaseUser);
    setUser({ uid: firebaseUser.uid, displayName: firebaseUser.displayName });
  };

  useEffect(() => {
    if (!isDevelopment && user && !authLoading && !geolocationRequestedRef.current) {
      console.log("📍 Requesting geolocation");
      geolocationRequestedRef.current = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log("📍 Geolocation success:", pos.coords);
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.error("📍 Geolocation failed:", err);
          setError("Failed to get location. Using default location.");
          setUserLocation(defaultCenter);
          geolocationRequestedRef.current = false;
        }
      );
    }
  }, [isDevelopment, user, authLoading]);

  const fetchOwnedTerracres = useCallback(async () => {
    if (!user || fetchTerracresRef.current) return;
    fetchTerracresRef.current = true;
    let terracres = [];
    let messages = [];
    try {
      const querySnapshot = await getDocs(collection(db, "terracres"));
      terracres = Array.from(
        new Map(querySnapshot.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }])).values()
      ).filter((t) => t.id && t.lat && t.lng);
      console.log("🏞️ Fetched terracres:", terracres);
      setOwnedTerracres(terracres);

      const checkInsSnapshot = await getDocs(collection(db, "checkins"));
      for (const docSnap of checkInsSnapshot.docs) {
        const data = docSnap.data();
        if (
          terracres.some((t) => t.id === data.terracreId && t.ownerId === user.uid) &&
          data.message
        ) {
          let visitorName = "Unknown visitor";
          try {
            const visitorRef = doc(db, "users", data.userId);
            const visitorSnap = await getDoc(visitorRef);
            if (visitorSnap.exists()) {
              visitorName = visitorSnap.data().nickname || visitorSnap.data().name || "Unknown visitor";
            }
          } catch (visitorErr) {
            console.warn("⚠️ Failed to fetch visitor name for userId:", data.userId, visitorErr);
          }
          messages.push(`${visitorName}: ${data.message}`);
        }
      }
      console.log("📬 Check-in messages:", messages);
      setCheckInMessages(messages);
    } catch (err) {
      console.error("🔥 Error fetching terracres or check-ins:", err);
      if (!terracres.length && !messages.length) {
        setError("Failed to fetch terracres or check-ins.");
      }
      setOwnedTerracres(terracres);
      setCheckInMessages(messages);
    } finally {
      fetchTerracresRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchOwnedTerracres();
    }
  }, [user, purchaseTrigger, fetchOwnedTerracres, authLoading]);

  const fetchUserData = useCallback(() => {
    if (!user?.uid) {
      setUser((prev) => ({ ...prev, terrabucks: 0, nickname: null }));
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (userSnap) => {
        if (userSnap.exists()) {
          const data = userSnap.data();
          console.log("🔥 Fetched user data:", data);
          setUser((prev) => ({ ...prev, ...data }));
        } else {
          const initialData = {
            uid: user.uid,
            name: user.displayName,
            terrabucks: 1000,
            nickname: user.displayName || "User",
            createdAt: new Date().toISOString(),
          };
          setDoc(userRef, initialData).then(() => {
            setUser((prev) => ({ ...prev, ...initialData }));
          });
        }
      },
      (err) => {
        console.error("🔥 Error listening to user data:", err);
        setError("Failed to fetch user data.");
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    if (user && !authLoading) {
      const unsubscribe = fetchUserData();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user, fetchUserData, authLoading]);

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
    if (!user || !gridCenter) return { message: "User or location not available." };
    console.log("🛒 Received gridCenter:", gridCenter);

    const snappedCenter = snapToGridCenter(gridCenter.lat, gridCenter.lng, gridCells);
    console.log("🛒 Snapped to:", snappedCenter);

    const standardizedCenter = {
      lat: roundCoordinate(snappedCenter.lat),
      lng: roundCoordinate(snappedCenter.lng),
    };
    const terracreId = `${standardizedCenter.lat}-${standardizedCenter.lng}`;
    console.log("🛒 Attempting purchase for terracreId:", terracreId);

    const terracreRef = doc(db, "terracres", terracreId);
    const terracreSnap = await getDoc(terracreRef);
    if (terracreSnap.exists()) {
      console.warn("🏞️ Attempted to create duplicate terracre:", terracreId);
      return { message: "You cannot purchase this property. It is already owned." };
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();
    const terrabucks = userData?.terrabucks ?? 0;
    const TERRACRE_COST = 100;
    if (terrabucks < TERRACRE_COST) return { message: "Not enough TerraBucks to purchase." };

    const chosenType = getRandomTaType();
    const newTerracre = {
      id: terracreId,
      lat: standardizedCenter.lat,
      lng: standardizedCenter.lng,
      ownerId: user.uid,
      purchasedAt: new Date().toISOString(),
      lastCollected: new Date().toISOString(),
      earningRate: chosenType.rate,
      taType: chosenType.type,
    };
    console.log("🛒 Storing newTerracre:", newTerracre);

    try {
      await setDoc(terracreRef, newTerracre);
      await updateDoc(userRef, { terrabucks: terrabucks - TERRACRE_COST });
      setPurchaseTrigger((prev) => prev + 1);
      console.log("✅ Purchased terracre:", terracreId);
      return { message: `✅ You purchased a ${chosenType.type}!` };
    } catch (err) {
      console.error("🔥 Purchase failed:", err);
      return { message: "Failed to purchase terracre." };
    }
  };

  const calculateTotalEarnings = useCallback(() => {
    const now = new Date();
    const earnings = ownedTerracres
      .filter((t) => t.ownerId === user?.uid)
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
        const centerLat = roundCoordinate(baseLat + deltaLat / 2);
        const centerLng = roundCoordinate(baseLng + deltaLng / 2);
        grid.push({
          center: { lat: centerLat, lng: centerLng },
          paths: [
            { lat: baseLat, lng: baseLng },
            { lat: baseLat + deltaLat, lng: baseLng },
            { lat: baseLat + deltaLat, lng: baseLng + deltaLng },
            { lat: baseLat, lng: baseLng + deltaLng },
            { lat: baseLat, lng: baseLng },
          ],
        });
      }
    }
    console.log("📍 Generated grid cells:", grid.length);
    return grid;
  }, []);

  const snapToGridCenter = useCallback(
    (lat, lng, gridCells) => {
      console.log("📍 Snapping lat:", lat, "lng:", lng);
      if (!gridCells.length) {
        const fallback = { lat: roundCoordinate(lat), lng: roundCoordinate(lng) };
        console.log("📍 No grid cells, using fallback:", fallback);
        return fallback;
      }
      const metersPerDegreeLat = 111000;
      const metersPerDegreeLng = metersPerDegreeLat * Math.cos((lat * Math.PI) / 180);
      const deltaLat = TERRACRE_SIZE_METERS / metersPerDegreeLat;
      const deltaLng = TERRACRE_SIZE_METERS / metersPerDegreeLng;
      console.log("📍 Delta lat:", deltaLat, "lng:", deltaLng);
      const baseLat = Math.floor(lat / deltaLat) * deltaLat;
      const baseLng = Math.floor(lng / deltaLng) * deltaLng;
      const centerLat = roundCoordinate(baseLat + deltaLat / 2);
      const centerLng = roundCoordinate(baseLng + deltaLng / 2);
      const result = { lat: centerLat, lng: centerLng };
      console.log("📍 Snapped to center:", result);
      return result;
    },
    []
  );

  let gridCells = [];
  try {
    gridCells = useMemo(
      () => (mapLoaded && userLocation ? getGridLines(userLocation) : []),
      [userLocation, mapLoaded, getGridLines]
    );
  } catch (err) {
    console.error("🔥 Error computing gridCells:", err);
    setError("Failed to compute grid cells: " + err.message);
  }

  let snappedUserGridCenter = null;
  try {
    snappedUserGridCenter = useMemo(() => {
      if (!userLocation || !gridCells.length) return null;
      const snapped = snapToGridCenter(userLocation.lat, userLocation.lng, gridCells);
      console.log("📍 snappedUserGridCenter:", snapped);
      return snapped;
    }, [userLocation, gridCells, snapToGridCenter]);
  } catch (err) {
    console.error("🔥 Error computing snappedUserGridCenter:", err);
    setError("Failed to compute snapped user grid center: " + err.message);
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserLocation(null);
      setOwnedTerracres([]);
      setCheckInMessages([]);
      setTotalEarnings(0);
      setCheckInStatus("");
      setShowUserPage(false);
      setShowProfile(false);
      setShowGallery(false);
      console.log("🔥 Signed out successfully");
    } catch (err) {
      console.error("🔥 Sign-out failed:", err);
      setError("Failed to sign out.");
    }
  };

  const handleProfileClose = (showGallery = false) => {
    setShowProfile(false);
    if (showGallery) {
      setShowGallery(true);
    }
  };

  if (authLoading) {
    console.log("⏳ Rendering auth loading state");
    return <div>Loading authentication...</div>;
  }

  if (error) {
    console.log("❌ Rendering error state");
    return <div>Error: {error}</div>;
  }

  if (!user && !isDevelopment) {
    console.log("🔒 Rendering Login component");
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  console.log("🎮 Rendering main UI", { user, userLocation });

  return (
    <Router>
      <ErrorBoundary>
        <Suspense fallback={<div>Loading app...</div>}>
          <Routes>
            <Route
              path="/ta/:terracreId"
              element={
                <TAProfile user={user} setUser={setUser} setCheckInStatus={setCheckInStatus} />
              }
            />
            <Route
              path="*"
              element={<MainContent />}
            />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );

  function MapComponent({ userLocation, gridCells, ownedTerracres, zoom, user, setUserLocation, setZoom }) {
    const [mapReady, setMapReady] = useState(false);
    const [googleMapsReady, setGoogleMapsReady] = useState(false);
    const metersPerDegreeLat = 111000;
    const metersPerDegreeLng = userLocation
      ? metersPerDegreeLat * Math.cos((userLocation.lat * Math.PI) / 180)
      : metersPerDegreeLat;
    const deltaLat = TERRACRE_SIZE_METERS / metersPerDegreeLat;
    const deltaLng = TERRACRE_SIZE_METERS / metersPerDegreeLng;

    useEffect(() => {
      console.log("🗺️ MapComponent mounted with props:", { userLocation, gridCells, ownedTerracres, zoom, user });
    }, []);

    useEffect(() => {
      const checkGoogleMapsReady = () => {
        if (
          window.google &&
          window.google.maps &&
          window.google.maps.Point &&
          window.google.maps.SymbolPath
        ) {
          console.log("🗺️ Google Maps API fully ready for Marker rendering");
          setGoogleMapsReady(true);
        } else {
          console.log("🗺️ Google Maps API not fully ready, polling...");
          setTimeout(checkGoogleMapsReady, 100);
        }
      };

      if (isGoogleMapsLoaded) {
        checkGoogleMapsReady();
      }
    }, [isGoogleMapsLoaded]);

    useEffect(() => {
      if (mapReady && window.google && window.google.maps && window.google.maps.event) {
        console.log("🗺️ Setting up zoom_changed event listener");
        try {
          const map = mapRef.current;
          const listener = window.google.maps.event.addListener(map, "zoom_changed", () => {
            const z = map.getZoom();
            setZoom(z);
            console.log("🔎 Zoom changed to:", z);
          });

          return () => {
            console.log("🧹 Cleaning up zoom_changed event listener");
            window.google.maps.event.removeListener(listener);
          };
        } catch (err) {
          console.error("🗺️ Failed to set up zoom_changed listener:", err);
          setError("Failed to set up map event listeners.");
        }
      }
    }, [mapReady, setZoom]);

    return (
      <Suspense fallback={<div>Loading map...</div>}>
        <GoogleMap
          mapContainerClassName="map-container"
          center={userLocation}
          zoom={zoom}
          onLoad={(map) => {
            console.log("🗺️ Google Map component loaded");
            mapRef.current = map;
            setMapLoaded(true);
            setMapReady(true);
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
            margin: "10px auto",
          }}
        >
          {googleMapsReady && gridCells.map((cell, index) => (
            <Polygon
              key={`polygon-${index}`}
              paths={cell.paths}
              options={{
                fillColor: "transparent",
                strokeColor: "#999",
                strokeOpacity: 0.8,
                strokeWeight: 1,
              }}
            />
          ))}
          {googleMapsReady && user && ownedTerracres.length > 0 && ownedTerracres.map((t) => {
            const offsetLat = t.lat + 0.5 * deltaLat; // Adjusted to center within grid
            const offsetLng = t.lng - 0.5 * deltaLng; // Adjusted to center within grid
            console.log("🏞️ Rendering TerracreMarker for:", t.id, { offsetLat, offsetLng });
            return (
              <Marker
                key={`terracre-${t.id}`}
                position={{ lat: offsetLat, lng: offsetLng }}
                icon={{
                  path: "M -34,-34 L 34,-34 L 34,34 L -34,34 Z",
                  scale: Math.max(1, Math.min(4, Math.pow(2, zoom - 18))),
                  fillColor: t.ownerId === user?.uid ? "blue" : "green",
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: "#fff",
                  anchor: new window.google.maps.Point(0, 0), // Adjusted anchor to center
                }}
                zIndex={50}
              />
            );
          })}
          {googleMapsReady && userLocation && snappedUserGridCenter && (
            <Marker
              position={snappedUserGridCenter}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#4285F4",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#fff",
              }}
              title="You"
              zIndex={100}
            />
          )}
        </GoogleMap>
      </Suspense>
    );
  }

  const MemoizedMapComponent = React.memo(MapComponent);

  function MainContent() {
    const location = useLocation();
    const isMainPage = location.pathname === "/";

    useEffect(() => {
      console.log("🗺️ Map rendering conditions:", { isMainPage, isGoogleMapsLoaded, isDomReady, userLocation });
    }, [isMainPage, isGoogleMapsLoaded, isDomReady, userLocation]);

    if (mapLoadError) {
      return (
        <div>
          <p>Error: {mapLoadError}</p>
          {isDevelopment && (
            <div>
              <p>Development mode: Map rendering skipped. You can still interact with the app.</p>
              <div className="greeting">
                Welcome, {user?.nickname || user?.displayName || "User"}! You have {user?.terrabucks ?? 0} TB.
              </div>
              <div className="button-container">
                {snappedUserGridCenter ? (
                  <CheckInButton
                    user={user}
                    userLocation={userLocation}
                    snappedGridCenter={snappedUserGridCenter}
                    setCheckInStatus={setCheckInStatus}
                  />
                ) : (
                  <p>Loading grid center...</p>
                )}
                <PurchaseButton
                  user={user}
                  userLocation={userLocation}
                  setUser={setUser}
                  onPurchase={handlePurchase}
                  gridCenter={snappedUserGridCenter}
                />
              </div>
              {checkInStatus && <p>{checkInStatus}</p>}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="app-container">
        {user && (
          <>
            {!showUserPage && !showProfile && (
              <>
                <UserButton onUser={() => setShowUserPage(true)} />
                <button onClick={() => setShowProfile(true)}>Edit Profile</button>
              </>
            )}
            <SignOutButton onSignOut={handleSignOut} />
            {!showProfile && (
              <button onClick={() => setShowGallery(true)}>📸 View Check-In Gallery</button>
            )}
          </>
        )}
        {showProfile ? (
          <UserProfile
            user={user}
            onClose={handleProfileClose}
            ownedTerracres={ownedTerracres}
            checkInMessages={checkInMessages}
          />
        ) : showUserPage ? (
          <UserPage
            user={user}
            onClose={() => setShowUserPage(false)}
            earnings={totalEarnings}
            rockMines={ownedTerracres.filter((t) => t.taType === "Rock Mine" && t.ownerId === user?.uid).length}
            coalMines={ownedTerracres.filter((t) => t.taType === "Coal Mine" && t.ownerId === user?.uid).length}
            goldMines={ownedTerracres.filter((t) => t.taType === "Gold Mine" && t.ownerId === user?.uid).length}
            diamondMines={ownedTerracres.filter((t) => t.taType === "Diamond Mine" && t.ownerId === user?.uid).length}
            checkInMessages={checkInMessages}
          />
        ) : showGallery ? (
          <CheckInGallery messages={checkInMessages} onClose={() => setShowGallery(false)} />
        ) : (
          <div>
            <header className="app-header">
              <h1>TerraMine</h1>
            </header>
            <div className="earnings">Earnings from Mining: ${totalEarnings.toFixed(2)}</div>
            {isMainPage && isGoogleMapsLoaded && isDomReady && userLocation ? (
              <Suspense fallback={<p>Loading map...</p>}>
                <MemoizedMapComponent
                  userLocation={userLocation}
                  gridCells={gridCells}
                  ownedTerracres={ownedTerracres}
                  zoom={zoom}
                  user={user}
                  setUserLocation={setUserLocation}
                  setZoom={setZoom}
                />
              </Suspense>
            ) : (
              isMainPage && <p>Waiting for map to load...</p>
            )}

            <div className="greeting">
              Welcome, {user?.nickname || user?.displayName || "User"}! You have {user?.terrabucks ?? 0} TB.
            </div>
            <div className="button-container">
              {snappedUserGridCenter ? (
                <CheckInButton
                  user={user}
                  userLocation={userLocation}
                  snappedGridCenter={snappedUserGridCenter}
                  setCheckInStatus={setCheckInStatus}
                />
              ) : (
                <p>Loading grid center...</p>
              )}
              <PurchaseButton
                user={user}
                userLocation={userLocation}
                setUser={setUser}
                onPurchase={handlePurchase}
                gridCenter={snappedUserGridCenter}
              />
            </div>
            {checkInStatus && <p>{checkInStatus}</p>}
          </div>
        )}
      </div>
    );
  }
}

export default App;