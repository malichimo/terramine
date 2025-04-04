import React from "react";
import { db } from "../firebase";
import { collection, getDoc, getDocs, doc, setDoc, updateDoc } from "firebase/firestore";
import "./CheckInButton.css";

const TERRACRE_SIZE_METERS = 30;

const CheckInButton = ({ user, userLocation, setCheckInStatus, setUser }) => {
  const getSnappedTerracreId = (lat, lng) => {
    const metersPerDegreeLat = 111000;
    const metersPerDegreeLng = metersPerDegreeLat * Math.cos(lat * Math.PI / 180);
    const deltaLat = TERRACRE_SIZE_METERS / metersPerDegreeLat;
    const deltaLng = TERRACRE_SIZE_METERS / metersPerDegreeLng;

    const baseLat = Math.floor(lat / deltaLat) * deltaLat;
    const baseLng = Math.floor(lng / deltaLng) * deltaLng;

    const snappedLat = baseLat + deltaLat / 2;
    const snappedLng = baseLng + deltaLng / 2;

    return `${snappedLat.toFixed(7)}-${snappedLng.toFixed(7)}`;
  };

  const handleCheckIn = async () => {
    if (!user || !userLocation) {
      setCheckInStatus("Check-In failed: Missing user or location.");
      return;
    }

    const terracreId = getSnappedTerracreId(userLocation.lat, userLocation.lng);
    const terracreRef = doc(db, "terracres", terracreId);
    const terracreSnap = await getDoc(terracreRef);

    if (!terracreSnap.exists()) {
      setCheckInStatus("Check-In failed: This area is not owned.");
      return;
    }

    const terracreData = terracreSnap.data();

    if (terracreData.ownerId === user.uid) {
      setCheckInStatus("You cannot check in at your own Terracre.");
      return;
    }

    const checkInRef = doc(db, "check-ins", `${terracreId}_${user.uid}`);
    const checkInSnap = await getDoc(checkInRef);
    const today = new Date().toISOString().split("T")[0];

    if (checkInSnap.exists()) {
      const lastDate = checkInSnap.data().date;
      if (lastDate === today) {
        setCheckInStatus("You already checked in here today.");
        return;
      }
    }

    // Update check-in data
    await setDoc(checkInRef, {
      userId: user.uid,
      terracreId,
      date: today,
      message: "",
    });

    // Award 1 TerraBuck to user and owner
    const userRef = doc(db, "users", user.uid);
    const ownerRef = doc(db, "users", terracreData.ownerId);

    const [userSnap, ownerSnap] = await Promise.all([getDoc(userRef), getDoc(ownerRef)]);

    if (userSnap.exists()) {
      const current = userSnap.data().terrabucks ?? 0;
      await updateDoc(userRef, { terrabucks: current + 1 });
      setUser(prev => ({ ...prev, terrabucks: current + 1 }));
    }

    if (ownerSnap.exists()) {
      const current = ownerSnap.data().terrabucks ?? 0;
      await updateDoc(ownerRef, { terrabucks: current + 1 });
    }

    setCheckInStatus("✅ Check-In successful. You earned 1 TerraBuck!");
  };

  return (
    <button className="checkin-button" onClick={handleCheckIn}>
      Check-In
    </button>
  );
};

export default CheckInButton;
