import React, { useRef, useEffect } from "react";
import { signInWithPopup, signInWithRedirect } from "firebase/auth";
import { auth, provider } from "../firebase";

function Login({ onLoginSuccess }) {
  const popupRef = useRef(null);

  const handleLogin = async (event) => {
    event.preventDefault();
    console.log("handleLogin triggered, checking popup capability...");

    // Skip the test popup to avoid "about:blank" popup
    console.log("Assuming popups are allowed (skipping test window)...");

    try {
      console.log("Attempting sign-in with popup...");
      popupRef.current = window.open("", "_blank", "width=600,height=600");
      if (!popupRef.current) {
        throw new Error("Failed to open popup window.");
      }
      console.log("Popup window opened, initiating Firebase sign-in...");
      const result = await signInWithPopup(auth, provider);
      console.log("Popup sign-in process completed, awaiting result...");
      const user = result.user;
      console.log("✅ Popup Sign-In Successful:", user.uid, user.email);
      if (onLoginSuccess) onLoginSuccess(user);
      if (popupRef.current && !popupRef.current.closed) {
        console.log("Closing popup window...");
        popupRef.current.close();
      }
    } catch (error) {
      console.error("❌ Popup Sign-In Error:", error.code, error.message);
      if (popupRef.current && !popupRef.current.closed) {
        console.log("Closing popup window due to error...");
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
        console.log("Popup URL at closure:", popupRef.current?.location.href || "Not available");
        alert("Popup was closed before completing sign-in. Please try again and keep the popup open.");
      } else {
        console.error("Unexpected error:", error);
      }
    }
  };

  // Monitor popup state
  useEffect(() => {
    const checkPopup = setInterval(() => {
      if (popupRef.current && !popupRef.current.closed) {
        console.log("Popup is still open, URL:", popupRef.current.location.href);
      } else if (popupRef.current) {
        console.log("Popup has closed.");
        clearInterval(checkPopup);
      }
    }, 1000);
    return () => clearInterval(checkPopup);
  }, []);

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
