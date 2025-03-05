import React, { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import Login from "./components/Login"; 
import CheckInButton from "./components/CheckInButton"; 

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const GOOGLE_MAPS_API_KEY = "AIzaSyB3m0U9xxwvyl5pax4gKtWEt8PAf8qe9us"; 

function App() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [ownedTerracres, setOwnedTerracres] = useState([]);

  // ✅ Debugging - Log Errors
  useEffect(() => {
    try {
      console.log("Auth Listener Initialized ✅");
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        console.log("Auth State Changed ✅:", currentUser);
        if (currentUser) {
          console.log("Fetching user data from Firestore... 📡");
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            console.log("New user detected 🚀 - Creating Firestore profile...");
            await setDoc(userRef, { uid: currentUser.uid, terrabucks: 1000 });
            setUser({ ...currentUser, terrabucks: 1000 });
          } else {
            console.log("User exists ✅", userSnap.data());
            setUser({ ...currentUser, terrabucks: userSnap.data()?.terrabucks || 1000 });
          }
        } else {
          console.log("No user signed in ❌");
          setUser(null);
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("🔥 Auth State Error:", error);
    }
  }, []);

  // ✅ If user is not signed in, show Login screen
  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  // ✅ Get User's Location - Debugging Added
  useEffect(() => {
    try {
      console.log("Fetching User Location... 📍");
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log("✅ Location Retrieved:", position.coords);
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (error) => {
            console.error("❌ Error retrieving location:", error);
            setUserLocation(defaultCenter);
          }
        );
      } else {
        console.warn("⚠️ Geolocation not supported, using default location.");
        setUserLocation(defaultCenter);
      }
    } catch (error) {
      console.error("🔥 Location Fetch Error:", error);
    }
  }, []);

useEffect(() => {
  let isMounted = true;  // ✅ Prevent updates if unmounted

  const fetchOwnedTerracres = async () => {
    try {
      console.log("Fetching Terracres from Firestore... 📡");
      const terracresRef = collection(db, "terracres");
      const querySnapshot = await getDocs(terracresRef);

      if (!querySnapshot.empty) {
        const properties = querySnapshot.docs
          .map((doc) => {
            const data = doc.data();
            // ✅ Check if the document has valid lat & lng
            if (data.lat !== undefined && data.lng !== undefined) {
              return {
                id: doc.id,
                ...data,
              };
            } else {
              console.warn(`⚠️ Skipping invalid terracre (missing lat/lng):`, doc.id);
              return null;
            }
          })
          .filter(Boolean); // ✅ Remove null entries

        console.log("✅ Valid Terracres Retrieved:", properties);
        if (isMounted) {
          setOwnedTerracres(properties);
        }
      } else {
        console.warn("⚠️ No owned properties found.");
        if (isMounted) {
          setOwnedTerracres([]);
        }
      }
    } catch (error) {
      console.error("🔥 Firestore Fetch Error:", error);
      if (isMounted) {
        setOwnedTerracres([]);
      }
    }
  };

  fetchOwnedTerracres();

  return () => {
    console.log("Cleanup: Unmounting fetchOwnedTerracres 🚀");
    isMounted = false;
  };
}, []);




  return (
    <div>
      <h1>TerraMine</h1>

      {/* ✅ Google Maps */}
      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
        {userLocation ? (
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "500px" }}
            center={userLocation}
            zoom={15}
          >
            {/* ✅ Show User Location */}
            <Marker position={userLocation} label="You" />
      
            {/* ✅ Ensure only valid properties are mapped */}
            {ownedTerracres.length > 0 ? (
              ownedTerracres.map((terracre) => (
                <Marker
                  key={terracre.id}
                  position={{ lat: terracre.lat, lng: terracre.lng }}
                  icon={{
                    path: window.google.maps.SymbolPath.SQUARE,
                    scale: 10,
                    fillColor: terracre.ownerId === user.uid ? "blue" : "green",
                    fillOpacity: 1,
                    strokeWeight: 1,
                  }}
                />
              ))
            ) : (
              console.warn("⚠️ No valid properties to display on map.")
            )}
          </GoogleMap>
        ) : (
          <p>Loading map...</p>
        )}
      </LoadScript>

      {/* ✅ Check-In Button */}
      <CheckInButton user={user} userLocation={userLocation} />
    </div>
  );
}

export default App;




