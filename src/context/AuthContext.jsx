// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

// Hook tiện dùng
export const useAuth = () => useContext(AuthContext);

// Đọc auth từ storage (ưu tiên localStorage trước)
function readAuthFromStorage() {
  const pick = (key) =>
    localStorage.getItem(key) ?? sessionStorage.getItem(key);

  const token = pick("token");
  const isAuthenticated =
    pick("isAuthenticated") === "true";

  return {
    token,
    isAuthenticated,
    userId: pick("userId") || null,
    userName: pick("userName") || null,
    userEmail: pick("userEmail") || null,
    userRole: pick("userRole") || null,
  };
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readAuthFromStorage());

  // Đăng nhập: ghi vào storage theo rememberMe
  const login = (user, rememberMe = false) => {
    const storage = rememberMe ? localStorage : sessionStorage;

    storage.setItem("token", user.token);
    storage.setItem("isAuthenticated", "true");
    if (user.id) storage.setItem("userId", user.id);
    if (user.name) storage.setItem("userName", user.name);
    if (user.email) storage.setItem("userEmail", user.email);
    if (user.role) storage.setItem("userRole", user.role);

    // xoá bên còn lại để tránh trùng lặp
    const other = rememberMe ? sessionStorage : localStorage;
    other.removeItem("token");
    other.removeItem("isAuthenticated");
    other.removeItem("userId");
    other.removeItem("userName");
    other.removeItem("userEmail");
    other.removeItem("userRole");

    setAuth(readAuthFromStorage());
  };

  // Đăng xuất: xóa sạch
  const logout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setAuth(readAuthFromStorage());
  };

  // Đồng bộ giữa nhiều tab
  useEffect(() => {
    const onStorage = () => setAuth(readAuthFromStorage());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
