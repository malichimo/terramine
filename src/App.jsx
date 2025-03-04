import React, { useState, useEffect } from "react";
import { auth } from "./firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { db } from "./firebase";
import { collection, getDocs, doc, getDoc, setDoc, query, where, addDoc, Timestamp } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import QrScanner from "react-qr-scanner";
import Login from "./Login.jsx"; // Import Login Screen

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY"; // Replace with actual API key

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // ✅ Add a loading state
  const [userLocation, setUserLocation] = useState(null);
  const [ownedTerracres, setOwnedTerracres] = useState([]);
  const [checkInStatus, setCheckInStatus] = useState("");
  const [qrResult, setQrResult] = useState("");
  const [showQrScanner, setShowQrScanner] = useState(false); // Toggle QR Scanner

  // ✅ Track user authentication with a loading state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth State Changed:", currentUser); // Debugging output

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

      setLoading(false); // ✅ Finish loading after auth check
    });

    return () => unsubscribe();
  }, []);

  // ✅ Show a loading screen instead of a black screen
  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "50px" }}>Loading...</div>;
  }

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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
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
      <button onClick={() => setCheckInStatus("Check-in feature coming soon!")} style={{ marginTop: "10px", padding: "10px", fontSize: "16px", backgroundColor: "#28a745", color: "#fff" }}>
        Tap to Check-In
      </button>

      {/* QR Scanner Toggle Button */}
      <button onClick={() => setShowQrScanner((prev) => !prev)} style={{ marginLeft: "10px", padding: "10px", fontSize: "16px", backgroundColor: "#007bff", color: "#fff" }}>
        {showQrScanner ? "Hide QR Scanner" : "Use QR Scanner"}
      </button>

      {/* Display Check-In Status */}
      {checkInStatus && <p>{checkInStatus}</p>}

      {/* QR Code Scanner (Only if enabled) */}
      {showQrScanner && (
        <div>
          <h2>Scan QR Code to Check-In</h2>
          <QrScanner delay={300} onError={(error) => console.error(error)} onScan={(data) => setQrResult(data.text)} style={{ width: "100%" }} />
          {qrResult && <p>Scanned Code: {qrResult}</p>}
        </div>
      )}
    </div>
  );
}

export default App;

