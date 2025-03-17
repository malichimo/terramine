// src/firebaseFunctions.js
import { auth, googleProvider, db } from "./firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore";

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
  const checkInRef = doc(db, "checkins", `${user.uid}-${terracreId}`);
  const checkInSnap = await getDoc(checkInRef);
  const now = new Date();
  const today = now.toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format

  const terracreRef = doc(db, "terracres", terracreId);
  const terracreSnap = await getDoc(terracreRef);
  if (!terracreSnap.exists()) {
    return "This Terracre does not exist.";
  }

  const terracreData = terracreSnap.data();
  if (terracreData.ownerId === user.uid) {
    return "You cannot check in at your own Terracre.";
  }

  if (checkInSnap.exists()) {
    const checkInData = checkInSnap.data();
    if (checkInData.date === today) {
      return "You have already checked in at this Terracre today.";
    }
  }

  // Update check-in record
  await setDoc(checkInRef, { date: today });

  // Update visitor's TerraBucks
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    await updateDoc(userRef, { terrabucks: (userData.terrabucks ?? 0) + 1 });
  }

  // Update owner's TerraBucks
  const ownerRef = doc(db, "users", terracreData.ownerId);
  const ownerSnap = await getDoc(ownerRef);
  if (ownerSnap.exists()) {
    const ownerData = ownerSnap.data();
    await updateDoc(ownerRef, { terrabucks: (ownerData.terrabucks ?? 0) + 1 });
  }

  return "Check-in successful! You and the owner earned 1 TB each.";
};
