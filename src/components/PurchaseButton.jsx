
import React, { useState, useEffect } from "react";
import "./PurchaseButton.css";

const PurchaseButton = ({ user, userLocation, setUser, onPurchase, gridCenter }) => {
  const [localMessage, setLocalMessage] = useState("");

  useEffect(() => {
    if (localMessage) {
      const timer = setTimeout(() => setLocalMessage(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [localMessage]);

  const handlePurchaseClick = async () => {
    if (!user || !gridCenter) return;

    try {
      const result = await onPurchase(gridCenter);
      if (result?.message) {
        setLocalMessage(result.message);
      }
    } catch (err) {
      console.error("❌ Purchase failed:", err);
      setLocalMessage("Purchase failed. Please try again.");
    }
  };

  return (
    <>
      <button className="purchase-button" onClick={handlePurchaseClick}>
        Purchase TA
      </button>
      {localMessage && <div className="purchase-message">{localMessage}</div>}
    </>
  );
};

export default PurchaseButton;
