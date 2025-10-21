// src/components/auth/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const userRole = (user?.role || "").toLowerCase();
  const rolesLower = allowedRoles.map((r) => r.toLowerCase());
  if (rolesLower.length && !rolesLower.includes(userRole)) {
    // ❌ Đừng về /stations nữa
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}