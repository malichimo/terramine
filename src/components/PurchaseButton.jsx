import React from "react";
import { db } from "../firebase";
import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import "./PurchaseButton.css";

const PurchaseButton = ({ user, userLocation, setCheckInStatus, setUser, fetchOwnedTerracres, onPurchase }) => {
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
      const terracreId = `${userLocation.lat}-${userLocation.lng}`;
      const terracreRef = doc(db, "terracres", terracreId);
      const userRef = doc(db, "users", user.uid);

      const terracreSnap = await getDoc(terracreRef);
      if (terracreSnap.exists()) {
        setCheckInStatus("This Terracre is already owned!");
        return;
      }

      const newTerrabucks = user.terrabucks - 100;
      await updateDoc(userRef, { terrabucks: newTerrabucks });
      setUser({ ...user, terrabucks: newTerrabucks });
      console.log("✅ TB updated to:", newTerrabucks);

      const newTerracre = {
        lat: userLocation.lat,
        lng: userLocation.lng,
        ownerId: user.uid,
        purchasedAt: new Date().toISOString(),
        size: 800,
      };
      await setDoc(terracreRef, newTerracre);
      console.log("✅ Terracre saved:", { id: terracreId, ...newTerracre });

      setCheckInStatus("Terracre purchased successfully!");
      setTimeout(async () => {
        await fetchOwnedTerracres();
        console.log("✅ Fetch triggered after delay");
        onPurchase();
      }, 1000); // 1-second delay
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
