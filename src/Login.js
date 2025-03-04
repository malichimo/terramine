import React from "react";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup } from "firebase/auth";

function Login({ onLoginSuccess }) {
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLoginSuccess(result.user); // ✅ Notify parent when login is successful
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  return (
    <div style={styles.container}>
      <h1>Welcome to TerraMine</h1>
      <p>Sign in to explore and check-in at properties!</p>
      <button onClick={handleGoogleSignIn} style={styles.button}>
        Sign in with Google
      </button>
    </div>
  );
}

// ✅ Simple styling
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    textAlign: "center",
  },
  button: {
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#4285F4",
    color: "white",
    border: "none",
    cursor: "pointer",
  },
};

export default Login;
