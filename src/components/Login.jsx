import React, { useRef } from "react";
import { signInWithPopup, signInWithRedirect } from "firebase/auth";
import { auth, provider } from "../firebase";

function Login({ onLoginSuccess }) {
  const popupRef = useRef(null);

  const handleLogin = async (event) => {
    event.preventDefault();
    console.log("handleLogin triggered, checking popup...");

    // Test if popup can open
    const testWindow = window.open("", "_blank", "width=500,height=500");
    if (!testWindow || testWindow.closed || typeof testWindow.closed === "undefined") {
      console.warn("⚠️ Popup blocked by browser during test, falling back to redirect...");
      try {
        console.log("Attempting sign-in with redirect...");
        await signInWithRedirect(auth, provider);
        return; // Exit to let redirect handle the flow
      } catch (error) {
        console.error("❌ Redirect Sign-In Error:", error.code, error.message);
        alert("Redirect failed. Please check console for details.");
        return;
      }
    }
    console.log("✅ Popup test successful, closing test window...");
    testWindow.close();

    try {
      console.log("Attempting sign-in with popup...");
      popupRef.current = window.open("", "_blank", "width=600,height=600");
      if (!popupRef.current) {
        throw new Error("Failed to open popup window.");
      }
      console.log("Popup window opened, initiating sign-in...");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("✅ Popup Sign-In Successful:", user.uid, user.email);
      if (onLoginSuccess) onLoginSuccess(user);
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    } catch (error) {
      console.error("❌ Popup Sign-In Error:", error.code, error.message);
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      if (error.code === "auth/popup-blocked") {
        console.warn("⚠️ Popup blocked by browser during sign-in, falling back to redirect...");
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectError) {
          console.error("❌ Redirect Fallback Error:", redirectError.code, redirectError.message);
          alert("Redirect fallback failed. Please check console for details.");
        }
      } else if (error.code === "auth/popup-closed-by-user") {
        console.warn("⚠️ Popup closed by user or system before completion.");
        alert("Popup was closed before completing sign-in. Please try again and keep the popup open.");
      } else {
        console.error("Unexpected error:", error);
      }
    }
  };

  return (
    <div className="login-container">
      <h2>Welcome to TerraMine</h2>
      <button className="google-login-button" onClick={handleLogin}>
        Sign in with Google
      </button>
    </div>
  );
}

export default Login;
