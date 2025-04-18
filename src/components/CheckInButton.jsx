import React from "react";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "./CheckInButton.css";

const COORDINATE_PRECISION = 7;

const CheckInButton = ({ user, userLocation, snappedGridCenter, setCheckInStatus, setUser }) => {
  const roundCoordinate = (value) => {
    const rounded = Number(value.toFixed(COORDINATE_PRECISION));
    console.log(`📏 CheckIn: Rounding ${value} to ${rounded}`);
    return rounded;
  };

  const handleCheckIn = async () => {
    console.log("📍 CheckIn: Starting handleCheckIn", { user, snappedGridCenter });
    if (!user || !snappedGridCenter) {
      console.log("📍 CheckIn: Missing user or snappedGridCenter");
      setCheckInStatus("User or location not available.");
      return;
    }

    const standardizedCenter = {
      lat: roundCoordinate(snappedGridCenter.lat),
      lng: roundCoordinate(snappedGridCenter.lng),
    };
    const terracreId = `${standardizedCenter.lat}-${standardizedCenter.lng}`;
    console.log("📍 CheckIn: Attempting check-in for terracreId:", terracreId);

    try {
      const terracreRef = doc(db, "terracres", terracreId);
      console.log("📍 CheckIn: Fetching terracreRef:", terracreId);
      const terracreSnap = await getDoc(terracreRef);

      if (!terracreSnap.exists()) {
        console.log("📍 CheckIn: Terracre does not exist:", terracreId);
        const terracresSnapshot = await getDocs(collection(db, "terracres"));
        const terracreIds = terracresSnapshot.docs.map((doc) => doc.id);
        console.log("📍 CheckIn: Available terracre IDs:", terracreIds);
        setCheckInStatus("This TA does not exist.");
        return;
      }

      const terracreData = terracreSnap.data();
      console.log("📍 CheckIn: Terracre found:", terracreData);

      if (terracreData.ownerId === user.uid) {
        console.log("📍 CheckIn: User owns this TA");
        setCheckInStatus("You cannot check in at your own TA.");
        return;
      }

      const checkInRef = doc(db, "checkins", `${user.uid}-${terracreId}`);
      console.log("📍 CheckIn: Checking existing check-in:", checkInRef.path);
      const existingSnap = await getDoc(checkInRef);

      const today = new Date().toISOString().split("T")[0];
      if (existingSnap.exists() && existingSnap.data().date === today) {
        console.log("📍 CheckIn: Already checked in today");
        setCheckInStatus("You have already checked in at this TA today.");
        return;
      }

      console.log("📍 CheckIn: Writing new check-in");
      await setDoc(checkInRef, {
        date: today,
        userId: user.uid,
        terracreId,
        message: "Checked in!",
        timestamp: new Date().toISOString(),
      });

      console.log("📍 CheckIn: Updating user terrabucks");
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const newTerrabucks = (userData.terrabucks || 0) + 1;
        await updateDoc(userRef, { terrabucks: newTerrabucks });
        setUser({ ...user, terrabucks: newTerrabucks });
      }

      console.log("📍 CheckIn: Updating owner terrabucks");
      const ownerRef = doc(db, "users", terracreData.ownerId);
      const ownerSnap = await getDoc(ownerRef);
      if (ownerSnap.exists()) {
        const ownerData = ownerSnap.data();
        await updateDoc(ownerRef, { terrabucks: (ownerData.terrabucks || 0) + 1 });
      }

      console.log("📍 CheckIn: Check-in successful");
      setCheckInStatus("✅ Check-in successful! You and the TA owner earned 1 TB.");
    } catch (err) {
      console.error("🔥 CheckIn: Error during check-in:", err);
      setCheckInStatus("Check-in failed. Please try again.");
    }
  };

  return (
    <div className="check-in-section">
      <button className="check-in-button" onClick={handleCheckIn}>
        Tap to Check-In
      </button>
    </div>
  );
};

export default CheckInButton;