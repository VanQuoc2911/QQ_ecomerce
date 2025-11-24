import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ChatbotFloatingButton from "./components/chat/ChatbotFloatingButton";
import { AuthProvider } from "./context/AuthProvider";
import { SocketProvider } from "./context/SocketContext";
import MainLayout from "./layouts/MainLayout";
import AdminRoutes from "./routes/AdminRoutes";
import SellerRoutes from "./routes/SellerRoutes";
import UserRoutes from "./routes/UserRoutes";

export default function App() {
  return (
    <AuthProvider>
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
            {/* Layout người dùng */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="/*" element={<UserRoutes />} />
            </Route>

            {/* Layout admin */}
            <Route path="/admin/*" element={<AdminRoutes />} />
            
            {/* Layout seller */}
            <Route path="/seller/*" element={<SellerRoutes />} />
            
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
    </AuthProvider>
  );
}
