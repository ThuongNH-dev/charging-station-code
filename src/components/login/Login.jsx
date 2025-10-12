import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Login.css";
import MainLayout from "../../layouts/MainLayout";

const LOGIN_URL = "https://localhost:7268/api/Auth/login"; // ✅ BE .NET thật của bạn

// === Helper: Giải mã JWT và lấy role từ claim ===
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

function getRoleFromToken(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  // .NET thường dùng 1 trong các claim sau cho role:
  return (
    payload["role"] ||
    payload["roles"] ||
    payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
    null
  );
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
      // 1️⃣ Gửi request đăng nhập
      const res = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, password }),
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
        } catch {}
        setError(msg);
        setLoading(false);
        return;
      }

      // 2️⃣ Đọc dữ liệu trả về
      let data = null;
      try {
        const ct = res.headers.get("content-type") || "";
        data = ct.includes("application/json") ? await res.json() : null;
      } catch {
        console.warn("⚠️ Response không phải JSON hợp lệ");
      }

      // 3️⃣ Lấy token từ response
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

      // 4️⃣ Lấy role trực tiếp từ token (KHÔNG gọi /api/Auth nữa)
      const roleFromToken = getRoleFromToken(token);
      const role = roleFromToken || "Customer"; // fallback nếu BE chưa nhét claim

      // 5️⃣ Tạo đối tượng user và lưu vào context
      const msg = data?.message ?? data ?? {};
      const user = {
        id: msg?.userId ?? msg?.user?.id ?? null,
        name: msg?.fullName || msg?.user?.fullName || msg?.user?.name || userName,
        email: msg?.email || msg?.user?.email || null,
        role,
        token,
      };

      login(user, rememberMe);

      // 6️⃣ Điều hướng về trang trước hoặc /stations
      const from = location.state?.from?.pathname;
      navigate(from || "/stations", { replace: true });
    } catch (err) {
      console.error("❌ Login error:", err);
      setError("Không thể kết nối đến server. Vui lòng thử lại sau!");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    alert("🔵 Google login feature is under development");
  };

  const handleFacebookLogin = () => {
    alert(
      "🔵 Facebook login feature is under development\n(Only for Individual accounts)"
    );
  };

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
                💡 <strong>Ghi chú:</strong> Facebook login chỉ dành cho tài khoản cá nhân
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
