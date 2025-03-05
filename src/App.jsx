import React, { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore"; // ✅ Fix: Added `collection` and `getDocs`
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import Login from "./components/Login"; // ✅ Import Login
import CheckInButton from "./components/CheckInButton"; // ✅ Import Check-In Button

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us"; // 🔴 REPLACE WITH YOUR ACTUAL API KEY

function App() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [ownedTerracres, setOwnedTerracres] = useState([]); // ✅ Stores all owned properties

  // ✅ Track user authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth State Changed:", currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, { uid: currentUser.uid, terrabucks: 1000 });
          setUser({ ...currentUser, terrabucks: 1000 });
        } else {
          setUser({ ...currentUser, terrabucks: userSnap.data()?.terrabucks || 1000 });
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // ✅ If user is not signed in, show Login screen
  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  // ✅ Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error retrieving location:", error);
          setUserLocation(defaultCenter);
        }
      );
    } else {
      setUserLocation(defaultCenter);
    }
  }, []);

  // ✅ Fetch owned properties from Firestore
  useEffect(() => {
    const fetchOwnedTerracres = async () => {
      const terracresRef = collection(db, "terracres");
      const querySnapshot = await getDocs(terracresRef);
      const properties = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOwnedTerracres(properties);
    };

    fetchOwnedTerracres();
  }, []);

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
            {/* ✅ Show User's Location */}
            <Marker position={userLocation} label="You" />

            {/* ✅ Show Owned Properties */}
            {ownedTerracres.map((terracre) => (
              <Marker
                key={terracre.id}
                position={{ lat: terracre.lat, lng: terracre.lng }}
                icon={{
                  path:
                    window.google?.maps?.SymbolPath?.SQUARE || // ✅ Fix: Check if window.google is available
                    "M 0,0 L 10,0 L 10,10 L 0,10 z", // ✅ SVG path for a square if SymbolPath is unavailable
                  scale: 10, // 🔲 Size of the square
                  fillColor: terracre.ownerId === user.uid ? "blue" : "green", // 🔵 User-Owned = Blue, 🟢 Others' = Green
                  fillOpacity: 1,
                  strokeWeight: 1,
                }}
              />
            ))}
          </GoogleMap>
        ) : (
          <p>Loading map...</p> // ✅ Shows a message while location is loading
        )}
      </LoadScript>

      {/* ✅ Check-In Button */}
      <CheckInButton user={user} userLocation={userLocation} />
    </div>
  );
}

export default App;

