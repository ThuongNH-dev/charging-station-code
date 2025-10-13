// src/components/auth/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Kiểm tra role dựa vào user?.role
  if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/stations" replace />;
  }

  return children;
}
