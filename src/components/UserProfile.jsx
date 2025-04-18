import React, { useState, useEffect } from "react";
     import { doc, getDoc, setDoc } from "firebase/firestore";
     import { db } from "../firebase";
     import "./UserProfile.css";

     const UserProfile = ({ user, onClose, ownedTerracres, checkInMessages }) => {
       const [nickname, setNickname] = useState("");
       const [address, setAddress] = useState("");
       const [bio, setBio] = useState("");
       const [profilePic, setProfilePic] = useState(null);
       const [previewUrl, setPreviewUrl] = useState("");
       const [isLoading, setIsLoading] = useState(false);
       const [error, setError] = useState("");

       // Load user data from Firestore
       useEffect(() => {
         const fetchUserProfile = async () => {
           if (!user?.uid) return;
           try {
             const userRef = doc(db, "users", user.uid);
             const userSnap = await getDoc(userRef);
             if (userSnap.exists()) {
               const data = userSnap.data();
               setNickname(data.nickname || user.displayName || "");
               setAddress(data.address || "");
               setBio(data.bio || "");
               setPreviewUrl(data.profilePicUrl || "");
             }
           } catch (err) {
             console.error("🔥 Error fetching user profile:", err);
             setError("Failed to load profile.");
           }
         };
         fetchUserProfile();
       }, [user]);

       // Handle profile picture upload
       const handlePicChange = (e) => {
         const file = e.target.files[0];
         if (file) {
           if (file.size > 2 * 1024 * 1024) {
             setError("Image must be under 2MB.");
             return;
           }
           setProfilePic(file);
           setPreviewUrl(URL.createObjectURL(file));
         }
       };

       // Save profile to Firestore
       const handleSave = async (e) => {
         e.preventDefault();
         if (!user?.uid) {
           setError("User not authenticated.");
           return;
         }
         setIsLoading(true);
         setError("");
         try {
           const userRef = doc(db, "users", user.uid);
           const profileData = {
             nickname: nickname.trim() || user.displayName,
             address: address.trim(),
             bio: bio.trim(),
             updatedAt: new Date().toISOString(),
           };

           // Handle profile picture (base64 for simplicity; consider Firebase Storage for production)
           if (profilePic) {
             const reader = new FileReader();
             reader.readAsDataURL(profilePic);
             reader.onload = async () => {
               profileData.profilePicUrl = reader.result;
               await setDoc(userRef, profileData, { merge: true });
               setIsLoading(false);
               alert("Profile updated successfully!");
             };
             reader.onerror = () => {
               setError("Failed to process image.");
               setIsLoading(false);
             };
           } else {
             await setDoc(userRef, profileData, { merge: true });
             setIsLoading(false);
             alert("Profile updated successfully!");
           }
         } catch (err) {
           console.error("🔥 Error saving profile:", err);
           setError("Failed to save profile.");
           setIsLoading(false);
         }
       };

       // TA ownership stats
       const taStats = {
         rockMines: ownedTerracres.filter((t) => t.taType === "Rock Mine" && t.ownerId === user?.uid).length,
         coalMines: ownedTerracres.filter((t) => t.taType === "Coal Mine" && t.ownerId === user?.uid).length,
         goldMines: ownedTerracres.filter((t) => t.taType === "Gold Mine" && t.ownerId === user?.uid).length,
         diamondMines: ownedTerracres.filter((t) => t.taType === "Diamond Mine" && t.ownerId === user?.uid).length,
       };

       return (
         <div className="user-profile-container">
           <button className="close-button" onClick={onClose}>✕</button>
           <h2>User Profile</h2>
           {error && <p className="error">{error}</p>}
           <form onSubmit={handleSave} className="profile-form">
             <div className="form-group">
               <label>Nickname</label>
               <input
                 type="text"
                 value={nickname}
                 onChange={(e) => setNickname(e.target.value)}
                 placeholder="Enter your nickname"
                 maxLength={50}
               />
             </div>
             <div className="form-group">
               <label>Address</label>
               <input
                 type="text"
                 value={address}
                 onChange={(e) => setAddress(e.target.value)}
                 placeholder="Enter your address"
                 maxLength={100}
               />
             </div>
             <div className="form-group">
               <label>Bio</label>
               <textarea
                 value={bio}
                 onChange={(e) => setBio(e.target.value)}
                 placeholder="Tell us about yourself"
                 maxLength={500}
               />
             </div>
             <div className="form-group">
               <label>Profile Picture</label>
               <input
                 type="file"
                 accept="image/*"
                 onChange={handlePicChange}
               />
               {previewUrl && (
                 <img src={previewUrl} alt="Profile Preview" className="profile-pic-preview" />
               )}
             </div>
             <button type="submit" className="save-button" disabled={isLoading}>
               {isLoading ? "Saving..." : "Save Profile"}
             </button>
           </form>
           <div className="profile-summary">
             <h3>Your Stats</h3>
             <p><strong>TerraBucks:</strong> {user?.terrabucks ?? 0} TB</p>
             <p><strong>TA Ownership:</strong></p>
             <ul>
               <li>Rock Mines: {taStats.rockMines}</li>
               <li>Coal Mines: {taStats.coalMines}</li>
               <li>Gold Mines: {taStats.goldMines}</li>
               <li>Diamond Mines: {taStats.diamondMines}</li>
             </ul>
             <p><strong>Ranking:</strong> Coming soon</p>
             <p><strong>Real Money Earned:</strong> $0.00 (Coming soon)</p>
             <p><strong>Bank Account:</strong> Not linked (Coming soon)</p>
             <button
               className="checkin-gallery-button"
               onClick={() => onClose(true)} // Signal to show gallery
             >
               View Check-In History
             </button>
           </div>
         </div>
       );
     };

     export default UserProfile;