import React, { useState, useEffect } from "react";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { db } from "./firebase";
import { collection, getDocs, doc, getDoc, setDoc, query, where, addDoc, Timestamp } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import QrScanner from "react-qr-scanner"; 

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us"; // Replace with actual API key

function App() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [ownedTerracres, setOwnedTerracres] = useState([]);
  const [checkInStatus, setCheckInStatus] = useState("");
  const [qrResult, setQrResult] = useState("");

  // Track user authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, { uid: currentUser.uid, terrabucks: 1000 });
        } else {
          setUser({ ...currentUser, terrabucks: userSnap.data().terrabucks });
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Get user's location
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
      setUserLocation(defaultCenter);
    }
  }, []);

  // Fetch owned Terracres from Firestore
  useEffect(() => {
    const fetchOwnedTerracres = async () => {
      const terracresRef = collection(db, "terracres");
      const querySnapshot = await getDocs(terracresRef);
      const properties = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOwnedTerracres(properties);
    };

    fetchOwnedTerracres();
  }, []);

  // ✅ Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  // ✅ Handle Sign-Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // ✅ Handle Check-In
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
      const terracreRef = doc(db, "terracres", terracreId);

      // ✅ Check ownership of the Terracre
      const terracreSnap = await getDoc(terracreRef);
      if (terracreSnap.exists()) {
        const terracreData = terracreSnap.data();
        if (terracreData.ownerId === user.uid) {
          setCheckInStatus("You cannot check into your own property.");
          return;
        }
      } else {
        setCheckInStatus("This Terracre is not owned by anyone.");
        return;
      }

      // ✅ Check if the user already checked in today
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

      // ✅ Save check-in to Firestore
      await addDoc(checkinRef, {
        userId: user.uid,
        username: user.displayName || user.email,
        terracreId: terracreId,
        timestamp: Timestamp.now(),
        message: "Checked in!",
      });

      setCheckInStatus(`Check-in successful! You earned 1 TB.`);
    } catch (error) {
      console.error("Check-in failed:", error);
      setCheckInStatus("Check-in failed. Try again.");
    }
  };

  // ✅ Handle QR Scan Check-In
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

      {/* Sign-In Button */}
      {!user && (
        <button onClick={handleGoogleSignIn} style={{ padding: "10px", fontSize: "16px", backgroundColor: "#4285F4", color: "white", border: "none", cursor: "pointer" }}>
          Sign in with Google
        </button>
      )}

      {/* Google Maps */}
      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap mapContainerStyle={{ width: "100%", height: "500px" }} center={userLocation || defaultCenter} zoom={15}>
          {userLocation && <Marker position={userLocation} label="You" />}

          {/* Owned Properties Markers */}
          {ownedTerracres.map((terracre) => (
            <Marker
              key={terracre.id}
              position={{ lat: terracre.lat, lng: terracre.lng }}
              label="Owned"
              icon={{ url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png" }}
            />
          ))}
        </GoogleMap>
      </LoadScript>

      {/* Check-In Button */}
      {user && (
        <button onClick={handleCheckIn} style={{ marginTop: "10px", padding: "10px", fontSize: "16px", backgroundColor: "#28a745", color: "white" }}>
          Tap to Check-In
        </button>
      )}

      {checkInStatus && <p>{checkInStatus}</p>}

      {/* QR Code Scanner */}
      <div>
        <h2>Scan QR Code to Check-In</h2>
        <QrScanner delay={300} onError={handleError} onScan={handleScan} style={{ width: "100%" }} />
        {qrResult && <p>Scanned Code: {qrResult}</p>}
      </div>
    </div>
  );
}

export default App;

