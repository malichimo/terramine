// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDwh0aVmyCRil5vQTGRMUTER_W37r3r6sM",
  authDomain: "terramine-3744d.firebaseapp.com",
  projectId: "terramine-3744d",
  storageBucket: "terramine-3744d.firebasestorage.app",
  messagingSenderId: "746868896165",
  appId: "1:746868896165:web:7c1e0e67ff9054e229784c",
};

// Initialize Firebase with error handling
let app, auth, googleProvider, db;

try {
  app = initializeApp(firebaseConfig);
  console.log("🔥 Firebase initialized successfully");

  auth = getAuth(app);
  console.log("🔥 Firebase Auth initialized");

  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });
  console.log("🔥 Google Auth Provider initialized");

  db = getFirestore(app);
  console.log("🔥 Firestore initialized");
} catch (error) {
  console.error("🔥 Firebase initialization failed:", error);
  throw error; // Let ErrorBoundary catch this
}

// Export initialized instances at top level
export { app, auth, googleProvider, db };