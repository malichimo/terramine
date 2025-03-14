// src/firebase.js
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Add Firestore import

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDwh0aVmyCRil5vQTGRMUTER_W37r3r6sM",
  authDomain: "terramine-3744d.firebaseapp.com",
  projectId: "terramine-3744d",
  storageBucket: "terramine-3744d.firebasestorage.app",
  messagingSenderId: "746868896165",
  appId: "1:746868896165:web:7c1e0e67ff9054e229784c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = getAuth(app);

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider(); // Renamed from 'provider' to 'googleProvider'

// Initialize Firestore
const db = getFirestore(app);

// Export auth, googleProvider, and db for use in other components
export { auth, googleProvider, db };
