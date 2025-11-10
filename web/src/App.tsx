import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import MainLayout from "./layouts/MainLayout";
import AdminRoutes from "./routes/AdminRoutes";
import SellerRoutes from "./routes/SellerRoutes";
import SystemRoutes from "./routes/SystemRoutes";
import UserRoutes from "./routes/UserRoutes";

export default function App() {
  return (
    <AuthProvider>
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
          

          
          {/* Layout system */}
          <Route path="/system/*" element={<SystemRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
