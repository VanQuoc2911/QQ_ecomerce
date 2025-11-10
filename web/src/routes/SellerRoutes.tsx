import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SellerAddProduct from "../pages/seller/SellerAddProduct";
import SellerDashboard from "../pages/seller/SellerDashboard";
import SellerEditProduct from "../pages/seller/SellerEditProduct";
import SellerLayout from "../pages/seller/SellerLayout";
import SellerOrders from "../pages/seller/SellerOrders";
import SellerProducts from "../pages/seller/SellerProducts";
import SellerShopInfo from "../pages/seller/SellerShopInfo";

export default function SellerRoutes() {
  const { user, role } = useAuth();

  if (!user || role !== "seller") return <Navigate to="/" replace />;

  return (
    <Routes>
      <Route element={<SellerLayout />}>
        <Route path="/dashboard" element={<SellerDashboard />} />
        <Route path="/products" element={<SellerProducts />} />
        <Route path="/orders" element={<SellerOrders />} />
        <Route path="/add" element={<SellerAddProduct />} />
        <Route path="/edit/:id" element={<SellerEditProduct />} />
        <Route path="/shop" element={<SellerShopInfo />} />
      </Route>
    </Routes>
  );
}
