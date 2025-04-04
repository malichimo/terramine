import React from "react";
import "./PurchaseButton.css";

const PurchaseButton = ({ user, userLocation, onPurchase, gridCenter }) => {
  return (
    <button
      className="purchase-button"
      onClick={() => {
        if (user && userLocation && gridCenter) {
          onPurchase(gridCenter);
        }
      }}
    >
      Purchase Terracre
    </button>
  );
};

export default PurchaseButton;