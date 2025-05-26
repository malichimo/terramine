import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import "../App.css";

function MainPage({ user }) {
  const [terraBucks, setTerraBucks] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) return;
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setTerraBucks(data.terrabucks || 0);
      }
    };

    fetchUserData();
  }, [user]);

  return (
    <div className="main-page">
      <h2>Welcome, {user?.nickname || user?.displayName || "User"}</h2>
      <p>You have {terraBucks} TB available.</p>
      <div className="map-placeholder">[Interactive Map Placeholder]</div>
    </div>
  );
}

export default MainPage;
