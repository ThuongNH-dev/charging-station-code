// src/components/auth/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, token, userRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(userRole)) {
    // Không đủ quyền -> điều hướng trang mặc định
    return <Navigate to="/stations" replace />;
  }

  return children;
}
