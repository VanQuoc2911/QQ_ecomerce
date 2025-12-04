import { Box, CircularProgress } from "@mui/material";
import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AvailableOrders from "../pages/shipper/AvailableOrders";

export default function ShipperRoutes() {
  const { user, role, loading, logout } = useAuth();
  const navigate = useNavigate();

  // Allow access if user role is "shipper" OR user has shipper flag
  const isShipperRole = role === "shipper";
  const isShipperFlag = (user as any)?.isShipper || (user as any)?.shipperApproved;
  const allowAccess = isShipperRole || isShipperFlag;

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (!allowAccess) {
      try {
        logout();
      } catch (err) {
        console.warn("logout failed during shipper access enforcement", err);
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
      <Route index element={<AvailableOrders />} />
      <Route path="available" element={<AvailableOrders />} />
    </Routes>
  );
}
