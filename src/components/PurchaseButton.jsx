import { db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

function PurchaseButton({ user, userLocation, setCheckInStatus, setUser, fetchOwnedTerracres, onPurchase }) {
  const handlePurchase = async () => {
    if (!user || !userLocation) {
      setCheckInStatus("Please sign in and allow location access.");
      return;
    }

    const terracreId = `${userLocation.lat.toFixed(4)}_${userLocation.lng.toFixed(4)}`; // 4 decimals for ~30m grid
    const terracreRef = doc(db, "terracres", terracreId);

    try {
      const terracreSnap = await getDoc(terracreRef);
      console.log("Terracre check:", terracreId, "Exists:", terracreSnap.exists(), "Data:", terracreSnap.data());
      if (terracreSnap.exists()) {
        setCheckInStatus("This terracre is already owned!");
        return;
      }

      if ((user.terrabucks || 1000) < 100) {
        setCheckInStatus("Not enough TB to purchase!");
        return;
      }

      const terracreData = {
        lat: Number(userLocation.lat.toFixed(4)),
        lng: Number(userLocation.lng.toFixed(4)),
        ownerId: user.uid,
        purchasedAt: new Date().toISOString(),
      };
      await setDoc(terracreRef, terracreData);
      console.log("Terracre written:", terracreId, terracreData);
      const postWriteSnap = await getDoc(terracreRef);
      console.log("Post-write check:", terracreId, "Exists:", postWriteSnap.exists(), "Data:", postWriteSnap.data());

      const userRef = doc(db, "users", user.uid);
      const updatedTerrabucks = (user.terrabucks || 1000) - 100;
      await setDoc(userRef, { terrabucks: updatedTerrabucks }, { merge: true });
      setUser((prev) => ({ ...prev, terrabucks: updatedTerrabucks }));

      setCheckInStatus("Terracre purchased successfully!");
      onPurchase(terracreId);
      fetchOwnedTerracres();
    } catch (error) {
      console.error("Purchase error:", error);
      setCheckInStatus("Failed to purchase terracre.");
    }
  };

  return <button className="purchase-button" onClick={handlePurchase}>Purchase Terracre</button>;
}

export default PurchaseButton;
