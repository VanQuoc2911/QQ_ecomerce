import { Box, CircularProgress } from "@mui/material";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ChatbotFloatingButton from "./components/chat/ChatbotFloatingButton";
import { useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import MainLayout from "./layouts/MainLayout";
import AdminRoutes from "./routes/AdminRoutes";
import SellerRoutes from "./routes/SellerRoutes";
import ShipperRoutes from "./routes/ShipperRoutes";
import UserRoutes from "./routes/UserRoutes";

export default function App() {
  const isAdminOnly = import.meta.env.VITE_ADMIN_ONLY === "true";
  const isSellerOnly = import.meta.env.VITE_SELLER_ONLY === "true";
  const isUserOnly = import.meta.env.VITE_USER_ONLY === "true";
  return (
    <SocketProvider>
        <ToastContainer
          position="top-center"
          autoClose={1000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          style={{ width: "100%", maxWidth: "600px", left: "50%", transform: "translateX(-50%)" }}
        />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            {isAdminOnly ? (
              // Admin-only: mount admin routes at root
              <Route path="/*" element={<AdminRoutes />} />
            ) : isSellerOnly ? (
              // Seller-only: mount seller routes at root
              <Route path="/*" element={<SellerRoutes />} />
            ) : isUserOnly ? (
              // User-only: mount user routes at root
              <Route path="/*" element={<UserRoutes />} />
            ) : (
              // Default: mount all layouts together
              <>
                {/* Layout người dùng */}
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<HomeIndexRedirect />} />
                  <Route path="/*" element={<UserRoutes />} />
                </Route>

                {/* Layout admin */}
                <Route path="/admin/*" element={<AdminRoutes />} />

                {/* Layout seller */}
                <Route path="/seller/*" element={<SellerRoutes />} />
                {/* Layout shipper */}
                <Route path="/shipper/*" element={<ShipperRoutes />} />
              </>
            )}
          </Routes>
          <ChatbotFloatingButton />
        </BrowserRouter>

        <style>{`
          .Toastify__toast-container {
            width: 100% !important;
            max-width: 600px !important;
            padding: 0 !important;
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%) !important;
          }
        `}</style>
      </SocketProvider>
  );
}

function HomeIndexRedirect() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <Box minHeight="60vh" display="flex" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (user && role === "seller") {
    return <Navigate to="/seller/dashboard" replace />;
  }

  return <Navigate to="/home" replace />;
}
