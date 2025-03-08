import { db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

function PurchaseButton({ user, userLocation, setCheckInStatus, setUser, fetchOwnedTerracres, onPurchase }) {
  const handlePurchase = async () => {
    if (!user || !userLocation) {
      setCheckInStatus("Please sign in and allow location access.");
      return;
    }

    const terracreId = `${userLocation.lat.toFixed(6)}_${userLocation.lng.toFixed(6)}`;
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

      await setDoc(terracreRef, {
        lat: userLocation.lat,
        lng: userLocation.lng,
        ownerId: user.uid,
        purchasedAt: new Date().toISOString(),
      });
      console.log("Terracre written:", terracreId);

      const userRef = doc(db, "users", user.uid);
      const updatedTerrabucks = (user.terrabucks || 1000) - 100;
      await setDoc(userRef, { terrabucks: updatedTerrabucks }, { merge: true });
      setUser((prev) => ({ ...prev, terrabucks: updatedTerrabucks }));

      setCheckInStatus("Terracre purchased successfully!");
      onPurchase();
      fetchOwnedTerracres();
    } catch (error) {
      console.error("Purchase error:", error);
      setCheckInStatus("Failed to purchase terracre.");
    }
  };

  return <button onClick={handlePurchase}>Purchase Terracre</button>;
}

export default PurchaseButton;
