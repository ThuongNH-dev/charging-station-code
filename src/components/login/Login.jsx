// src/pages/auth/Login.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import MainLayout from "../../layouts/MainLayout";
import { setToken as storeToken, getApiBase } from "../../utils/api";
import "./Login.css";
import { roleToPath } from "../../utils/roleRedirect";

const API_BASE = getApiBase();
const LOGIN_URL = `${API_BASE}/Auth/login`;

// ===== Helper: Giải mã JWT =====
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// ===== Lấy role từ token =====
function getRoleFromToken(token) {
  const p = decodeJwtPayload(token);
  return (
    p?.role ||
    p?.roles ||
    p?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
    "Customer"
  );
}

function storeCustomerId(n) {
  try {
    if (Number.isFinite(n) && n > 0) {
      localStorage.setItem("customerId", String(n));
      sessionStorage.setItem("customerId", String(n));
      console.debug("[LOGIN] stored customerId =", n);
    }
  } catch (e) {
    console.warn("[LOGIN] storeCustomerId error:", e);
  }
}


export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!userName.trim()) return setError("Vui lòng nhập username!");
    if (!password || password.length < 6)
      return setError("Mật khẩu phải từ 6 ký tự!");

    setLoading(true);
    try {
      // Nhiều BE nhận username/email → gửi cả 3 key
      const payload = {
        userName,
        username: userName,
        email: userName,
        password,
      };

      const res = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "cors",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = `Login failed (${res.status})`;
        try {
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const j = await res.json();
            msg = j?.message?.message || j?.message || j?.error || msg;
          } else {
            const t = await res.text();
            if (t) msg = `${msg}: ${t}`;
          }
        } catch { }
        if (res.status === 404)
          msg += " — Kiểm tra lại API_BASE và route /Auth/login.";
        setError(msg);
        setLoading(false);
        return;
      }

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : null;

      const token = data?.message?.token || data?.token;
      const success =
        data?.message?.success === true ||
        data?.success === true ||
        Boolean(token);

      if (!success || !token) {
        setError("Login response missing token!");
        setLoading(false);
        return;
      }

      // ✅ Lưu token ngay
      storeToken(token);

      // 🔹 LẤY accountId từ claim "nameidentifier"
      const claims = decodeJwtPayload(token);
      const accountId =
        Number(
          claims?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"]
        ) || null;

      // 🔹 LẤY customerId từ /api/Auth (mảng accounts có customers[])
      let customerId = null;
      try {
        const apiAbs = (getApiBase() || "").replace(/\/+$/, "") || "https://localhost:7268/api";
        console.debug("[LOGIN] fetching /Auth to resolve customerId for accountId =", accountId);
        const resp = await fetch(`${apiAbs}/Auth`, {
          method: "GET",
          headers: {
            accept: "application/json",
            authorization: `Bearer ${token}`,
          },
        });
       if (resp.ok) {
         const list = await resp.json(); // ← MẢNG
         const mine = Array.isArray(list)
           ? list.find(x => Number(x?.accountId) === Number(accountId))
           : null;
         customerId = Number(mine?.customers?.[0]?.customerId) || null;
         console.debug("[LOGIN] /Auth matched customerId =", customerId, "from accountId =", accountId);
         if (customerId) storeCustomerId(customerId);
       } else {
         console.warn("[LOGIN] /Auth non-200:", resp.status);
       }
     } catch (err) {
       console.warn("[LOGIN] /Auth fetch error:", err);
     }

      const role = getRoleFromToken(token);
      const msg = data?.message ?? data ?? {};
      const user = {
        id: msg?.userId ?? msg?.user?.id ?? null,
        name:
          msg?.fullName || msg?.user?.fullName || msg?.user?.name || userName,
        email: msg?.email || msg?.user?.email || null,
        role,
        token,
        accountId,   
        customerId,  
      };


      // ✅ Lưu user vào context + localStorage
      login(user, rememberMe);
      console.log("[LOGIN OK]", {
        user,
        tokenSnippet: token.slice(0, 12) + "...",
      });

      // ✅ Điều hướng (tránh race với guard)
      const from = location.state?.from?.pathname;
      const target = from || roleToPath(role);
      setTimeout(() => navigate(target, { replace: true }), 0);
      // Fallback cứng nếu guard cứ kéo về login:
      // setTimeout(() => window.location.assign(target), 50);
      return;
    } catch (err) {
      console.error("❌ Login error:", err);
      const txt = String(err?.message || err);
      let hint = "";
      if (txt.includes("Failed to fetch") || txt.includes("NetworkError")) {
        hint =
          "\n• Có thể lỗi CORS/HTTPS. Hãy:\n" +
          "  - Bật CORS cho http://localhost:5173 (hoặc port dev của bạn)\n" +
          "  - Trust dev cert:  `dotnet dev-certs https --trust`\n" +
          "  - Kiểm tra API_BASE: " +
          API_BASE;
      }
      setError("Không thể kết nối đến server." + hint);
    } finally {
      setLoading(false);
    }
  };

  // Social placeholders
  const handleGoogleLogin = () => alert("🔵 Google login đang phát triển");
  const handleFacebookLogin = () =>
    alert("🔵 Facebook login đang phát triển (chỉ dành cho tài khoản cá nhân)");

  return (
    <MainLayout>
      <div className="login-wrapper">
        <div className="login-card">
          <h2 className="login-title">Đăng Nhập</h2>
          {error && <div className="error-message">⚠️ {error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">Tên người dùng</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter username"
                className="form-input"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="form-input"
                disabled={loading}
              />
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="checkbox"
                  disabled={loading}
                />
                <span>Ghi nhớ tài khoản</span>
              </label>
              <a href="/forgot-password" className="forgot-link">
                Quên mật khẩu ?
              </a>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>

            <div className="divider">
              <span>Hoặc đăng nhập bằng</span>
            </div>

            <div className="social-login">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="social-btn google-btn"
                disabled={loading}
              >
                Google
              </button>
              <button
                type="button"
                onClick={handleFacebookLogin}
                className="social-btn facebook-btn"
                disabled={loading}
              >
                Facebook
              </button>
            </div>

            <div className="info-note">
              <small>
                💡 <strong>Ghi chú:</strong> Facebook login chỉ dành cho tài
                khoản cá nhân
              </small>
            </div>

            <div className="signup-link">
              Chưa có tài khoản?{" "}
              <a onClick={() => navigate("/register")}>Đăng kí ngay</a>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
