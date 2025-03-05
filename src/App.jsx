import React, { useState, useEffect, useCallback, Suspense } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import Login from "./components/Login";
import CheckInButton from "./components/CheckInButton";

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us"; // Replace with your key

function App() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [ownedTerracres, setOwnedTerracres] = useState([]);
  const [checkInStatus, setCheckInStatus] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false); // ✅ Track map script loading
  const [isMounted, setIsMounted] = useState(true);

  /** Track User Authentication */
  useEffect(() => {
    setIsMounted(true);
    console.log("Auth Listener Initialized ✅");

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;
      console.log("Auth State Changed ✅:", currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          console.log("New user detected 🚀 - Creating Firestore profile...");
          await setDoc(userRef, { uid: currentUser.uid, terrabucks: 1000 });
          setUser({ ...currentUser, terrabucks: 1000 });
        } else {
          console.log("User exists ✅", userSnap.data());
          setUser({ ...currentUser, terrabucks: userSnap.data()?.terrabucks || 1000 });
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

  /** If User is Not Signed In, Show Login */
  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  /** Get User's Location */
  useEffect(() => {
    setIsMounted(true);
    console.log("Fetching User Location... 📍");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMounted) return;
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("❌ Error retrieving location:", error);
          setUserLocation(defaultCenter);
        }
      );
    } else {
      setUserLocation(defaultCenter);
    }

    return () => setIsMounted(false);
  }, []);

  /** Fetch Owned Terracres */
  const fetchOwnedTerracres = useCallback(async () => {
    setIsMounted(true);
    try {
      const terracresRef = collection(db, "terracres");
      const querySnapshot = await getDocs(terracresRef);
      const properties = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((terracre) => terracre.lat && terracre.lng);
      if (isMounted) setOwnedTerracres(properties);
    } catch (error) {
      console.error("🔥 Firestore Fetch Error:", error);
      if (isMounted) setOwnedTerracres([]);
    }
  }, []);

  useEffect(() => {
    fetchOwnedTerracres();
    return () => setIsMounted(false);
  }, [fetchOwnedTerracres]);

  return (
    <div>
      <h1>TerraMine</h1>

      {/* Only render map when userLocation is set */}
      {userLocation ? (
        <Suspense fallback={<p>Loading map resources...</p>}>
          <LoadScript
            googleMapsApiKey={GOOGLE_MAPS_API_KEY}
            onLoad={() => setMapLoaded(true)} // ✅ Confirm script loaded
          >
            {mapLoaded && (
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "500px" }}
                center={userLocation}
                zoom={15}
                onLoad={() => console.log("✅ GoogleMap loaded")}
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
            )}
          </LoadScript>
        </Suspense>
      ) : (
        <p>Loading your location...</p>
      )}

      <CheckInButton user={user} userLocation={userLocation} setCheckInStatus={setCheckInStatus} />
      {checkInStatus && <p>{checkInStatus}</p>}
    </div>
  );
}

export default App;
