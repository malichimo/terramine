import React, { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import Login from "./components/Login"; // ✅ Import Login
import CheckInButton from "./components/CheckInButton"; // ✅ Import Check-In Button

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us"; // 🔴 REPLACE WITH YOUR API KEY

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
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "500px" }}
          center={userLocation || defaultCenter}
          zoom={15}
        >
          {/* 📍 User's location */}
          {userLocation && <Marker position={userLocation} label="You" />}

          {/* 🟢 Show all owned properties */}
          {ownedTerracres.map((terracre) => (
            <Marker
              key={terracre.id}
              position={{ lat: terracre.lat, lng: terracre.lng }}
              icon={{
                url: terracre.ownerId === user.uid
                  ? "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" // 🔹 User's owned properties
                  : "http://maps.google.com/mapfiles/ms/icons/green-dot.png", // 🟢 Other owned properties
                scaledSize: new window.google.maps.Size(30, 30), // Adjust size if needed
              }}
            />
          ))}
        </GoogleMap>
      </LoadScript>

      {/* ✅ Check-In Button */}
      <CheckInButton user={user} userLocation={userLocation} />
    </div>
  );
}

export default App;
