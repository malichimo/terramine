import { auth, googleProvider, db } from "./firebase"; // ✅ Ensure correct import paths
import { signInWithPopup, signOut } from "firebase/auth";
import { collection, addDoc, doc, getDoc, setDoc, query, where, getDocs, Timestamp } from "firebase/firestore";

// ✅ Google Sign-In (Reusable)
export const handleGoogleSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider); // ✅ Use googleProvider here
    const user = result.user;

    // ✅ Check if the user exists in Firestore
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL || "",
        terrabucks: 1000,
        createdAt: Timestamp.now(),
      });
    }

    console.log("User signed in:", user);
    return user; // ✅ Return user object for state updates
  } catch (error) {
    console.error("Sign-in failed:", error);
    return null;
  }
};

// ✅ Sign-Out Function
export const handleSignOut = async () => {
  try {
    await signOut(auth);
    console.log("User signed out");
  } catch (error) {
    console.error("Sign-out failed:", error);
  }
};

// ✅ Check-In Function
export const handleCheckIn = async (user, userLocation) => {
  if (!user) return "Please sign in to check in.";
  if (!userLocation) return "Location not found. Please enable location services.";

  try {
    const terracreId = `terracre_${Math.floor(userLocation.lat * 1000)}_${Math.floor(userLocation.lng * 1000)}`;
    const checkinRef = collection(db, "checkins");
    const terracreRef = doc(db, "terracres", terracreId);

    const terracreSnap = await getDoc(terracreRef);
    if (!terracreSnap.exists()) return "This Terracre is not owned by anyone.";

    const today = new Date().toISOString().split("T")[0];
    const q = query(checkinRef, where("userId", "==", user.uid), where("terracreId", "==", terracreId));
    const querySnapshot = await getDocs(q);

    let alreadyCheckedIn = false;
    querySnapshot.forEach((doc) => {
      if (doc.data().timestamp.toDate().toISOString().split("T")[0] === today) alreadyCheckedIn = true;
    });

    if (alreadyCheckedIn) return "You can only check in once per day per location.";

    await addDoc(checkinRef, {
      userId: user.uid,
      username: user.displayName || user.email,
      terracreId: terracreId,
      timestamp: Timestamp.now(),
      message: "Checked in!",
    });

    return `Check-in successful! You earned 1 TB.`;
  } catch (error) {
    console.error("Check-in failed:", error);
    return "Check-in failed. Try again.";
  }
};
