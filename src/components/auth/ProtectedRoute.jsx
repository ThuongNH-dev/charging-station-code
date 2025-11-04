// src/components/auth/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  console.log(
    `[ProtectedRoute] path=${
      location.pathname
    } | isAuth=${isAuthenticated} | userRole=${
      user?.role
    } | allowed=${allowedRoles.join(", ")}`
  );

  // 🕐 Trường hợp user chưa load xong -> tránh redirect sớm
  if (isAuthenticated && !user?.role) {
    console.log("[ProtectedRoute] waiting for user to load...");
    return null;
  }

  if (!isAuthenticated) {
    console.warn("[ProtectedRoute] ❌ Not authenticated → /login");
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const userRole = (user?.role || "").trim().toLowerCase();
  const rolesLower = allowedRoles.map((r) => (r || "").trim().toLowerCase());
  const match = rolesLower.includes(userRole);

  console.log("[ProtectedRoute] compare →", { userRole, rolesLower, match });

  if (rolesLower.length && !match) {
    console.warn(`[ProtectedRoute] ❌ Role not allowed: ${userRole}`);
    return <Navigate to="/unauthorized" replace />;
  }

  console.log("[ProtectedRoute] ✅ Access granted:", location.pathname);
  return children;
}
