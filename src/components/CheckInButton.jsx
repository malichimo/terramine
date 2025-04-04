import React from "react";
import "./CheckInButton.css";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const CheckInButton = ({ user, userLocation, setCheckInStatus, setUser }) => {
  const TERRACRE_SIZE_METERS = 30;
  const metersPerDegreeLat = 111000;

  const getGridCenter = (lat, lng) => {
    const deltaLat = TERRACRE_SIZE_METERS / metersPerDegreeLat;
    const deltaLng = TERRACRE_SIZE_METERS / (metersPerDegreeLat * Math.cos(lat * Math.PI / 180));
    const baseLat = Math.floor(lat / deltaLat) * deltaLat;
    const baseLng = Math.floor(lng / deltaLng) * deltaLng;
    return {
      lat: parseFloat((baseLat + deltaLat / 2).toFixed(7)),
      lng: parseFloat((baseLng + deltaLng / 2).toFixed(7)),
    };
  };

  const handleCheckIn = async () => {
    if (!user || !userLocation) return;

    const center = getGridCenter(userLocation.lat, userLocation.lng);
    const terracreId = `${center.lat}-${center.lng}`;
    const terracreRef = doc(db, "terracres", terracreId);
    const terracreSnap = await getDoc(terracreRef);

    // ❌ No TA here
    if (!terracreSnap.exists()) {
      showStatus("🚫 No property found at this location.");
      return;
    }

    const taData = terracreSnap.data();

    // ❌ Own property (optional rule)
    if (taData.ownerId === user.uid) {
      showStatus("ℹ️ This is your own Terracre. Check-in not required.");
      return;
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const checkInId = `${user.uid}_${center.lat}_${center.lng}_${today}`;
    const checkInRef = doc(db, "check-ins", checkInId);

    try {
      const existing = await getDoc(checkInRef);
      if (existing.exists()) {
        showStatus("⚠️ You've already checked in here today.");
        return;
      }

      await setDoc(checkInRef, {
        uid: user.uid,
        lat: center.lat,
        lng: center.lng,
        timestamp: new Date().toISOString(),
      });

      showStatus("✅ Check-in successful! +1 TB");
      setUser(prev => ({ ...prev, terrabucks: (prev.terrabucks ?? 0) + 1 }));
    } catch (error) {
      console.error("Check-in error:", error);
      showStatus("❌ Check-in failed.");
    }
  };

  const showStatus = (message) => {
    const el = document.createElement("div");
    el.className = "purchase-message";
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 5000);
  };

  return (
    <button className="checkin-button" onClick={handleCheckIn}>
      Check In
    </button>
  );
};

export default CheckInButton;

