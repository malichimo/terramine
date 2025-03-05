import React from "react";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import "./CheckInButton.css"; // ✅ Add CSS import

const CheckInButton = ({ user, userLocation, setCheckInStatus }) => {
  const handleCheckIn = async () => {
    if (!user || !userLocation) {
      setCheckInStatus("Please log in and allow location access.");
      return;
    }

    try {
      const terracreId = `${userLocation.lat}-${userLocation.lng}`;
      const terracreRef = doc(db, "terracres", terracreId);

      await setDoc(terracreRef, {
        lat: userLocation.lat,
        lng: userLocation.lng,
        ownerId: user.uid,
        claimedAt: new Date().toISOString(),
      }, { merge: true });

      setCheckInStatus("Check-in successful! You’ve claimed this terracre.");
    } catch (error) {
      console.error("Check-in error:", error);
      setCheckInStatus("Failed to check in. Try again.");
    }
  };

  return (
    <button className="checkin-button" onClick={handleCheckIn}>
      Check In
    </button>
  );
};

export default CheckInButton;
