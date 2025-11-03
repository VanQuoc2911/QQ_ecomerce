import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SellerDashboard from "../pages/seller/SellerDashboard";

export default function SellerRoutes() {
  const { user, role } = useAuth();

  if (!user || role !== "seller") return <Navigate to="/" />;

  return (
    <Routes>
      <Route path="Seller-dashboard" element={<SellerDashboard />} />
      {/* Thêm route seller khác ở đây */}
    </Routes>
  );
}
