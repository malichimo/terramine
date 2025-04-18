import React from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

const COORDINATE_PRECISION = 7;

const CheckInButton = ({ user, userLocation, snappedGridCenter, setCheckInStatus, setUser }) => {
  // Helper to round coordinates (matches App.jsx)
  const roundCoordinate = (value) => Number(value.toFixed(COORDINATE_PRECISION));

  const handleCheckIn = async () => {
    if (!user || !snappedGridCenter) {
      setCheckInStatus("User or location not available.");
      return;
    }

    // Standardize coordinates to match purchase logic
    const standardizedCenter = {
      lat: roundCoordinate(snappedGridCenter.lat),
      lng: roundCoordinate(snappedGridCenter.lng),
    };
    const terracreId = `${standardizedCenter.lat}-${standardizedCenter.lng}`;
    console.log("📍 Attempting check-in for terracreId:", terracreId);

    const checkInRef = doc(db, "checkins", `${user.uid}-${terracreId}`);
    const terracreRef = doc(db, "terracres", terracreId);

    const terracreSnap = await getDoc(terracreRef);
    if (!terracreSnap.exists()) {
      setCheckInStatus("This TA does not exist.");
      return;
    }

    const terracreData = terracreSnap.data();
    if (terracreData.ownerId === user.uid) {
      setCheckInStatus("You cannot check in at your own TA.");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const existingSnap = await getDoc(checkInRef);

    if (existingSnap.exists() && existingSnap.data().date === today) {
      setCheckInStatus("You have already checked in at this TA today.");
      return;
    }

    await setDoc(checkInRef, {
      date: today,
      userId: user.uid,
      terracreId,
      message: "Checked in!",
      timestamp: new Date().toISOString(),
    });

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      await updateDoc(userRef, { terrabucks: (userData.terrabucks || 0) + 1 });
      setUser({ ...user, terrabucks: (userData.terrabucks || 0) + 1 });
    }

    const ownerRef = doc(db, "users", terracreData.ownerId);
    const ownerSnap = await getDoc(ownerRef);
    if (ownerSnap.exists()) {
      const ownerData = ownerSnap.data();
      await updateDoc(ownerRef, { terrabucks: (ownerData.terrabucks || 0) + 1 });
    }

    setCheckInStatus("✅ Check-in successful! You and the TA owner earned 1 TB.");
  };

  return <button onClick={handleCheckIn}>Tap to Check-In</button>;
};

export default CheckInButton;