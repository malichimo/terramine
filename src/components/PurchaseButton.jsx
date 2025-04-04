
import React from "react";
import "./PurchaseButton.css";

const PurchaseButton = ({ user, userLocation, setUser, onPurchase, gridCenter }) => {
  const handlePurchaseClick = async () => {
    if (!user || !gridCenter) return;

    const messageEl = document.createElement("div");
    messageEl.className = "purchase-message";

    try {
      const result = await onPurchase(gridCenter); // expect this to return string message if successful
      if (result?.message) {
        messageEl.textContent = result.message;
        document.body.appendChild(messageEl);
      }
    } catch (err) {
      console.error("❌ Purchase failed:", err);
      messageEl.textContent = "Purchase failed. Please try again.";
      document.body.appendChild(messageEl);
    }

    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 3000);
  };

  return (
    <button className="purchase-button" onClick={handlePurchaseClick}>
      Purchase TA
    </button>
  );
};

export default PurchaseButton;
