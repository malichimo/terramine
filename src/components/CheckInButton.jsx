import React from "react";
import { handleCheckIn } from "../firebaseFunctions";

function CheckInButton({ user, userLocation, setCheckInStatus }) {
  const handleCheckInClick = async () => {
    if (!user || !userLocation) {
      setCheckInStatus("Sign in and enable location to check in.");
      return;
    }
    const statusMessage = await handleCheckIn(user, userLocation);
    setCheckInStatus(statusMessage);
  };

  return (
    <button 
      onClick={handleCheckInClick} 
      style={{
        marginTop: "10px",
        padding: "10px",
        fontSize: "16px",
        backgroundColor: "#28a745",
        color: "#fff",
        border: "none",
        cursor: "pointer"
      }}
    >
      Tap to Check-In
    </button>
  );
}

export default CheckInButton;
