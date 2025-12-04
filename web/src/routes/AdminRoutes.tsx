// src/routes/AdminRoutes.tsx

import { Box, CircularProgress } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ✅ Import đầy đủ các trang Admin
import AdminDashboard from "../admin/pages/AdminDashboard";
import AdminProductReview from "../admin/pages/AdminProductReview";
import AdminReports from "../admin/pages/AdminReports";
import AdminSellerRequests from "../admin/pages/AdminSellerRequests";
import AdminShipperRequests from "../admin/pages/AdminShipperRequests";
import AdminSettings from "../admin/pages/SystemSettings";
import UsersManagement from "../admin/pages/UsersManagement";
import SellerEditProduct from "../pages/seller/SellerEditProduct";

export default function AdminRoutes() {
  const { user, role, loading } = useAuth();

  // ✅ Chặn truy cập khi không phải Admin
  if (loading) {
    return (
      <Box minHeight="60vh" display="flex" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (!user || role !== "admin") return <Navigate to="/login" replace />;

  return (
    <Routes>

      {/* ✅ Default Admin enter → Dashboard */}
      <Route index element={<Navigate to="dashboard" replace />} />

      {/* ✅ Dashboard */}
      <Route path="dashboard" element={<AdminDashboard />} />

      {/* ✅ Quản lý sản phẩm chờ duyệt */}
      <Route path="Products" element={<AdminProductReview />} />
      <Route path="products/:id" element={<SellerEditProduct />} />

      {/* ✅ Quản lý yêu cầu người bán */}
      <Route path="seller-requests" element={<AdminSellerRequests />} />
      {/* ✅ Quản lý yêu cầu shipper */}
      <Route path="shipper-requests" element={<AdminShipperRequests />} />

      {/* ✅ Quản lý người dùng */}
      <Route path="users" element={<UsersManagement />} />

      {/* ✅ Báo cáo / Report center */}
      <Route path="reports" element={<AdminReports />} />

      {/* ✅ Cài đặt Admin */}
      <Route path="settings" element={<AdminSettings />} />

      {/* ❌ Không tồn tại */}
      {/* <Route path="*" element={<NotFound />} /> */}

    </Routes>
  );
}
