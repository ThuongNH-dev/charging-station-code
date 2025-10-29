// src/context/AuthContext.js
import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { setToken as storeToken, clearToken as wipeToken } from "../utils/api";

const AuthContext = createContext(null);

function roleToPath(role) {
  switch ((role || "").toLowerCase()) {
    case "customer":
      return "/stations";
    case "admin":
      return "/admin";
    case "staff":
      return "/staff";
    case "company":
      return "/company";
    default:
      return "/homepage";
  }
}

// ✅ lấy user trong storage
function getStoredUser() {
  try {
    const rawLocal = localStorage.getItem("user");
    if (rawLocal) return JSON.parse(rawLocal);
    const rawSession = sessionStorage.getItem("user");
    if (rawSession) return JSON.parse(rawSession);
  } catch (err) {
    console.warn("[AuthContext] getStoredUser error:", err);
  }
  return null;
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => getStoredUser());

  // 🟢 log khi khởi tạo
  useEffect(() => {
    console.groupCollapsed(
      "%c[AuthContext] INIT/UPDATE",
      "color:#1677ff;font-weight:bold;"
    );
    console.log("Stored user:", user);
    console.log("User role:", user?.role);
    console.log("Token:", user?.token?.slice(0, 40) + "...");
    console.log("isAuthenticated:", !!user?.token);
    console.groupEnd();
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user?.token,

      login: (userObj, remember = true) => {
        console.groupCollapsed(
          "%c[AuthContext] LOGIN",
          "color:#52c41a;font-weight:bold;"
        );
        console.log("Received userObj from BE:", userObj);
        console.groupEnd();

        // ✅ xoá dữ liệu cũ
        wipeToken();
        localStorage.removeItem("user");
        sessionStorage.removeItem("user");

        // ✅ lưu token và user mới
        storeToken(userObj.token);
        if (remember) {
          localStorage.setItem("user", JSON.stringify(userObj));
        } else {
          sessionStorage.setItem("user", JSON.stringify(userObj));
        }

        setUser(userObj);

        // ✅ debug sau khi lưu
        console.log("[AuthContext] After login, role:", userObj.role);
        console.log("[AuthContext] Redirecting to:", roleToPath(userObj.role));

        // ✅ điều hướng
        const from = location.state?.from;
        navigate(from || roleToPath(userObj.role), { replace: true });
      },

      logout: () => {
        console.warn("[AuthContext] LOGOUT");
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
