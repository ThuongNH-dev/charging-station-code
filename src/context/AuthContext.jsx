// src/context/AuthContext.js
import { createContext, useContext, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { setToken as storeToken, clearToken as wipeToken } from "../utils/api";

const AuthContext = createContext(null);

// Ánh xạ role => route đích
function roleToPath(role) {
  switch ((role || "").toLowerCase()) {
    case "customer": return "/stations";        // ✅ có trong App.jsx
    case "admin":    return "/homepage";        // tạm thời chưa có trang admin
    case "staff":    return "/homepage";        // tạm thời chưa có trang staff
    default:         return "/homepage";
  }
}

// Helper: lấy user đã lưu
function getStoredUser() {
  try {
    const rawLocal = localStorage.getItem("user");
    if (rawLocal) return JSON.parse(rawLocal);
    const rawSession = sessionStorage.getItem("user");
    if (rawSession) return JSON.parse(rawSession);
  } catch {}
  return null;
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(() => getStoredUser());

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user?.token,

      /**
       * Đăng nhập và điều hướng theo vai trò
       * @param {Object} userObj - dữ liệu từ BE (cần có token, role)
       * @param {boolean} remember - true => lưu localStorage, false => sessionStorage
       */
      login: (userObj, remember = true) => {
        // 1) Lưu token cho các call API
        storeToken(userObj.token);

        // 2) Lưu thông tin user
        if (remember) {
          localStorage.setItem("user", JSON.stringify(userObj));
          sessionStorage.removeItem("user");
        } else {
          sessionStorage.setItem("user", JSON.stringify(userObj));
          localStorage.removeItem("user");
        }
        setUser(userObj);

        // 3) Điều hướng
        const target = roleToPath(userObj.role);
        const from = location.state?.from; // nếu bị chặn ở ProtectedRoute
        if (from && typeof from === "string") {
          navigate(from, { replace: true });
        } else {
          navigate(target, { replace: true });
        }
      },

      logout: () => {
        wipeToken();
        localStorage.removeItem("user");
        sessionStorage.removeItem("user");
        setUser(null);
        navigate("/login", { replace: true });
      },
    }),
    [user, navigate, location.state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}