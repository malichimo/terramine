import React, { useState, useEffect } from "react";
import { auth } from "./firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import Login from "./components/Login"; // ✅ Correctly import Login screen
import CheckInButton from "./components/CheckInButton"; // ✅ Import CheckInButton

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY"; // 🔴 REPLACE WITH YOUR ACTUAL API KEY

function App() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [ownedTerracres, setOwnedTerracres] = useState([]);

  // ✅ Track user authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth State Changed:", currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, { uid: currentUser.uid, terrabucks: 1000 });
        }
        setUser({ ...currentUser, terrabucks: userSnap.data()?.terrabucks || 1000 });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // ✅ If user is not signed in, show Login screen
  if (!user) {
    return <Login onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  // ✅ Get user's location
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

  return (
    <div>
      <h1>TerraMine</h1>

      {/* Show User Profile */}
      <div>
        <img src={user.photoURL} alt="Profile" style={{ width: "50px", borderRadius: "50%" }} />
        <p><strong>Name:</strong> {user.displayName}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Terrabucks:</strong> {user.terrabucks ?? "Loading..."}</p>
        <button onClick={() => signOut(auth)}>Sign Out</button>
      </div>

      {/* Google Maps */}
      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap mapContainerStyle={{ width: "100%", height: "500px" }} center={userLocation || defaultCenter} zoom={15}>
          {userLocation && <Marker position={userLocation} label="You" />}
        </GoogleMap>
      </LoadScript>

      {/* Check-In Button */}
      <CheckInButton user={user} userLocation={userLocation} />
    </div>
  );
}

export default App;

