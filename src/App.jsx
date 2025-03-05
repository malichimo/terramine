import React, { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import Login from "./components/Login"; // ✅ Import Login
import CheckInButton from "./components/CheckInButton"; // ✅ Import Check-In Button

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us"; // 🔴 REPLACE WITH YOUR API KEY

function App() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // ✅ Track user authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth State Changed:", currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, { uid: currentUser.uid, terrabucks: 1000 });
          setUser({ ...currentUser, terrabucks: 1000 });
        } else {
          setUser({ ...currentUser, terrabucks: userSnap.data()?.terrabucks || 1000 });
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // ✅ If user is not signed in, show Login screen
  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  return (
    <div>
      <h1>TerraMine</h1>
      <CheckInButton user={user} userLocation={userLocation} />
    </div>
  );
}

export default App;
