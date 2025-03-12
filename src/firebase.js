// src/firebase.js

// Import the required functions from the Firebase SDKs
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration for your project
const firebaseConfig = {
  apiKey: "AIzaSyDwh0aVmyCRil5vQTGRMUTER_W37r3r6sM",
  authDomain: "terramine.onrender.com", // Updated to match Render deployment
  projectId: "terramine-3744d",
  storageBucket: "terramine-3744d.firebasestorage.app",
  messagingSenderId: "746868896165",
  appId: "1:746868896165:web:7c1e0e67ff9054e229784c",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firestore (if you're using it)
export const db = getFirestore(app);

export default app;
