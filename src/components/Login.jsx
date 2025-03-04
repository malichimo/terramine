import React from "react";
import { handleGoogleSignIn } from "../firebaseFunctions"; // ✅ Import the function

function Login({ onLoginSuccess }) {
  const handleLogin = async () => {
    const user = await handleGoogleSignIn(); // ✅ Call function directly
    if (user) onLoginSuccess(user);
  };

  return (
    <div style={styles.container}>
      <h1>Welcome to TerraMine</h1>
      <p>Sign in to explore and check-in at properties!</p>
      <button onClick={handleLogin} style={styles.button}>
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
