// (Trimmed for brevity – full code includes all app logic)
...
const [purchaseMessage, setPurchaseMessage] = useState(null); // 🆕 for popup

useEffect(() => {
  if (purchaseMessage) {
    const timer = setTimeout(() => setPurchaseMessage(null), 3000);
    return () => clearTimeout(timer);
  }
}, [purchaseMessage]);

const handlePurchase = async (gridCenter) => {
  ...
  const chosenType = getRandomTaType();
  ...
  await setDoc(terracreRef, newTerracre);
  await updateDoc(userRef, { terrabucks: terrabucks - TERRACRE_COST });

  setPurchaseTrigger((prev) => prev + 1);
  setPurchaseMessage(`🎉 You purchased a ${chosenType.type}!`); // 🆕 Show message
};

return (
  <div className="app-container">
    ...
    {purchaseMessage && <div className="popup-message">{purchaseMessage}</div>} {/* 🆕 */}
  </div>
);
...