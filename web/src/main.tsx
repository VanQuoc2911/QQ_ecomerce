import { GoogleOAuthProvider } from "@react-oauth/google";
import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import SplashScreen from "./components/common/SplashScreen";
import { AuthProvider } from "./context/AuthProvider";
// If running in admin-only mode, pre-seed admin token so admin doesn't need to login
if (import.meta.env.VITE_ADMIN_ONLY === "true") {
  try {
    localStorage.setItem("accessToken", "admin-token");
    // debug info
    console.log("[DEV] VITE_ADMIN_ONLY=true → seeded admin-token in localStorage");

    // Add a small banner to indicate admin-only dev mode
    try {
      const existing = document.getElementById("dev-mode-banner");
      if (!existing && typeof document !== "undefined") {
        const banner = document.createElement("div");
        banner.id = "dev-mode-banner";
        banner.textContent = "DEV MODE: ADMIN (auto-login enabled)";
        Object.assign(banner.style, {
          position: "fixed",
          top: "8px",
          right: "8px",
          zIndex: "99999",
          padding: "6px 10px",
          background: "#7e22ce",
          color: "#fff",
          borderRadius: "6px",
          fontWeight: "700",
          fontSize: "12px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
        });
        document.body.appendChild(banner);
      }
    } catch {
      // ignore DOM errors
    }
  } catch {
    // ignore storage errors in non-browser contexts
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <RootWithSplash />
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>

);

export function RootWithSplash() {
  const [show, setShow] = useState<boolean>(() => {
    try {
      const seen = !!localStorage.getItem("qq_splash_seen");
      try {
        const params = new URLSearchParams(window.location.search);
        // allow forcing splash with ?splash=1
        const force = params.get("splash");
        if (force === "1") return true;
        if (force === "0") return false;
      } catch {
        // ignore URL parsing errors
      }
      return !seen;
    } catch {
      return true;
    }
  });

  const handleFinish = () => {
    try {
      localStorage.setItem("qq_splash_seen", "1");
    } catch {
      // ignore storage errors in non-browser contexts
    }
    setShow(false);
  };

  return (
    <>
      {show && <SplashScreen onFinish={handleFinish} duration={6000} />}
      {!show && <App />}
    </>
  );
}
