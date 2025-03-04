import React, { useState, useEffect } from "react";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { db } from "./firebase";
import { collection, getDocs, doc, getDoc, setDoc, query, where } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us"; // Replace with your actual API key

function App() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [ownedTerracres, setOwnedTerracres] = useState([]); // Stores owned properties
  const [checkInStatus, setCheckInStatus] = useState("");

  // Track user authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, { uid: currentUser.uid, terrabucks: 1000 });
        } else {
          setUser({ ...currentUser, terrabucks: userSnap.data().terrabucks });
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Get user's location
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

  // Fetch owned Terracres from Firestore
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
      <h1>TerraMine Check-In</h1>

      {/* Google Maps */}
      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap mapContainerStyle={{ width: "100%", height: "500px" }} center={userLocation || defaultCenter} zoom={15}>
          {userLocation && <Marker position={userLocation} label="You" />}

          {/* Owned Properties Markers */}
          {ownedTerracres.map((terracre) => (
            <Marker
              key={terracre.id}
              position={{ lat: terracre.lat, lng: terracre.lng }}
              label="Owned"
              icon={{
                url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png", // Red marker for owned Terracres
              }}
            />
          ))}
        </GoogleMap>
      </LoadScript>

      {/* Show User Info */}
      {user && (
        <div>
          <img src={user.photoURL} alt="Profile" style={{ width: "50px", borderRadius: "50%" }} />
          <p><strong>Name:</strong> {user.displayName}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Terrabucks:</strong> {user.terrabucks ?? "Loading..."}</p>
          <button onClick={() => signOut(auth)}>Sign Out</button>
        </div>
      )}

      {checkInStatus && <p>{checkInStatus}</p>}
    </div>
  );
}

export default App;
