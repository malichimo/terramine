import React from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const PurchaseButton = ({ user, userLocation, setCheckInStatus, setUser, fetchOwnedTerracres, onPurchase, gridCenter }) => {
  const handlePurchase = async () => {
    if (!user || !userLocation || !gridCenter) {
      setCheckInStatus("Unable to purchase - missing location or user data.");
      return;
    }

    const terracreId = `${gridCenter.lat.toFixed(4)}_${gridCenter.lng.toFixed(4)}`;
    const terracreRef = doc(db, "terracres", terracreId);
    const userRef = doc(db, "users", user.uid);

    try {
      const terracreSnap = await getDoc(terracreRef);
      if (terracreSnap.exists()) {
        setCheckInStatus("This terracre is already owned!");
        return;
      }

      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      if (userData.terrabucks < 100) {
        setCheckInStatus("Not enough terrabucks! Need 100 TB.");
        return;
      }

      await setDoc(terracreRef, {
        lat: gridCenter.lat,
        lng: gridCenter.lng,
        ownerId: user.uid,
        purchasedAt: new Date().toISOString(),
      });

      await setDoc(userRef, { terrabucks: userData.terrabucks - 100 }, { merge: true });
      setUser((prev) => ({ ...prev, terrabucks: prev.terrabucks - 100 }));
      setCheckInStatus("Terracre purchased successfully!");
      onPurchase(terracreId);
    } catch (error) {
      console.error("Purchase error:", error);
      setCheckInStatus("Failed to purchase terracre.");
    }
  };

  return (
    <button className="purchase-button" onClick={handlePurchase}>
      Purchase Terracre (100 TB)
    </button>
  );
};

export default PurchaseButton;
