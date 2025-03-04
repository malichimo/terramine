import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs, Timestamp, doc, getDoc } from "firebase/firestore";

function CheckInButton({ user, userLocation }) {
  const [checkInStatus, setCheckInStatus] = useState("");

  const handleCheckIn = async () => {
    if (!user) {
      setCheckInStatus("Please sign in to check in.");
      return;
    }

    if (!userLocation) {
      setCheckInStatus("Location not found. Please enable location services.");
      return;
    }

    try {
      const terracreId = `terracre_${Math.floor(userLocation.lat * 1000)}_${Math.floor(userLocation.lng * 1000)}`;
      const checkinRef = collection(db, "checkins");
      const terracreRef = doc(db, "terracres", terracreId);

      // ✅ Check if the Terracre is owned
      const terracreSnap = await getDoc(terracreRef);
      if (!terracreSnap.exists()) {
        setCheckInStatus("This Terracre is not owned by anyone.");
        return;
      }

      // ✅ Check if user already checked in today
      const today = new Date().toISOString().split("T")[0];
      const q = query(checkinRef, where("userId", "==", user.uid), where("terracreId", "==", terracreId));
      const querySnapshot = await getDocs(q);

      let alreadyCheckedIn = false;
      querySnapshot.forEach((doc) => {
        const checkinDate = doc.data().timestamp.toDate().toISOString().split("T")[0];
        if (checkinDate === today) alreadyCheckedIn = true;
      });

      if (alreadyCheckedIn) {
        setCheckInStatus("You can only check in once per day per location.");
        return;
      }

      // ✅ Save check-in to Firestore
