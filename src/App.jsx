import React, { useState, useEffect } from "react";
import { auth, googleProvider } from "./firebase"; // ✅ Use correct Firebase imports
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { db } from "./firebase"; // ✅ Use Firestore from `firebase.js`
import { collection, addDoc, query, where, getDocs, Timestamp, doc, setDoc, getDoc } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import QrScanner from "react-qr-scanner";

const defaultCenter = { lat: 37.7749, lng: -122.4194 }; // Default: San Francisco
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us"; // ✅ Replace with actual API key

function App() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [checkInStatus, setCheckInStatus] = useState("");
  const [qrResult, setQrResult] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: currentUser.uid,
            name: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL || "",
            createdAt: Timestamp.now(),
            terrabucks: 1000, // ✅ New users start with 1,000 TB
          });
        } else {
          const userData = userSnap.data();
          setUser({ ...currentUser, terrabucks: userData.terrabucks });
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error retrieving location:", error);
          setUserLocation(defaultCenter);
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
      setUserLocation(defaultCenter);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleBuyTerracre = async () => {
    if (!user) {
      setCheckInStatus("Please sign in to purchase a Terracre.");
      return;
    }

    if (!userLocation) {
      setCheckInStatus("Location not found. Please enable location services.");
      return;
    }

    try {
      const terracreId = `terracre_${Math.floor(userLocation.lat * 1000)}_${Math.floor(userLocation.lng * 1000)}`;
      const terracreRef = doc(db, "terracres", terracreId);
      const userRef = doc(db, "users", user.uid);

      // ✅ Check if the Terracre is already owned
      const terracreSnap = await getDoc(terracreRef);
      if (terracreSnap.exists()) {
        setCheckInStatus("This Terracre is already owned.");
        return;
      }

      // ✅ Get user's current Terrabucks balance
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setCheckInStatus("User profile not found.");
        return;
      }
      const userData = userSnap.data();
      const currentTB = userData.terrabucks || 0;

      if (currentTB < 100) {
        setCheckInStatus("Insufficient Terrabucks. You need 100 TB to purchase a Terracre.");
        return;
      }

      // ✅ Deduct 100 TB & Save Terracre Ownership
      await setDoc(terracreRef, { ownerId: user.uid, price: 100 });
      await setDoc(userRef, { terrabucks: currentTB - 100 }, { merge: true });

      setUser({ ...user, terrabucks: currentTB - 100 });

      setCheckInStatus("Terracre purchased successfully! You are now the owner.");
    } catch (error) {
      console.error("Terracre purchase failed:", error);
      setCheckInStatus("Terracre purchase failed. Try again.");
    }
  };

  return (
    <div>
      <h1>TerraMine Check-In</h1>

      {/* Buy Terracre Button */}
      <button
        onClick={handleBuyTerracre}
        disabled={!user}
        style={{ marginTop: "10px", padding: "10px", fontSize: "16px", backgroundColor: user ? "#007bff" : "#ccc" }}
      >
        {user ? "Buy This Terracre (100 TB)" : "Sign in to Buy"}
      </button>

      {/* Show Signed-In User & Terrabucks Balance */}
      {user && (
        <div>
          <img src={user.photoURL} alt="Profile" style={{ width: "50px", borderRadius: "50%" }} />
          <p><strong>Name:</strong> {user.displayName}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Terrabucks:</strong> {user?.terrabucks ?? "Loading..."}</p>
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      )}

      {/* Google Maps */}
      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap mapContainerStyle={{ width: "100%", height: "500px" }} center={userLocation || defaultCenter} zoom={15}>
          {userLocation && <Marker position={userLocation} />}
        </GoogleMap>
      </LoadScript>

      {/* Check-In Button */}
      <button
        onClick={() => console.log("Check-in logic here")} // TODO: Implement check-in
        disabled={!user}
        style={{ marginTop: "10px", padding: "10px", fontSize: "16px", backgroundColor: user ? "#28a745" : "#ccc" }}
      >
        {user ? "Tap to Check-In" : "Sign in to Check-In"}
      </button>

      {/* Display Check-In Status */}
      {checkInStatus && <p>{checkInStatus}</p>}

      {/* QR Code Scanner */}
      <div>
        <h2>Scan QR Code to Check-In</h2>
        <QrScanner delay={300} onError={(error) => console.error(error)} onScan={(data) => console.log(data)} style={{ width: "100%" }} />
        {qrResult && <p>Scanned Code: {qrResult}</p>}
      </div>
    </div>
  );
}

export default App;

