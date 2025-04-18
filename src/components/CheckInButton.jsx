import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "./CheckInButton.css";

const COORDINATE_PRECISION = 7;

const CheckInButton = ({ user, userLocation, snappedGridCenter, setCheckInStatus, setUser }) => {
  const [showCheckInScreen, setShowCheckInScreen] = useState(false);
  const [message, setMessage] = useState("");
  const [picture, setPicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [qrScanned, setQrScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Debug: Log when component mounts and props change
  useEffect(() => {
    console.log("📍 CheckInButton: Component mounted/updated", { user, userLocation, snappedGridCenter });
  }, [user, userLocation, snappedGridCenter]);

  const roundCoordinate = (value) => {
    const rounded = Number(value.toFixed(COORDINATE_PRECISION));
    console.log(`📏 CheckIn: Rounding ${value} to ${rounded}`);
    return rounded;
  };

  const handleInitialCheckIn = async () => {
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
    console.log("📍 CheckIn: Attempting initial check-in for terracreId:", terracreId);

    try {
      const terracreRef = doc(db, "terracres", terracreId);
      console.log("📍 CheckIn: Fetching terracreRef:", terracreId);
      const terracreSnap = await getDoc(terracreRef);

      if (!terracreSnap.exists()) {
        console.log("📍 CheckIn: Terracre does not exist:", terracreId);
        const terracresSnapshot = await getDocs(collection(db, "terracres"));
        const terracreIds = terracresSnapshot.docs.map((doc) => doc.id);
        console.log("📍 CheckIn: Available terracre IDs:", terracreIds);
        setCheckInStatus("This TA does not exist.");
        return;
      }

      const terracreData = terracreSnap.data();
      console.log("📍 CheckIn: Terracre found:", terracreData);

      if (terracreData.ownerId === user.uid) {
        console.log("📍 CheckIn: User owns this TA");
        setCheckInStatus("You cannot check in at your own TA.");
        return;
      }

      const checkInRef = doc(db, "checkins", `${user.uid}-${terracreId}`);
      console.log("📍 CheckIn: Checking existing check-in:", checkInRef.path);
      const existingSnap = await getDoc(checkInRef);

      const today = new Date().toISOString().split("T")[0];
      if (existingSnap.exists() && existingSnap.data().date === today) {
        console.log("📍 CheckIn: Already checked in today");
        setCheckInStatus("You have already checked in at this TA today.");
        return;
      }

      console.log("📍 CheckIn: Proceeding to check-in screen");
      setShowCheckInScreen(true);
    } catch (err) {
      console.error("🔥 CheckIn: Error during initial check-in:", err);
      setCheckInStatus("Failed to initiate check-in. Please try again.");
    }
  };

  const handlePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setCheckInStatus("Image must be under 2MB.");
        return;
      }
      setPicture(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleQrScan = () => {
    console.log("📍 CheckIn: Simulating QR scan");
    setQrScanned(true);
  };

  const handleSubmitCheckIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const standardizedCenter = {
      lat: roundCoordinate(snappedGridCenter.lat),
      lng: roundCoordinate(snappedGridCenter.lng),
    };
    const terracreId = `${standardizedCenter.lat}-${standardizedCenter.lng}`;
    const checkInRef = doc(db, "checkins", `${user.uid}-${terracreId}`);
    const terracreRef = doc(db, "terracres", terracreId);

    try {
      const terracreSnap = await getDoc(terracreRef);
      const terracreData = terracreSnap.data();

      let visitorTbEarned = 0;
      let ownerTbEarned = 0;

      if (message) {
        visitorTbEarned += 1;
        ownerTbEarned += 1;
      }
      if (picture) {
        visitorTbEarned += 1;
        ownerTbEarned += 1;
      }
      if (qrScanned) {
        visitorTbEarned += 3;
        ownerTbEarned += 3;
      }

      const today = new Date().toISOString().split("T")[0];
      const checkInData = {
        date: today,
        userId: user.uid,
        terracreId,
        message: message || "Checked in!",
        timestamp: new Date().toISOString(),
      };

      if (picture) {
        const reader = new FileReader();
        reader.readAsDataURL(picture);
        await new Promise((resolve, reject) => {
          reader.onload = () => {
            checkInData.pictureUrl = reader.result;
            resolve();
          };
          reader.onerror = reject;
        });
      }

      checkInData.qrScanned = qrScanned;

      console.log("📍 CheckIn: Writing check-in data:", checkInData);
      await setDoc(checkInRef, checkInData);

      console.log("📍 CheckIn: Updating user terrabucks");
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const newTerrabucks = (userData.terrabucks || 0) + visitorTbEarned;
        await updateDoc(userRef, { terrabucks: newTerrabucks });
        setUser({ ...user, terrabucks: newTerrabucks });
      }

      console.log("📍 CheckIn: Updating owner terrabucks");
      const ownerRef = doc(db, "users", terracreData.ownerId);
      const ownerSnap = await getDoc(ownerRef);
      if (ownerSnap.exists()) {
        const ownerData = ownerSnap.data();
        await updateDoc(ownerRef, { terrabucks: (ownerData.terrabucks || 0) + ownerTbEarned });
      }

      console.log("📍 CheckIn: Check-in completed");
      setCheckInStatus(
        `✅ Check-in successful! Visitor earned ${visitorTbEarned} TB, Owner earned ${ownerTbEarned} TB.`
      );
      setShowCheckInScreen(false);
      setMessage("");
      setPicture(null);
      setPreviewUrl("");
      setQrScanned(false);
    } catch (err) {
      console.error("🔥 CheckIn: Error during check-in submission:", err);
      setCheckInStatus("Check-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (showCheckInScreen) {
    return (
      <div className="check-in-screen">
        <h2>Check-In at TA</h2>
        <form onSubmit={handleSubmitCheckIn} className="check-in-form">
          <div className="form-group">
            <label>Leave a Message (1 TB each)</label>
            <textarea
              className="check-in-message-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a message..."
              maxLength={500}
            />
          </div>
          <div className="form-group">
            <label>Upload a Picture/Selfie (1 TB each)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePictureChange}
            />
            {previewUrl && (
              <img src={previewUrl} alt="Preview" className="check-in-pic-preview" />
            )}
          </div>
          <div className="form-group">
            <label>Scan QR Code (3 TB each)</label>
            <button
              type="button"
              className="qr-scan-button"
              onClick={handleQrScan}
              disabled={qrScanned}
            >
              {qrScanned ? "QR Scanned!" : "Scan QR"}
            </button>
          </div>
          <div className="check-in-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={() => setShowCheckInScreen(false)}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-check-in-button"
              disabled={isLoading || (!message && !picture && !qrScanned)}
            >
              {isLoading ? "Submitting..." : "Submit Check-In"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="check-in-section">
      <button
        className="check-in-button"
        onClick={(e) => {
          console.log("📍 CheckIn: onClick event triggered", e);
          handleInitialCheckIn();
        }}
        disabled={!user || !snappedGridCenter}
      >
        Tap to Check-In
      </button>
    </div>
  );
};

export default CheckInButton;