import React, { useState, useEffect, useCallback } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import Login from "./components/Login"; 
import CheckInButton from "./components/CheckInButton"; 

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us"; 

function App() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [ownedTerracres, setOwnedTerracres] = useState([]);
  let isMounted = true; // ✅ Prevent updates after unmounting

  // ✅ Track User Authentication
  useEffect(() => {
    console.log("Auth Listener Initialized ✅");
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return; // ✅ Stop updates if unmounted
      console.log("Auth State Changed ✅:", currentUser);
      if (currentUser) {
        console.log("Fetching user data from Firestore... 📡");
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
        console.log("No user signed in ❌");
        setUser(null);
      }
    });

    return () => {
      isMounted = false; // ✅ Cleanup to avoid updates after unmount
      unsubscribe();
    };
  }, []);

  // ✅ If User is Not Signed In, Show Login
  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  // ✅ Get User's Location
  useEffect(() => {
    console.log("Fetching User Location... 📍");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMounted) return; // ✅ Prevent updates if unmounted
          console.log("✅ Location Retrieved:", position.coords);
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
      console.warn("⚠️ Geolocation not supported, using default location.");
      setUserLocation(defaultCenter);
    }

    return () => {
      isMounted = false; // ✅ Cleanup
    };
  }, []);

  // ✅ Fetch Owned Terracres (Firestore)
  const fetchOwnedTerracres = useCallback(async () => {
    try {
      console.log("📡 Fetching Terracres from Firestore...");
      const terracresRef = collection(db, "terracres");
      const querySnapshot = await getDocs(terracresRef);

      if (!querySnapshot.empty) {
        const properties = querySnapshot.docs
          .map((doc) => {
            const data = doc.data();
            if (data.lat !== undefined && data.lng !== undefined) {
              return { id: doc.id, ...data };
            } else {
              console.warn(`⚠️ Skipping invalid terracre (missing lat/lng):`, doc.id, data);
              return null;
            }
          })
          .filter(Boolean);

        console.log("✅ Valid Terracres Retrieved:", properties);
        if (isMounted) setOwnedTerracres(properties); // ✅ Prevent updates if unmounted
      } else {
        console.warn("⚠️ No owned properties found.");
        if (isMounted) setOwnedTerracres([]);
      }
    } catch (error) {
      console.error("🔥 Firestore Fetch Error:", error);
      if (isMounted) setOwnedTerracres([]);
    }
  }, []);

  // ✅ Load Terracres on Mount
  useEffect(() => {
    fetchOwnedTerracres();
    return () => {
      isMounted = false; // ✅ Cleanup
    };
  }, [fetchOwnedTerracres]);

  return (
    <div>
      <h1>TerraMine</h1>

      {/* ✅ Google Maps */}
      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
        {userLocation ? (
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "500px" }}
            center={userLocation}
            zoom={15}
          >
            {/* ✅ Show User Location */}
            <Marker position={userLocation} label="You" />
      
            {/* ✅ Ensure only valid properties are mapped */}
            {ownedTerracres.length > 0 ? (
              ownedTerracres.map((terracre) => (
                <Marker
                  key={terracre.id}
                  position={{ lat: terracre.lat, lng: terracre.lng }}
                  icon={
                    window.google && window.google.maps
                      ? {
                          path: window.google.maps.SymbolPath.SQUARE,
                          scale: 10,
                          fillColor: terracre.ownerId === user.uid ? "blue" : "green",
                          fillOpacity: 1,
                          strokeWeight: 1,
                        }
                      : undefined
                  }
                />
              ))
            ) : (
              console.warn("⚠️ No valid properties to display on map.")
            )}
          </GoogleMap>
        ) : (
          <p>Loading map...</p>
        )}
      </LoadScript>

      {/* ✅ Check-In Button */}
      <CheckInButton user={user} userLocation={userLocation} />
    </div>
  );
}

export default App;





