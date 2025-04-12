import React, { useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { handleCheckIn } from "../firebaseFunctions";
import "./CheckInButton.css";

const CheckInButton = ({ user, userLocation, setCheckInStatus, setUser }) => {
  const [showInput, setShowInput] = useState(false);
  const [message, setMessage] = useState("");

  const handleCheckInClick = async () => {
    if (!user || !userLocation) {
      setCheckInStatus("⚠️ Please log in and allow location access.");
      return;
    }

    try {
      const center = snapToGridCenter(userLocation.lat, userLocation.lng);
      const terracreId = `${center.lat.toFixed(7)}-${center.lng.toFixed(7)}`;

      const result = await handleCheckIn(user, terracreId, message.trim());
      setCheckInStatus(result);

      if (result.includes("earned 1 TB")) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const newUserData = userSnap.data();
          setUser((prevUser) => ({ ...prevUser, terrabucks: newUserData.terrabucks }));
        }
      }
    } catch (error) {
      console.error("Check-in error:", error);
      const errorMsg = error?.message || "";
      if (errorMsg.includes("not owned")) {
        setCheckInStatus("❌ Check-In failed. This TA is not owned.");
      } else {
        setCheckInStatus("❌ Check-In failed due to an unknown error.");
      }
    }

    setShowInput(false);
    setMessage("");
  };

  const snapToGridCenter = (lat, lng) => {
    const TERRACRE_SIZE_METERS = 30;
    const metersPerDegreeLat = 111000;
    const metersPerDegreeLng = metersPerDegreeLat * Math.cos((lat * Math.PI) / 180);
    const deltaLat = TERRACRE_SIZE_METERS / metersPerDegreeLat;
    const deltaLng = TERRACRE_SIZE_METERS / metersPerDegreeLng;
    const baseLat = Math.floor(lat / deltaLat) * deltaLat;
    const baseLng = Math.floor(lng / deltaLng) * deltaLng;
    return { lat: baseLat + deltaLat / 2, lng: baseLng + deltaLng / 2 };
  };

  return (
    <div className="checkin-container">
      {showInput && (
        <input
          type="text"
          className="checkin-message-input"
          placeholder="Leave a message for the TA owner"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      )}
      {!showInput ? (
        <button className="checkin-button" onClick={() => setShowInput(true)}>
          Check In
        </button>
      ) : (
        <>
          <button className="checkin-button confirm" onClick={handleCheckInClick}>
            Confirm Message
          </button>
          <button className="checkin-button cancel" onClick={() => setShowInput(false)}>
            Cancel
          </button>
        </>
      )}
    </div>
  );
};

export default CheckInButton;
