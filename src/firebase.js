// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ✅ Your Firebase config (Replace with your actual Firebase config)
const firebaseConfig = {
  apiKey: "AIzaSyDwh0aVmyCRil5vQTGRMUTER_W37r3r6sM",
  authDomain: "terramine-3744d.firebaseapp.com",
  projectId: "terramine-3744d",
  storageBucket: "terramine-3744d.firebasestorage.app",
  messagingSenderId: "746868896165",
  appId: "1:746868896165:web:a76c230a68eb42b729784c",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

// ✅ Export modules correctly
export { auth, googleProvider, db };

