// src/context/AuthContext.js
import { createContext, useContext, useMemo, useState } from "react";
import { setToken as storeToken, clearToken as wipeToken } from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user?.token,
    login: (userObj, remember) => {
      // Lưu token và user
      storeToken(userObj.token);
      localStorage.setItem("user", JSON.stringify(userObj));
      setUser(userObj);
    },
    logout: () => {
      wipeToken();
      localStorage.removeItem("user");
      setUser(null);
    },
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
