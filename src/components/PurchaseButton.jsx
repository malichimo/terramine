import React from "react";
import { db } from "../firebase";
import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import "./PurchaseButton.css";

const PurchaseButton = ({ user, userLocation, setCheckInStatus, setUser }) => {
  const handlePurchase = async () => {
    if (!user || !userLocation) {
      setCheckInStatus("Please log in and allow location access.");
      return;
    }

    if (user.terrabucks < 100) {
      setCheckInStatus("Not enough TB! You need 100 TB to purchase a Terracre.");
      return;
    }

    try {
      const terracreId = `${userLocation.lat}-${userLocation.lng}`; // Unique ID based on coords
      const terracreRef = doc(db, "terracres", terracreId);
      const userRef = doc(db, "users", user.uid);

      // Check if terracre is already owned
      const terracreSnap = await getDoc(terracreRef);
      if (terracreSnap.exists()) {
        setCheckInStatus("This Terracre is already owned!");
        return;
      }

      // Deduct 100 TB and update user
      const newTerrabucks = user.terrabucks - 100;
      await updateDoc(userRef, { terrabucks: newTerrabucks });
      setUser({ ...user, terrabucks: newTerrabucks }); // Update local state

      // Save the new terracre
      await setDoc(terracreRef, {
        lat: userLocation.lat,
        lng: userLocation.lng,
        ownerId: user.uid,
        purchasedAt: new Date().toISOString(),
        size: 800, // 800 sq ft
      });

      setCheckInStatus("Terracre purchased successfully!");
    } catch (error) {
      console.error("Purchase error:", error);
      setCheckInStatus("Failed to purchase Terracre. Try again.");
    }
  };

  return (
    <button className="purchase-button" onClick={handlePurchase}>
      Purchase Terracre (100 TB)
    </button>
  );
};

export default PurchaseButton;
