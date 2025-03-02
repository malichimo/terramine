import React, { useState, useEffect } from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "500px",
};

const defaultCenter = { lat: 37.7749, lng: -122.4194 }; // Default: San Francisco
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us"; // Store API Key as a constant

function App() {
  const [userLocation, setUserLocation] = useState(null);

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
          setUserLocation(defaultCenter); // Fallback location if denied
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
      setUserLocation(defaultCenter);
    }
  }, []);

  return (
    <div>
      <h1>Google Maps App</h1>
      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={userLocation || defaultCenter}
          zoom={15}
        >
          {userLocation && <Marker position={userLocation} />}
        </GoogleMap>
      </LoadScript>
    </div>
  );
}

export default App;
}

export default App;
