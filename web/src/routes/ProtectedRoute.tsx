import type { JSX } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }: { children: JSX.Element; roles?: string[] }) {
  const { user, role } = useAuth();

  if (!user || !role) return <Navigate to="/" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/" replace />;
  return children;
}
