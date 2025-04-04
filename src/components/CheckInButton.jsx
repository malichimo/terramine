
import React from "react";
import "./CheckInButton.css";
import { doc, getDoc, setDoc, updateDoc, collection, addDoc } from "firebase/firestore";
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

    const gridCenter = getGridCenter(userLocation.lat, userLocation.lng);
    const terracreId = `${gridCenter.lat}-${gridCenter.lng}`;
    const checkInId = `${user.uid}_${terracreId}`;
    const checkInRef = doc(db, "check-ins", checkInId);
    const checkInSnap = await getDoc(checkInRef);

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    if (checkInSnap.exists() && checkInSnap.data().date === today) {
      setCheckInStatus("You already checked in here today.");
      return;
    }

    const terracreRef = doc(db, "terracres", terracreId);
    const terracreSnap = await getDoc(terracreRef);
    if (!terracreSnap.exists()) {
      setCheckInStatus("Check-In failed: Terracre not found.");
      return;
    }

    const taData = terracreSnap.data();
    const ownerId = taData.ownerId;

    const message = prompt("Leave a message for the owner:");
    await setDoc(checkInRef, {
      userId: user.uid,
      terracreId,
      date: today,
      message: message || "",
      timestamp: new Date().toISOString(),
    });

    // Update visitor's TB
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userTB = userSnap.data()?.terrabucks || 0;
    await updateDoc(userRef, { terrabucks: userTB + 1 });
    setUser(prev => ({ ...prev, terrabucks: userTB + 1 }));

    // Update owner's TB
    if (ownerId && ownerId !== user.uid) {
      const ownerRef = doc(db, "users", ownerId);
      const ownerSnap = await getDoc(ownerRef);
      const ownerTB = ownerSnap.data()?.terrabucks || 0;
      await updateDoc(ownerRef, { terrabucks: ownerTB + 1 });
    }

    setCheckInStatus("✅ Check-In successful! You earned 1 TB.");
  };

  return (
    <button className="check-in-button" onClick={handleCheckIn}>
      Check-In
    </button>
  );
};

export default CheckInButton;
