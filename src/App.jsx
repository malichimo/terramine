import React, { useState, useEffect } from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "500px",
};

const defaultCenter = { lat: 37.7749, lng: -122.4194 }; // Default: San Francisco
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us"; // Replace with actual API key

function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [checkInStatus, setCheckInStatus] = useState("");

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
      console.error("Geolocation is not supported by this browser.");
      setUserLocation(defaultCenter);
    }
  }, []);

  const handleCheckIn = () => {
    if (!userLocation) {
      setCheckInStatus("Location not found. Please enable location services.");
      return;
    }

    // Simulate a backend request (replace with actual API call)
    fetch("https://your-backend.com/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: userLocation.lat, lng: userLocation.lng }),
    })
      .then((response) => response.json())
      .then((data) => {
        setCheckInStatus(data.message || "Check-in successful!");
      })
      .catch((error) => {
        console.error("Check-in failed:", error);
        setCheckInStatus("Check-in failed. Try again.");
      });
  };

  return (
    <div>
      <h1>TerraMine Check-In</h1>
      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap mapContainerStyle={containerStyle} center={userLocation || defaultCenter} zoom={15}>
          {userLocation && <Marker position={userLocation} />}
        </GoogleMap>
      </LoadScript>

      {/* Check-In Button */}
      <button onClick={handleCheckIn} style={{ marginTop: "10px", padding: "10px", fontSize: "16px" }}>
        Tap to Check-In
      </button>

      {/* Display Check-In Status */}
      {checkInStatus && <p>{checkInStatus}</p>}
    </div>
  );
}

export default App;
