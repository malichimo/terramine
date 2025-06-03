import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth } from "../firebase"; // Ensure this import is present
import { db } from "../firebase";
import SignOutButton from "../components/SignOutButton";
import "../App.css";

function MainPage({ user }) {
  const [terraBucks, setTerraBucks] = useState(0);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) return;
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserData(data);
        setTerraBucks(data.terrabucks || 0);
      }
    };

    fetchUserData();
  }, [user]);

  const handleSignOut = async () => {
    console.log("🔒 Attempting to sign out...");
    try {
      if (!auth) {
        throw new Error("Firebase auth object is undefined");
      }
      await auth.signOut();
      console.log("👤 User signed out successfully");
    } catch (error) {
      console.error("🔥 Error signing out:", error.message);
    }
  };

  return (
    <div className="main-page">
      <SignOutButton onSignOut={handleSignOut} />
      <h2>Welcome, {userData?.nickname || user?.displayName || "User"}</h2>
      <p>You have {terraBucks} TB available.</p>
      <div className="map-placeholder">[Interactive Map Placeholder]</div>
    </div>
  );
}

export default MainPage;