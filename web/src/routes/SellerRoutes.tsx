import { Box, CircularProgress } from "@mui/material";
import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SellerAddProduct from "../pages/seller/SellerAddProduct";
import SellerAIChatPage from "../pages/seller/SellerAIChatPage";
import SellerChat from "../pages/seller/SellerChat";
import SellerDashboard from "../pages/seller/SellerDashboard";
import SellerEditProduct from "../pages/seller/SellerEditProduct";
import SellerLayout from "../pages/seller/SellerLayout";
import SellerNotifications from "../pages/seller/SellerNotifications";
import SellerOrders from "../pages/seller/SellerOrders";
import SellerProducts from "../pages/seller/SellerProducts";
import SellerReviews from "../pages/seller/SellerReviews";
import SellerShopInfo from "../pages/seller/SellerShopInfo";
import SellerVouchers from "../pages/seller/SellerVouchers";

export default function SellerRoutes() {
  const { user, role, loading, logout } = useAuth();
  const navigate = useNavigate();

  // Allow access if user role is "seller" OR user is seller approved
  const isSellerOrApproved = role === "seller" || user?.sellerApproved;
  const isSellerOnlyMode = import.meta.env.VITE_SELLER_ONLY === "true";

  // If running in seller-only dev mode, require explicit seller role and approved flag
  const allowAccess = isSellerOnlyMode ? role === "seller" && user?.sellerApproved : isSellerOrApproved;

  // If not allowed to access seller pages:
  // - If a logged-in user exists but is not an approved seller, force logout and redirect home.
  // - Otherwise (not logged in), just redirect home.
  useEffect(() => {
    if (loading) return;
    if (!user) return; // not logged in — navigation handled below
    if (!allowAccess) {
      try {
        logout();
      } catch (err) {
        console.warn("logout failed during seller access enforcement", err);
      }
      navigate("/home", { replace: true });
    }
  }, [loading, user, allowAccess, logout, navigate]);

  if (loading) {
    return (
      <Box minHeight="60vh" display="flex" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (!user || !allowAccess) {
    return <Navigate to="/home" replace />;
  }

  return (
    <Routes>
      <Route element={<SellerLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SellerDashboard />} />
        <Route path="products" element={<SellerProducts />} />
        <Route path="orders" element={<SellerOrders />} />
        <Route path="notifications" element={<SellerNotifications />} />
        <Route path="add" element={<SellerAddProduct />} />
        <Route path="edit/:id" element={<SellerEditProduct />} />
        <Route path="shop" element={<SellerShopInfo />} />
        <Route path="vouchers" element={<SellerVouchers />} />
        <Route path="chat" element={<SellerChat />} />
        <Route path="ai-chat" element={<SellerAIChatPage />} />
        <Route path="reviews" element={<SellerReviews />} />
      </Route>
    </Routes>
  );
}
