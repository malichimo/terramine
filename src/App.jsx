import React, { useState, useEffect } from "react";
import { auth } from "./firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { db } from "./firebase";
import { collection, getDocs, doc, getDoc, setDoc, query, where, addDoc, Timestamp } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import QrScanner from "react-qr-scanner";
import Login from "./Login.jsx"; // Import Login Screen

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us"; // Replace with actual API key

function App() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [ownedTerracres, setOwnedTerracres] = useState([]);
  const [checkInStatus, setCheckInStatus] = useState("");
  const [qrResult, setQrResult] = useState("");
  const [showQrScanner, setShowQrScanner] = useState(false); // Toggle QR Scanner

  // ✅ Track user authentication
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

  // ✅ If user is not signed in, show Login screen
  if (!user) {
    return <Login onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  // ✅ Get user's location
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

  // ✅ Fetch owned properties from Firestore
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

  // ✅ Handle Manual Check-In
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

      // ✅ Check if the Terracre is owned
      const terracreSnap = await getDoc(terracreRef);
      if (!terracreSnap.exists()) {
        setCheckInStatus("This Terracre is not owned by anyone.");
        return;
      }

      // ✅ Check if user already checked in today
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

  // ✅ Toggle QR Scanner
  const toggleQrScanner = () => {
    setShowQrScanner((prev) => !prev);
  };

  // ✅ Handle QR Code Scan
  const handleScan = (data) => {
    if (data) {
      setQrResult(data.text);
      setCheckInStatus(`QR Check-in successful! Scanned: ${data.text}`);
    }
  };

  return (
    <div>
      <h1>TerraMine</h1>

      {/* Show User Profile */}
      <div>
        <img src={user.photoURL} alt="Profile" style={{ width: "50px", borderRadius: "50%" }} />
        <p><strong>Name:</strong> {user.displayName}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Terrabucks:</strong> {user.terrabucks ?? "Loading..."}</p>
        <button onClick={handleSignOut}>Sign Out</button>
      </div>

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
      <button onClick={handleCheckIn} style={{ marginTop: "10px", padding: "10px", fontSize: "16px", backgroundColor: "#28a745", color: "#fff" }}>
        Tap to Check-In
      </button>

      {/* QR Scanner Toggle Button */}
      <button onClick={toggleQrScanner} style={{ marginLeft: "10px", padding: "10px", fontSize: "16px", backgroundColor: "#007bff", color: "#fff" }}>
        {showQrScanner ? "Hide QR Scanner" : "Use QR Scanner"}
      </button>

      {/* Display Check-In Status */}
      {checkInStatus && <p>{checkInStatus}</p>}

      {/* QR Code Scanner (Only if enabled) */}
      {showQrScanner && (
        <div>
          <h2>Scan QR Code to Check-In</h2>
          <QrScanner delay={300} onError={(error) => console.error(error)} onScan={handleScan} style={{ width: "100%" }} />
          {qrResult && <p>Scanned Code: {qrResult}</p>}
        </div>
      )}
    </div>
  );
}

export default App;

