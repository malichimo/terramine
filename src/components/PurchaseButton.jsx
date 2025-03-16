import React from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const PurchaseButton = ({ user, userLocation, setCheckInStatus, setUser, fetchOwnedTerracres, onPurchase, gridCenter }) => {
const TA_TYPES = [
  { type: "rock", rate: 0.1 },  // Rock Mine: Low earnings
  { type: "coal", rate: 0.5 },  // Coal Mine: Medium earnings
  { type: "gold", rate: 2 },    // Gold Mine: High earnings
  { type: "diamond", rate: 5 }, // Diamond Mine: Highest earnings
];

const handlePurchase = async () => {
  if (!user || !userLocation || !gridCenter) {
    console.log("Purchase failed - Missing data:", { user: !!user, userLocation, gridCenter });
    setCheckInStatus("Unable to purchase - missing location or user data.");
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

    // Calculate grid spacing (30m per cell)
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

        // Create a new TA document in Firestore
        await setDoc(terracreRef, {
          lat: newLat,
          lng: newLng,
          ownerId: user.uid,
          purchasedAt: new Date().toISOString(),
          lastCollected: new Date().toISOString(),
          taType: taType.type,   // "rock", "coal", "gold", "diamond"
          earningRate: taType.rate, // TB earned per minute
        });

        totalCost += 100;
        purchasedAny = true;
      }
    }

    if (!purchasedAny) {
      setCheckInStatus("⚠️ No new Terracres available to purchase.");
      return;
    }

    // Deduct Terrabucks from user
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
