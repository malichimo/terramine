import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

function MainPage({ user }) {
  const [terraBucks, setTerraBucks] = useState(0);
  const [isNewUser, setIsNewUser] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Fake logic to simulate check – replace with Firestore lookup if needed
    const hasData = user?.terrabucks !== undefined;

    if (hasData) {
      setTerraBucks(user.terrabucks);
    } else {
      setIsNewUser(true);
    }
  }, [user]);

  useEffect(() => {
    if (isNewUser) {
      navigate("/setup");
    }
  }, [isNewUser, navigate]);

  return (
    <div className="main-page">
      <h2>Welcome, {user?.nickname || user?.displayName || "User"}</h2>
      <p>You have {terraBucks} TB available.</p>
      <div className="map-placeholder">[Interactive Map Placeholder]</div>
    </div>
  );
}

export default MainPage;
