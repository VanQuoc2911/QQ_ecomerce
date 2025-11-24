import { Box, CircularProgress } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SellerAddProduct from "../pages/seller/SellerAddProduct";
import SellerAIChatPage from "../pages/seller/SellerAIChatPage";
import SellerChat from "../pages/seller/SellerChat";
import SellerDashboard from "../pages/seller/SellerDashboard";
import SellerEditProduct from "../pages/seller/SellerEditProduct";
import SellerLayout from "../pages/seller/SellerLayout";
import SellerOrders from "../pages/seller/SellerOrders";
import SellerProducts from "../pages/seller/SellerProducts";
import SellerReviews from "../pages/seller/SellerReviews";
import SellerShopInfo from "../pages/seller/SellerShopInfo";
import SellerVouchers from "../pages/seller/SellerVouchers";

export default function SellerRoutes() {
  const { user, role, loading } = useAuth();

  // Allow access if user role is "seller" OR user is seller approved
  const isSellerOrApproved = role === "seller" || user?.sellerApproved;

  if (loading) {
    return (
      <Box minHeight="60vh" display="flex" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (!user || !isSellerOrApproved) return <Navigate to="/" replace />;

  return (
    <Routes>
      <Route element={<SellerLayout />}>
        <Route path="/dashboard" element={<SellerDashboard />} />
        <Route path="/products" element={<SellerProducts />} />
        <Route path="/orders" element={<SellerOrders />} />
        <Route path="/add" element={<SellerAddProduct />} />
        <Route path="/edit/:id" element={<SellerEditProduct />} />
        <Route path="/shop" element={<SellerShopInfo />} />
        <Route path="/vouchers" element={<SellerVouchers />} />
        <Route path="/chat" element={<SellerChat />} />
        <Route path="/ai-chat" element={<SellerAIChatPage />} />
        <Route path="/reviews" element={<SellerReviews />} />
      </Route>
    </Routes>
  );
}
