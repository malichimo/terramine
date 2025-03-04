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
            terrabucks: 0, // ✅ Start with 0 TB
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

      const today = new Date().toISOString().split("T")[0];
      const q = query(checkinRef, where("userId", "==", user.uid), where("terracreId", "==", terracreId));
      const querySnapshot = await getDocs(q);

      let alreadyCheckedIn = false;
      querySnapshot.forEach((doc) => {
        const checkinDate = doc.data().timestamp.toDate().split("T")[0];
        if (checkinDate === today) alreadyCheckedIn = true;
      });

      if (alreadyCheckedIn) {
        setCheckInStatus("You can only check in once per day per location.");
        return;
      }

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

      <div>
        {user ? (
          <div>
            <img src={user.photoURL} alt="Profile" style={{ width: "50px", borderRadius: "50%" }} />
            <p><strong>Name:</strong> {user.displayName}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Terrabucks:</strong> {user?.terrabucks ?? "Loading..."}</p>
            <button onClick={handleSignOut}>Sign Out</button>
          </div>
        ) : (
          <button onClick={handleGoogleSignIn}>Sign in with Google</button>
        )}
      </div>

      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap mapContainerStyle={{ width: "100%", height: "500px" }} center={userLocation || defaultCenter} zoom={15}>
          {userLocation && <Marker position={userLocation} />}
        </GoogleMap>
      </LoadScript>

      <button onClick={handleCheckIn} disabled={!user} style={{ marginTop: "10px", padding: "10px", fontSize: "16px", backgroundColor: user ? "#28a745" : "#ccc" }}>
        {user ? "Tap to Check-In" : "Sign in to Check-In"}
      </button>

      {checkInStatus && <p>{checkInStatus}</p>}

      <div>
        <h2>Scan QR Code to Check-In</h2>
        <QrScanner delay={300} onError={handleError} onScan={handleScan} style={{ width: "100%" }} />
        {qrResult && <p>Scanned Code: {qrResult}</p>}
      </div>
    </div>
  ); // ✅ Ensure JSX is properly returned and closed
}

export default App;


