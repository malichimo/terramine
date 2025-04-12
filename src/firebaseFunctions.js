// src/firebaseFunctions.js
import { auth, googleProvider, db } from "./firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";

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

// ✅ Handle Check-In (with message saving)
export const handleCheckIn = async (user, terracreId, message = "") => {
  const checkInRef = doc(db, "checkins", `${user.uid}-${terracreId}`);
  const checkInSnap = await getDoc(checkInRef);
  const now = new Date();
  const today = now.toISOString().split("T")[0]; // YYYY-MM-DD

  const terracreRef = doc(db, "terracres", terracreId);
  const terracreSnap = await getDoc(terracreRef);
  if (!terracreSnap.exists()) {
    return "This TA does not exist.";
  }

  const terracreData = terracreSnap.data();
  if (terracreData.ownerId === user.uid) {
    return "You cannot check in at your own TA.";
  }

  if (checkInSnap.exists()) {
    const checkInData = checkInSnap.data();
    if (checkInData.date === today) {
      return "You have already checked in at this TA today.";
    }
  }

  // Save check-in with message
  await setDoc(checkInRef, {
    date: today,
    userId: user.uid,
    terracreId,
    message: message.trim(),
    timestamp: new Date().toISOString(),
  });

  // Reward user
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    await updateDoc(userRef, {
      terrabucks: (userData.terrabucks ?? 0) + 1,
    });
  }

  // Reward owner
  const ownerRef = doc(db, "users", terracreData.ownerId);
  const ownerSnap = await getDoc(ownerRef);
  if (ownerSnap.exists()) {
    const ownerData = ownerSnap.data();
    await updateDoc(ownerRef, {
      terrabucks: (ownerData.terrabucks ?? 0) + 1,
    });
  }

  return "✅ Check-in successful! You and the TA owner earned 1 TB.";
};

// ✅ Get Check-In Messages for a specific user (by TA owner)
export const getCheckInMessages = async (ownerId) => {
  const q = query(collection(db, "checkins"), where("terracreOwner", "==", ownerId));
  const querySnapshot = await getDocs(q);

  const messages = [];
  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    if (data.message) {
      const userSnap = await getDoc(doc(db, "users", data.userId));
      const username = userSnap.exists() ? userSnap.data().name || "Unknown" : "Unknown";
      messages.push(`${username}: ${data.message}`);
    }
  }
  return messages;
};