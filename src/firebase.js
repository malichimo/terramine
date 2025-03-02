import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDwh0aVmyCRil5vQTGRMUTER_W37r3r6sM",
  authDomain: "terramine-3744d.firebaseapp.com",
  projectId: "terramine-3744d",
  storageBucket: "terramine-3744d.firebasestorage.app",
  messagingSenderId: "746868896165",
  appId: "1:746868896165:web:a76c230a68eb42b729784c"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider, signInWithPopup, signOut };

