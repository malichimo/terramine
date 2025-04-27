import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import "./CheckInButton.css";

const COORDINATE_PRECISION = 4; // Changed to 4 decimal places to match Firestore

const CheckInButton = ({ user, userLocation, snappedGridCenter, setCheckInStatus }) => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("📍 CheckInButton: Component mounted/updated", { user, userLocation, snappedGridCenter });
  }, [user, userLocation, snappedGridCenter]);

  const roundCoordinate = (value) => {
    const rounded = Number(value.toFixed(COORDINATE_PRECISION));
    console.log(`📏 CheckIn: Rounding ${value} to ${rounded}`);
    return rounded;
  };

  const handleVisitTA = async () => {
    console.log("📍 CheckIn: Button clicked", { user, snappedGridCenter });
    if (!user || !snappedGridCenter) {
      console.log("📍 CheckIn: Missing user or snappedGridCenter");
      setCheckInStatus("User or location not available.");
      return;
    }

    const standardizedCenter = {
      lat: roundCoordinate(snappedGridCenter.lat),
      lng: roundCoordinate(snappedGridCenter.lng),
    };
    const terracreId = `${standardizedCenter.lat}-${standardizedCenter.lng}`;
    console.log("📍 CheckIn: Attempting to visit TA with terracreId:", terracreId);

    try {
      const terracreRef = doc(db, "terracres", terracreId);
      const terracreSnap = await getDoc(terracreRef);
      const terracreExists = terracreSnap.exists();
      console.log("📍 CheckIn: Terracre exists:", terracreExists);

      // Navigate to TA profile page regardless of existence
      navigate(`/ta/${terracreId}`, { state: { terracreExists, terracreData: terracreExists ? terracreSnap.data() : null } });
    } catch (err) {
      console.error("🔥 CheckIn: Error checking terracre:", err);
      setCheckInStatus("Failed to load TA profile. Please try again.");
    }
  };

  return (
    <div className="check-in-section">
      <button
        className="check-in-button"
        onClick={(e) => {
          console.log("📍 CheckIn: onClick event triggered", e);
          handleVisitTA();
        }}
        disabled={!user || !snappedGridCenter}
      >
        Visit this TA
      </button>
    </div>
  );
};

export default CheckInButton;