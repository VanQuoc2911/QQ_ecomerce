// src/routes/AdminRoutes.tsx

import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ✅ Import đầy đủ các trang Admin
import AdminDashboard from "../admin/pages/AdminDashboard";
import AdminProductReview from "../admin/pages/AdminProductReview";
import AdminSettings from "../admin/pages/SystemSettings";
import ManageUsers from "../admin/pages/User";
import SellerEditProduct from "../pages/seller/SellerEditProduct";

export default function AdminRoutes() {
  const { user, role } = useAuth();

  // ✅ Chặn truy cập khi không phải Admin
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

      {/* ✅ Quản lý người dùng */}
      <Route path="users" element={<ManageUsers />} />

      {/* ✅ Cài đặt Admin */}
      <Route path="settings" element={<AdminSettings />} />

      {/* ❌ Không tồn tại */}
      {/* <Route path="*" element={<NotFound />} /> */}

    </Routes>
  );
}
