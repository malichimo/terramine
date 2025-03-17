import React from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, collection } from "firebase/firestore";

// Define TA types with different earning rates
const TA_TYPES = [
  { type: "Rock Mine", rate: 0.01 },  // $0.01 per hour
  { type: "Coal Mine", rate: 0.05 },  // $0.05 per hour
  { type: "Gold Mine", rate: 0.15 },  // $0.15 per hour
  { type: "Diamond Mine", rate: 0.50 } // $0.50 per hour
];

const PurchaseButton = ({ user, gridCenter, setCheckInStatus, setUser, fetchOwnedTerracres, onPurchase }) => {
  const handlePurchase = async () => {
    if (!user || !gridCenter) {
      console.log("Purchase failed - Missing user or location data.");
      setCheckInStatus("Unable to purchase - missing data.");
      return;
    }

    const terracresRef = collection(db, "terracres");
    const userRef = doc(db, "users", user.uid);
    let totalCost = 100; // Cost for one TA

    console.log("🔹 Attempting to purchase a TA at:", gridCenter);

    try {
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      if (!userData || userData.terrabucks < totalCost) {
        setCheckInStatus("Not enough Terrabucks! Need at least 100 TB.");
        return;
      }

      const terracreId = `${gridCenter.lat.toFixed(7)}-${gridCenter.lng.toFixed(7)}`;
      const terracreRef = doc(terracresRef, terracreId);
      const terracreSnap = await getDoc(terracreRef);

      if (terracreSnap.exists()) {
        console.log(`⚠️ Skipping ${terracreId}, already owned.`);
        setCheckInStatus("⚠️ This Terracre is already owned.");
        return;
      }

      // Assign a random TA type
      const taType = TA_TYPES[Math.floor(Math.random() * TA_TYPES.length)];
      const now = new Date().toISOString();

      await setDoc(terracreRef, {
        lat: gridCenter.lat,
        lng: gridCenter.lng,
        ownerId: user.uid,
        purchasedAt: now,
        lastCollected: now,
        taType: taType.type,
        earningRate: taType.rate, // Earnings per hour in real money
      });

      await updateDoc(userRef, { terrabucks: userData.terrabucks - totalCost });
      setUser((prev) => ({ ...prev, terrabucks: prev.terrabucks - totalCost }));
      setCheckInStatus(`✅ Purchased a Terracre! -${totalCost} TB`);

      onPurchase(gridCenter);
      fetchOwnedTerracres();
    } catch (error) {
      console.error("🔥 Purchase error:", error);
      setCheckInStatus("Failed to purchase Terracre.");
    }
  };

  return (
    <button className="purchase-button" onClick={handlePurchase}>
      Purchase Terracre (100 TB)
    </button>
  );
};

export default PurchaseButton;
