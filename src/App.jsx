import React, { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import Login from "./components/Login";
import Profile from "./components/Profile";
import CheckInButton from "./components/CheckInButton";
import { handleSignOut } from "./firebaseFunctions";

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";

function App() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  if (!user) return <Login onLoginSuccess={(user) => setUser(user)} />;

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => setUserLocation(defaultCenter)
      );
    } else {
      setUserLocation(defaultCenter);
    }
  }, []);

  return (
    <div>
      <h1>TerraMine</h1>
      <Profile user={user} onSignOut={handleSignOut} />
      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap mapContainerStyle={{ width: "100%", height: "500px" }} center={userLocation || defaultCenter} zoom={15}>
          {userLocation && <Marker position={userLocation} label="You" />}
        </GoogleMap>
      </LoadScript>
      <CheckInButton user={user} userLocation={userLocation} />
    </div>
  );
}

export default App;


