import React, { useEffect, useState } from "react";
import "../App.css";

function MainPage({ user }) {
  const [terraBucks, setTerraBucks] = useState(0);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    // Placeholder logic to simulate checking if user exists
    // Replace with real Firebase logic later
    const simulateCheck = async () => {
      const existingUser = user?.uid && user?.terrabucks !== undefined;
      if (existingUser) {
        setTerraBucks(user.terrabucks);
        setIsNewUser(false);
      } else {
        setIsNewUser(true);
      }
    };
    simulateCheck();
  }, [user]);

  if (isNewUser) {
    return (
      <div className="main-page">
        <h2>Welcome, new user!</h2>
        <p>Redirecting to setup page...</p>
        {/* Add your routing logic here later */}
      </div>
    );
  }

  return (
    <div className="main-page">
      <h2>Welcome, {user?.nickname || user?.displayName || "User"}</h2>
      <p>You have {terraBucks} TB available.</p>
      <div
        style={{
          width: "80%",
          height: "400px",
          backgroundColor: "#e0e0e0",
          border: "2px dashed #ccc",
          margin: "20px auto",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "20px",
          color: "#555",
        }}
      >
        [Interactive Map Placeholder]
      </div>
    </div>
  );
}

export default MainPage;
