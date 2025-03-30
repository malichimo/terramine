import React from "react";
import "./PurchaseButton.css";

const PurchaseButton = ({ user, userLocation, gridCenter, onPurchase, setCheckInStatus }) => {
  const handleClick = async () => {
    if (!user || !gridCenter) return;

    const terracreId = `${gridCenter.lat.toFixed(7)}-${gridCenter.lng.toFixed(7)}`;
    const terracreRef = doc(db, "terracres", terracreId);
    const terracreSnap = await getDoc(terracreRef);

    if (terracreSnap.exists()) {
      const ownerId = terracreSnap.data().ownerId;
      if (ownerId === user.uid) {
        setCheckInStatus("You already own this Terracre.");
      } else {
        setCheckInStatus("This Terracre is already owned by someone else.");
      }
      return;
    }

    onPurchase(gridCenter);
  };

  return (
    <button className="purchase-button" onClick={handleClick}>
      Purchase Terracre
    </button>
  );
};

export default PurchaseButton;