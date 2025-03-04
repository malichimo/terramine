import React, { useState, useEffect } from "react";
import { getAuth, signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, query, where, getDocs, Timestamp, doc, setDoc, getDoc } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import QrScanner from "react-qr-scanner";
import { db } from "./firebase"; // Ensure `firebase.js` is correctly configured

// Initialize Firebase Auth
const auth = getAuth();

const handleGoogleSignIn = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user profile exists in Firestore
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL || "",
        createdAt: Timestamp.now(),
        terrabucks: 0,
      });
    }

    console.log("User signed in:", user);
  } catch (error) {
    console.error("Error signing in:", error.message);
  }
};

const handleSignOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

const defaultCenter = { lat: 37.7749, lng: -122.4194 }; // Default: San Francisco
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY"; // Replace with actual API key

function App() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [checkInStatus, setCheckInStatus] = useState("");
  const [qrResult, setQrResult] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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

      // Check if user already checked in today
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

      setCheckInStatus(`Check-in successful! Welcome, ${user.displayName || user.email}. You earned 1 TB.`);
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

      {/* Google Sign-In */}
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

      {/* Google Maps */}
      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap mapContainerStyle={{ width: "100%", height: "500px" }} center={userLocation || defaultCenter} zoom={15}>
          {userLocation && <Marker position={userLocation} />}
        </GoogleMap>
      </LoadScript>

      {/* Check-In Button */}
      <button 
        onClick={handleCheckIn} 
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
        <QrScanner delay={300} onError={handleError} onScan={handleScan} style={{ width: "100%" }} />
        {qrResult && <p>Scanned Code: {qrResult}</p>}
      </div>

      {/* Show Signed-In User */}
      {user && (
        <div>
          <img src={user.photoURL} alt="Profile" style={{ width: "50px", borderRadius: "50%" }} />
          <p>Welcome, {user.displayName || user.email}</p>
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      )}
    </div>
  );
}

export default App;

