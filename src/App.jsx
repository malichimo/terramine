import { auth, googleProvider, signInWithPopup, signOut } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import React, { useState, useEffect } from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import QrScanner from "react-qr-scanner";
import { collection, addDoc, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

const [user, setUser] = useState(null);

// Track user authentication state
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
  });
  return () => unsubscribe();
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

const handleCheckIn = async () => {
  if (!userLocation) {
    setCheckInStatus("Location not found. Please enable location services.");
    return;
  }

  try {
    const terracreId = `terracre_${Math.floor(userLocation.lat * 1000)}_${Math.floor(userLocation.lng * 1000)}`;
    const checkinRef = collection(db, "checkins");

    // Check if the user already checked in today
    const today = new Date().toISOString().split("T")[0];
    const q = query(checkinRef, where("userId", "==", "USER_ID"), where("terracreId", "==", terracreId));
    const querySnapshot = await getDocs(q);

    let alreadyCheckedIn = false;
    querySnapshot.forEach((doc) => {
      const checkinDate = doc.data().timestamp.toDate().toISOString().split("T")[0];
      if (checkinDate === today) alreadyCheckedIn = true;
    });

    if (alreadyCheckedIn) {
      setCheckInStatus("You can only check in once per day per location.");
      return;
    }

    // Save check-in to Firestore
    await addDoc(checkinRef, {
      userId: "USER_ID",
      terracreId: terracreId,
      timestamp: Timestamp.now(),
      message: "Checked in!",
    });

    setCheckInStatus("Check-in successful! You earned 1 TB.");
  } catch (error) {
    console.error("Check-in failed:", error);
    setCheckInStatus("Check-in failed. Try again.");
  }
};


const containerStyle = {
  width: "100%",
  height: "500px",
};

const defaultCenter = { lat: 37.7749, lng: -122.4194 }; // Default: San Francisco
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us"; // Replace with actual API key

function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [checkInStatus, setCheckInStatus] = useState("");
  const [qrResult, setQrResult] = useState("");

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

const handleCheckIn = async () => {
  if (!user) {
    setCheckInStatus("Please sign in to check in.");
    return;
  }

  if (!userLocation) {
    setCheckInStatus("Location not found. Please enable location services.");
    return;
  }

  try {
    const terracreId = `terracre_${Math.floor(userLocation.lat * 1000)}_${Math.floor(userLocation.lng * 1000)}`;
    const checkinRef = collection(db, "checkins");

    // Check if the user already checked in today
    const today = new Date().toISOString().split("T")[0];
    const q = query(checkinRef, where("userId", "==", user.uid), where("terracreId", "==", terracreId));
    const querySnapshot = await getDocs(q);

    let alreadyCheckedIn = false;
    querySnapshot.forEach((doc) => {
      const checkinDate = doc.data().timestamp.toDate().toISOString().split("T")[0];
      if (checkinDate === today) alreadyCheckedIn = true;
    });

    if (alreadyCheckedIn) {
      setCheckInStatus("You can only check in once per day per location.");
      return;
    }

    // Save check-in to Firestore
    await addDoc(checkinRef, {
      userId: user.uid,
      username: user.displayName || user.email,
      terracreId: terracreId,
      timestamp: Timestamp.now(),
      message: "Checked in!",
    });

    setCheckInStatus("Check-in successful! You earned 1 TB.");
  } catch (error) {
    console.error("Check-in failed:", error);
    setCheckInStatus("Check-in failed. Try again.");
  }
};

  const handleScan = (data) => {
    if (data) {
      setQrResult(data.text);
      fetch("https://your-backend.com/api/qr-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: data.text }),
      })
        .then((response) => response.json())
        .then((data) => {
          setCheckInStatus(data.message || "QR Check-in successful!");
        })
        .catch((error) => {
          console.error("QR Check-in failed:", error);
          setCheckInStatus("QR Check-in failed. Try again.");
        });
    }
  };

  const handleError = (error) => {
    console.error(error);
  };

  return (
    <div>
      <h1>TerraMine Check-In</h1>
      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap mapContainerStyle={containerStyle} center={userLocation || defaultCenter} zoom={15}>
          {userLocation && <Marker position={userLocation} />}
        </GoogleMap>
      </LoadScript>

      {/* Check-In Button */}
      <button onClick={handleCheckIn} style={{ marginTop: "10px", padding: "10px", fontSize: "16px" }}>
        Tap to Check-In
      </button>

      {/* Display Check-In Status */}
      {checkInStatus && <p>{checkInStatus}</p>}

      {/* QR Code Scanner */}
      <div>
        <h2>Scan QR Code to Check-In</h2>
        <QrScanner delay={300} onError={handleError} onScan={handleScan} style={{ width: "100%" }} />
        {qrResult && <p>Scanned Code: {qrResult}</p>}
      </div>
      <div>
        {user ? (
        <div>
          <p>Welcome, {user.displayName || user.email}</p>
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      ) : (
        <button onClick={handleGoogleSignIn}>Sign in with Google</button>
      )}
</div>
    </div>
  );
}

export default App;

