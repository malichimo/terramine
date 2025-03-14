// src/firebaseFunctions.js
import { auth, googleProvider, db } from "./firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { collection, addDoc, doc, getDoc, setDoc, query, where, getDocs, Timestamp, updateDoc } from "firebase/firestore";

// ✅ Google Sign-In
export const handleGoogleSignIn = async () => {
  try {
    googleProvider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

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
    return user;
  } catch (error) {
    console.error("Sign-in failed:", error);
    return null;
  }
};

// ✅ Sign-Out
export const handleSignOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign-out failed:", error);
  }
};

// ✅ Handle Check-In (Updated with Debugging)
export const handleCheckIn = async (user, terracreId) => {
  if (!user) return "Please sign in to check in.";
  console.log("Attempting check-in for user:", user.uid, "at terracreId:", terracreId);

  try {
    const terracreRef = doc(db, "terracres", terracreId);
    const terracreSnap = await getDoc(terracreRef);
    console.log("Terracre data:", terracreSnap.data());
    if (!terracreSnap.exists()) return "This Terracre is unowned.";

    const ownerId = terracreSnap.data().ownerID;
    if (ownerId === user.uid) return "You can’t check into your own Terracre!";

    const startOfDay = new Date().setHours(0, 0, 0, 0);
    const q = query(
      collection(db, "checkins"),
      where("userId", "==", user.uid),
      where("terracreId", "==", terracreId),
      where("timestamp", ">=", startOfDay)
    );
    const querySnapshot = await getDocs(q);
    console.log("Check-in query results:", querySnapshot.docs.map(doc => doc.data()));
    if (!querySnapshot.empty) return "You’ve already checked in here today!";

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const currentTB = userSnap.data().terrabucks || 0;
    await updateDoc(userRef, { terrabucks: currentTB + 1 });

    await addDoc(collection(db, "checkins"), {
      userId: user.uid,
      username: user.displayName || user.email,
      terracreId,
      timestamp: Timestamp.now(),
      message: "Checked in!",
    });

    return "Check-in successful! You earned 1 TB.";
  } catch (error) {
    console.error("Check-in failed:", error);
    return "Check-in failed. Try again.";
  }
};
