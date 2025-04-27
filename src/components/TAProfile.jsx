import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "./TAProfile.css";

const TAProfile = ({ user, setUser, setCheckInStatus }) => {
  const { terracreId } = useParams();
  const navigate = useNavigate();
  const [terracreData, setTerracreData] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [ownerData, setOwnerData] = useState(null);
  const [message, setMessage] = useState("");
  const [picture, setPicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [qrScanned, setQrScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return; // Exit if no user is logged in

      try {
        // Fetch terracre data
        console.log("📍 TAProfile: Fetching terracre data for ID:", terracreId);
        const terracreRef = doc(db, "terracres", terracreId);
        const terracreSnap = await getDoc(terracreRef);
        let terracreInfo = null;

        if (terracreSnap.exists()) {
          terracreInfo = terracreSnap.data();
          console.log("📍 TAProfile: Terracre found:", terracreInfo);
          setTerracreData(terracreInfo);
        } else {
          console.log("📍 TAProfile: Terracre does not exist for ID:", terracreId);
          setTerracreData(null);
        }

        // Fetch owner data if terracre exists and has an owner
        if (terracreInfo?.ownerId) {
          console.log("📍 TAProfile: Fetching owner data for ownerId:", terracreInfo.ownerId);
          const ownerRef = doc(db, "users", terracreInfo.ownerId);
          const ownerSnap = await getDoc(ownerRef);
          if (ownerSnap.exists()) {
            const owner = ownerSnap.data();
            console.log("📍 TAProfile: Owner data:", owner);
            setOwnerData(owner);
          } else {
            console.log("📍 TAProfile: Owner not found for ownerId:", terracreInfo.ownerId);
            setOwnerData(null);
          }
        } else {
          console.log("📍 TAProfile: No owner for this terracre");
          setOwnerData(null);
        }

        // Fetch check-ins for this terracre
        console.log("📍 TAProfile: Fetching check-ins for terracreId:", terracreId);
        const checkInsSnapshot = await getDocs(collection(db, "checkins"));
        const terracreCheckIns = checkInsSnapshot.docs
          .filter((doc) => doc.data().terracreId === terracreId)
          .map((doc) => doc.data());
        console.log("📍 TAProfile: Check-ins:", terracreCheckIns);
        setCheckIns(terracreCheckIns);

        // Check if user has already checked in today
        const today = new Date().toISOString().split("T")[0];
        const userCheckIn = terracreCheckIns.find(
          (checkIn) => checkIn.userId === user?.uid && checkIn.date === today
        );
        console.log("📍 TAProfile: Has user checked in today?", !!userCheckIn);
        setHasCheckedIn(!!userCheckIn);
      } catch (err) {
        console.error("🔥 TAProfile: Error fetching data:", err);
        setCheckInStatus("Failed to load TA profile data.");
      }
    };

    fetchData();
  }, [user, terracreId, setCheckInStatus]);

  const handlePurchase = async () => {
    if (!user) {
      setCheckInStatus("Please sign in to purchase.");
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();
    const terrabucks = userData?.terrabucks ?? 0;
    const TERRACRE_COST = 100;

    if (terrabucks < TERRACRE_COST) {
      setCheckInStatus("Not enough TerraBucks to purchase.");
      return;
    }

    try {
      const [lat, lng] = terracreId.split("-").map(Number);
      const newTerracre = {
        id: terracreId,
        lat,
        lng,
        ownerId: user.uid,
        purchasedAt: new Date().toISOString(),
        lastCollected: new Date().toISOString(),
        earningRate: 0.05, // Default rate (Rock Mine)
        taType: "Rock Mine", // Default type
      };

      const terracreRef = doc(db, "terracres", terracreId);
      await setDoc(terracreRef, newTerracre);
      await updateDoc(userRef, { terrabucks: terrabucks - TERRACRE_COST });
      setTerracreData(newTerracre);

      // Fetch new owner data
      const ownerRef = doc(db, "users", user.uid);
      const ownerSnap = await getDoc(ownerRef);
      if (ownerSnap.exists()) {
        setOwnerData(ownerSnap.data());
      }

      setCheckInStatus("✅ TA purchased successfully!");
    } catch (err) {
      console.error("🔥 TAProfile: Purchase failed:", err);
      setCheckInStatus("Failed to purchase TA.");
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
    console.log("📍 TAProfile: Simulating QR scan");
    setQrScanned(true);
  };

  const handleSubmitCheckIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const checkInRef = doc(db, "checkins", `${user.uid}-${terracreId}`);
      const today = new Date().toISOString().split("T")[0];

      let visitorTbEarned = 1; // Base check-in
      let ownerTbEarned = 1;

      // Message and photo together earn 2 TB
      if (message || picture) {
        visitorTbEarned += 2;
        ownerTbEarned += 2;
      }
      // QR scan earns 3 TB
      if (qrScanned) {
        visitorTbEarned += 3;
        ownerTbEarned += 3;
      }

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

      console.log("📍 TAProfile: Writing check-in data:", checkInData);
      await setDoc(checkInRef, checkInData);

      console.log("📍 TAProfile: Updating user terrabucks");
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const newTerrabucks = (userData.terrabucks || 0) + visitorTbEarned;
        await updateDoc(userRef, { terrabucks: newTerrabucks });
        setUser({ ...user, terrabucks: newTerrabucks });
      }

      if (terracreData?.ownerId) {
        console.log("📍 TAProfile: Updating owner terrabucks");
        const ownerRef = doc(db, "users", terracreData.ownerId);
        const ownerSnap = await getDoc(ownerRef);
        if (ownerSnap.exists()) {
          const ownerData = ownerSnap.data();
          await updateDoc(ownerRef, { terrabucks: (ownerData.terrabucks || 0) + ownerTbEarned });
        }
      }

      console.log("📍 TAProfile: Check-in completed");
      setCheckInStatus(
        `✅ Check-in successful! Visitor earned ${visitorTbEarned} TB, Owner earned ${ownerTbEarned} TB.`
      );
      setHasCheckedIn(true);
      setCheckIns((prev) => [...prev, checkInData]);
      setMessage("");
      setPicture(null);
      setPreviewUrl("");
      setQrScanned(false);
    } catch (err) {
      console.error("🔥 TAProfile: Error during check-in submission:", err);
      setCheckInStatus("Check-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ta-profile-screen">
      <button className="ta-profile-back-button" onClick={() => navigate(-1)}>
        Back
      </button>
      <h2>TA Profile</h2>
      <div className="ta-details">
        <p><strong>TA ID:</strong> {terracreId}</p>
        <p>
          <strong>Owner:</strong>{" "}
          {ownerData ? (
            ownerData.nickname || ownerData.displayName || "Unknown Owner"
          ) : (
            "No owner"
          )}
          {!terracreData?.ownerId && (
            <>
              {" "}
              <button className="purchase-ta-button" onClick={handlePurchase}>
                Purchase this TA (100 TB)
              </button>
            </>
          )}
        </p>
        <p><strong>Number of Check-Ins:</strong> {checkIns.length}</p>
        {terracreData?.ownerId && ownerData?.greeting && (
          <p><strong>Owner Greeting:</strong> {ownerData.greeting}</p>
        )}
      </div>

      <div className="ta-messages">
        <h3>Messages and Photos</h3>
        {checkIns.length > 0 ? (
          checkIns.map((checkIn, index) => (
            <div key={index} className="check-in-entry">
              <p><strong>Message:</strong> {checkIn.message}</p>
              {checkIn.pictureUrl && (
                <img src={checkIn.pictureUrl} alt="Check-in Photo" className="check-in-photo" />
              )}
              {checkIn.qrScanned && <p><strong>QR Scanned:</strong> Yes</p>}
            </div>
          ))
        ) : (
          <p>No messages or photos yet.</p>
        )}
      </div>

      {user && (!terracreData || terracreData.ownerId !== user.uid) && !hasCheckedIn && (
        <div className="check-in-form-section">
          <h3>Check-In</h3>
          <form onSubmit={handleSubmitCheckIn} className="check-in-form">
            <div className="form-group">
              <label>Leave a Message (2 TB with photo)</label>
              <textarea
                className="check-in-message-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write a message..."
                maxLength={500}
              />
            </div>
            <div className="form-group">
              <label>Upload a Picture/Selfie (2 TB with message)</label>
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
                type="submit"
                className="submit-check-in-button"
                disabled={isLoading}
              >
                {isLoading ? "Submitting..." : "Submit Check-In"}
              </button>
            </div>
          </form>
        </div>
      )}

      {hasCheckedIn && <p>You have already checked in today.</p>}
    </div>
  );
};

export default TAProfile;