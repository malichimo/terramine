import React, { useState, useEffect } from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "500px" };

const defaultCenter = { lat: 37.7749, lng: -122.4194 }; // Default: San Francisco

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
        () => {
          console.error("Error: Unable to retrieve your location");
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  }, []);

  return (
    <LoadScript googleMapsApiKey="AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us">
      <GoogleMap mapContainerStyle={containerStyle} center={userLocation || defaultCenter} zoom={15}>
        {userLocation && <Marker position={userLocation} />}
      </GoogleMap>
    </LoadScript>
 <div>
    <h1>Google Maps App</h1>
    <LoadScript googleMapsApiKey="AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us">
      <GoogleMap mapContainerStyle={containerStyle} center={userLocation || defaultCenter} zoom={15}>
        {userLocation && <Marker position={userLocation} />}
      </GoogleMap>
    </LoadScript>
  </div>  );
}

export default App;
