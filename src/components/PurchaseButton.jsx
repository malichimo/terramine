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
    let purchasedAny = false;
    let totalCost = 0;

    console.log("🔹 Attempting to purchase a 5x5 grid centered at:", gridCenter);

    try {
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      if (!userData || userData.terrabucks < 100) {
        setCheckInStatus("Not enough Terrabucks! Need at least 100 TB.");
        return;
      }

      // Define grid spacing
      const deltaLat = 30 / 111000;
      const deltaLng = 30 / (111000 * Math.cos((gridCenter.lat * Math.PI) / 180));

      for (let row = -2; row <= 2; row++) {
        for (let col = -2; col <= 2; col++) {
          const newLat = gridCenter.lat + row * deltaLat;
          const newLng = gridCenter.lng + col * deltaLng;
          const terracreId = `${newLat.toFixed(7)}-${newLng.toFixed(7)}`;
          const terracreRef = doc(terracresRef, terracreId);
          const terracreSnap = await getDoc(terracreRef);

          if (terracreSnap.exists()) {
            console.log(`⚠️ Skipping ${terracreId}, already owned.`);
            continue;
          }

          // Assign a random TA type
          const taType = TA_TYPES[Math.floor(Math.random() * TA_TYPES.length)];
          const now = new Date().toISOString();

          await setDoc(terracreRef, {
            lat: newLat,
            lng: newLng,
            ownerId: user.uid,
            purchasedAt: now,
            lastCollected: now,
            taType: taType.type,
            earningRate: taType.rate, // Earnings per hour in real money
          });

          totalCost += 100;
          purchasedAny = true;
        }
      }

      if (!purchasedAny) {
        setCheckInStatus("⚠️ No new Terracres available to purchase.");
        return;
      }

      await updateDoc(userRef, { terrabucks: userData.terrabucks - totalCost });
      setUser((prev) => ({ ...prev, terrabucks: prev.terrabucks - totalCost }));
      setCheckInStatus(`✅ Purchased a 5x5 area! -${totalCost} TB`);

      onPurchase(gridCenter);
      fetchOwnedTerracres();
    } catch (error) {
      console.error("🔥 Purchase error:", error);
      setCheckInStatus("Failed to purchase Terracres.");
    }
  };

  return (
    <button className="purchase-button" onClick={handlePurchase}>
      Purchase Terracre (100 TB)
    </button>
  );
};

export default PurchaseButton;
