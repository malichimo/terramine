// CheckInButton.jsx
import React from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, collection } from "firebase/firestore";
import "./CheckInButton.css"; // ✅ Add CSS import
import { handleCheckIn } from "../firebaseFunctions";

const CheckInButton = ({ user, userLocation, setCheckInStatus, setUser }) => {
  const handleCheckIn = async () => {
    if (!user || !userLocation) {
      setCheckInStatus("Please log in and allow location access.");
      return;
    }

    try {
      // Use snapToGridCenter to get the correct terracreId
      const center = snapToGridCenter(userLocation.lat, userLocation.lng, []); // Pass empty gridCells for now
      const terracreId = `${center.lat.toFixed(7)}-${center.lng.toFixed(7)}`; // Match Firestore ID format

      const checkInStatus = await handleCheckIn(user, terracreId);
      setCheckInStatus(checkInStatus);

      // Update user state with new terrabucks if successful
      if (checkInStatus.includes("earned 1 TB")) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const newUserData = userSnap.data();
          setUser((prevUser) => ({ ...prevUser, terrabucks: newUserData.terrabucks }));
        }
      }
    } catch (error) {
      console.error("Check-in error:", error);
      setCheckInStatus("Failed to check in. Try again.");
    }
  };

  // Placeholder snapToGridCenter function (to be moved to App.jsx or utils)
  const snapToGridCenter = (lat, lng, gridCells) => {
    const TERRACRE_SIZE_METERS = 30;
    const metersPerDegreeLat = 111000;
    const metersPerDegreeLng = metersPerDegreeLat * Math.cos((lat * Math.PI) / 180);
    const deltaLat = TERRACRE_SIZE_METERS / metersPerDegreeLat;
    const deltaLng = TERRACRE_SIZE_METERS / metersPerDegreeLng;
    const baseLat = Math.floor(lat / deltaLat) * deltaLat;
    const baseLng = Math.floor(lng / deltaLng) * deltaLng;
    const center = { lat: baseLat + deltaLat / 2, lng: baseLng / 2 };
    console.log("Snapped - User:", { lat, lng }, "Cell:", center);
    return center;
  };

  return (
    <button className="checkin-button" onClick={handleCheckIn}>
      Check In
    </button>
  );
};

export default CheckInButton;
