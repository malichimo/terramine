import React from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const PurchaseButton = ({ user, userLocation, setCheckInStatus, setUser, fetchOwnedTerracres, onPurchase, gridCenter }) => {
  const snapToGridCenter = (lat, lng) => {
    const metersPerDegreeLat = 111000;
    const metersPerDegreeLng = metersPerDegreeLat * Math.cos((lat * Math.PI) / 180);
    const deltaLat = 30 / metersPerDegreeLat; // TERRACRE_SIZE_METERS = 30
    const deltaLng = 30 / metersPerDegreeLng;
    const snappedLat = Math.round(lat / deltaLat) * deltaLat + deltaLat / 2;
    const snappedLng = Math.round(lng / deltaLng) * deltaLng + deltaLng / 2;
    return { lat: snappedLat, lng: snappedLng };
  };

  const handlePurchase = async () => {
    if (!user || !userLocation || !gridCenter) {
      setCheckInStatus("Unable to purchase - missing location or user data.");
      return;
    }

    const snappedPosition = snapToGridCenter(userLocation.lat, userLocation.lng);
    const terracreId = `${snappedPosition.lat.toFixed(4)}_${snappedPosition.lng.toFixed(4)}`;
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
        lat: snappedPosition.lat,
        lng: snappedPosition.lng,
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
