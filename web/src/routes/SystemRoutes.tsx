import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SystemDashboard from "../pages/system/SystemDashboard";

export default function SystemRoutes() {
  const { user, role } = useAuth();

  if (!user || role !== "system") return <Navigate to="/" />;

  return (
    <Routes>
      <Route path="approvals" element={<SystemDashboard />} />
      {/* Thêm route system khác ở đây */}
    </Routes>
  );
}
