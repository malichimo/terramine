import React, { useState } from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import "./CheckInButton.css";

const CheckInButton = ({ user, userLocation, setCheckInStatus, setUser }) => {
  const [message, setMessage] = useState("");

  const handleCheckIn = async () => {
    if (!user || !userLocation) return;

    const gridLat = userLocation.lat.toFixed(7);
    const gridLng = userLocation.lng.toFixed(7);
    const gridId = `${gridLat}-${gridLng}`;
    const locationRef = doc(db, "terracres", gridId);
    const locationSnap = await getDoc(locationRef);

    if (!locationSnap.exists()) {
      setCheckInStatus("❌ Check-in failed. This location is not owned.");
      return;
    }

    const ownerId = locationSnap.data().ownerId;
    if (!ownerId || ownerId === user.uid) {
      setCheckInStatus("❌ Cannot check-in to your own property.");
      return;
    }

    const checkInId = `${user.uid}-${gridId}`;
    const checkInRef = doc(db, "checkins", checkInId);
    const checkInSnap = await getDoc(checkInRef);

    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
    if (checkInSnap.exists() && checkInSnap.data().date === today) {
      setCheckInStatus("✅ You already checked in here today.");
      return;
    }

    // Award 1 TB to visitor
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();
    await updateDoc(userRef, { terrabucks: (userData.terrabucks || 0) + 1 });
    setUser({ ...user, terrabucks: (userData.terrabucks || 0) + 1 });

    // Award 1 TB to owner
    const ownerRef = doc(db, "users", ownerId);
    const ownerSnap = await getDoc(ownerRef);
    if (ownerSnap.exists()) {
      const ownerData = ownerSnap.data();
      await updateDoc(ownerRef, { terrabucks: (ownerData.terrabucks || 0) + 1 });
    }

    // Save check-in log
    await setDoc(checkInRef, {
      date: today,
      message: message || "",
    });

    setCheckInStatus("✅ Check-in successful!");
    setMessage("");
  };

  return (
    <div className="check-in-section">
      <input
        type="text"
        placeholder="Leave a message for the owner"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="check-in-message-input"
      />
      <button className="check-in-button" onClick={handleCheckIn}>
        Check-In
      </button>
    </div>
  );
};

export default CheckInButton;
