// src/pages/auth/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import MainLayout from "../../layouts/MainLayout";
import { setToken as storeToken, getApiBase } from "../../utils/api";
import "./Login.css";
import { GoogleLogin } from "@react-oauth/google";

const API_BASE = getApiBase();
const LOGIN_URL = `${API_BASE}/Auth/login`;
const HOME_PATH = "/";

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

function getAccountIdFromLoginResponse(data, token) {
  const p = decodeJwtPayload(token) || {};
  // Ưu tiên từ login response (nếu BE trả về)
  const fromResp =
    data?.message?.accountId ??
    data?.accountId ??
    data?.user?.accountId ??
    data?.message?.user?.accountId;

  // Các key claim có thể chứa accountId/userId
  const claimNameId =
    p?.nameid ??
    p?.["nameid"] ??
    p?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ??
    p?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/nameidentifier"];

  // Fallback từ token claim
  const fromToken =
    p?.accountId ?? p?.AccountId ?? p?.accId ??
    p?.userId ?? p?.UserId ?? p?.sub ?? claimNameId;

  const n = Number(fromResp ?? fromToken);
  return Number.isFinite(n) ? n : null;
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

// ==== Vehicles helper (dùng ngay trong Login) ====
async function fetchFirstVehicleId(token, { customerId, companyId }) {
  try {
    const apiAbs = (getApiBase() || "").replace(/\/+$/, "");
    const qs = new URLSearchParams();
    // Nếu có customerId ⇒ chỉ lọc theo customerId
    if (Number.isFinite(customerId) && customerId > 0) {
      qs.set("customerId", String(customerId));
      qs.set("page", "1");
      qs.set("pageSize", "50");
    } else if (Number.isFinite(companyId) && companyId > 0) {
      // Nếu chưa có customerId thì mới dùng companyId
      qs.set("companyId", String(companyId));
      qs.set("page", "1");
      qs.set("pageSize", "50");
    } else {
      // Không có gì để lọc ⇒ không cố gọi
      return null;
    }

    const res = await fetch(`${apiAbs}/Vehicles?${qs.toString()}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    if (!items.length) return null;
    const pickId = (o) => Number(o?.vehicleId ?? o?.VehicleId ?? o?.id ?? o?.Id);
    // Chỉ nhận khi khớp customer/company, KHÔNG fallback items[0]
    let hit = null;
    if (Number.isFinite(customerId) && customerId > 0) {
      hit = items.find(v => Number(v?.customerId) === Number(customerId)) || null;
    } else if (Number.isFinite(companyId) && companyId > 0) {
      hit = items.find(v => Number(v?.companyId) === Number(companyId)) || null;
    }
    if (!hit) return null;
    const vid = pickId(hit);
    return Number.isFinite(vid) ? vid : null;
  } catch {
    return null;
  }
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

// Trả về { customerId, companyId } – ƯU TIÊN /Auth/{accountId}, rồi /Customers/me, rồi claim
async function resolveIdentity(token, accountId) {
  const apiAbs = (getApiBase() || "").replace(/\/+$/, "");
  let customerId = null;
  let companyId = null;

  // a) /Auth/{accountId} (đúng người đang đăng nhập)
  if (accountId != null && String(accountId).trim() !== "") {
    const accStr = encodeURIComponent(String(accountId).trim());
    try {
      const r = await fetch(`${apiAbs}/Auth/${accStr}`, {
        method: "GET",
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const j = await r.json();
        // BE của bạn thường trả 1 object có customers[]
        const c0 = j?.customers?.[0] ?? j?.Customers?.[0] ?? null;
        customerId = Number(c0?.customerId ?? c0?.CustomerId) || customerId;
        companyId = Number(
          c0?.companyId ?? c0?.CompanyId ?? c0?.company?.companyId ?? c0?.company?.id
        ) || companyId;

        // Nếu object không có customers -> thử trực tiếp
        if (!customerId) {
          customerId = Number(j?.customerId ?? j?.CustomerId) || customerId;
          companyId = Number(j?.companyId ?? j?.CompanyId ?? j?.company?.companyId ?? j?.company?.id) || companyId;
        }
      } else {
        console.warn("[resolveIdentity] /Auth/{id} NOT OK:", r.status);
      }
    } catch (e) {
      console.warn("[resolveIdentity] /Auth/{id} error:", e);
    }
  }

  // b) /Auth (không id) – chỉ dùng nếu chưa lấy được
  if (!customerId) {
    try {
      const r = await fetch(`${apiAbs}/Auth`, {
        method: "GET",
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const j = await r.json();
        // /Auth có thể trả object hoặc mảng
        if (Array.isArray(j)) {
          // 🔴 Quan trọng: LỌC THEO accountId (đừng lấy phần tử đầu)
          const mine = j.find(x =>
            String(
              x?.accountId ?? x?.AccountId ?? x?.id ?? x?.Id ?? x?.userId ?? x?.UserId
            ) === String(accountId)
          ) || j[0]; // fallback mềm
          const c0 = mine?.customers?.[0] ?? mine?.Customers?.[0] ?? null;
          if (c0) {
            customerId = Number(c0?.customerId ?? c0?.CustomerId) || customerId;
            companyId = Number(
              c0?.companyId ?? c0?.CompanyId ?? c0?.company?.companyId ?? c0?.company?.id
            ) || companyId;

          } else {
            customerId = Number(mine?.customerId ?? mine?.CustomerId) || customerId;
            companyId = Number(
              mine?.companyId ?? mine?.CompanyId ?? mine?.company?.companyId ?? mine?.company?.id
            ) || companyId;

          }
        } else {
          // object đơn
          const directCid = Number(j?.customerId ?? j?.CustomerId);
          if (Number.isFinite(directCid)) customerId = directCid;
          if (!customerId && (j?.customers?.length || j?.Customers?.length)) {
            const c0 = (j.customers ?? j.Customers)[0];
            customerId = Number(c0?.customerId ?? c0?.CustomerId) || customerId;
            companyId = Number(
              c0?.companyId ?? c0?.CompanyId ?? c0?.company?.companyId ?? c0?.company?.id
            ) || companyId;

          }
          if (!companyId) companyId = Number(j?.company?.companyId ?? j?.company?.id ?? j?.companyId ?? j?.CompanyId) || companyId;
        }
      } else {
        console.warn("[resolveIdentity] /Auth NOT OK:", r.status);
      }
    } catch (e) {
      console.warn("[resolveIdentity] /Auth error:", e);
    }
  }
  // c) /Customers/me – fallback
  if (!customerId) {
    try {
      const r = await fetch(`${apiAbs}/Customers/me`, {
        method: "GET",
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const me = await r.json();
        customerId = Number(me?.customerId ?? me?.CustomerId) || customerId;
        companyId = Number(me?.companyId ?? me?.CompanyId ?? me?.company?.companyId ?? me?.company?.id) || companyId;
      }
    } catch { }
  }

  // d) claim trong token – fallback cuối
  if (!customerId || !companyId) {
    const p = decodeJwtPayload(token) || {};
    customerId = Number(p?.customerId ?? p?.CustomerId) || customerId;
    companyId = Number(p?.company?.companyId ?? p?.companyId ?? p?.CompanyId ?? p?.tenantId ?? p?.AccountId) || companyId;
  }

  return {
    customerId: Number.isFinite(customerId) ? customerId : null,
    companyId: Number.isFinite(companyId) ? companyId : null,
  };
}

export default function Login() {
  const navigate = useNavigate();
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
      // ✅ Lấy accountId từ response/token để gọi đúng /Auth/{accountId}
      const accountId = getAccountIdFromLoginResponse(data, token);
      console.debug("[LOGIN] accountId =", accountId);

      // 🔹 LẤY customerId & companyId (Auth → Customers/me → claim)
      const { customerId, companyId } = await resolveIdentity(token, accountId);
      // 🔹 LẤY vehicleId nếu đã có xe
      const vehicleId = await fetchFirstVehicleId(token, { customerId, companyId });
      const keyGlobal = "vehicleId";
      const keyScoped = Number.isFinite(customerId) ? `vehicleId__${customerId}` : null;
      // clear cũ
      localStorage.removeItem(keyGlobal);
      sessionStorage.removeItem(keyGlobal);
      if (keyScoped) {
        localStorage.removeItem(`vehicleId__${customerId}`);
        sessionStorage.removeItem(`vehicleId__${customerId}`);
      }
      // set mới (chỉ khi có match thật sự)
      if (Number.isFinite(vehicleId)) {
        localStorage.setItem(keyGlobal, String(vehicleId));            // tiện cho code cũ
        sessionStorage.setItem(keyGlobal, String(vehicleId));
        if (keyScoped) {
          localStorage.setItem(keyScoped, String(vehicleId));          // scoped theo customer
          sessionStorage.setItem(keyScoped, String(vehicleId));
        }
      }

      if (companyId !== null && companyId !== undefined) {
        localStorage.setItem("companyId", String(companyId));
        sessionStorage.setItem("companyId", String(companyId));
      }
      if (customerId !== null && customerId !== undefined) {
        localStorage.setItem("customerId", String(customerId));
        sessionStorage.setItem("customerId", String(customerId));
      }

      if (Number.isFinite(accountId)) {
        localStorage.setItem("accountId", String(accountId));
        sessionStorage.setItem("accountId", String(accountId));
      }

      // Build user object and role
      const msg = data?.message || data || {};
      const role = getRoleFromToken(token) || "Customer";
      const user = {
        id: msg?.userId ?? msg?.user?.id ?? null,
        name: msg?.fullName || msg?.user?.fullName || msg?.user?.name || userName,
        email: msg?.email || msg?.user?.email || null,
        role,
        token,
        customerId,
        companyId,
        vehicleId: Number.isFinite(vehicleId) ? vehicleId : null,
      };

      // Persist user depending on rememberMe
      try {
        localStorage.removeItem("user");
        sessionStorage.removeItem("user");
        if (rememberMe) {
          localStorage.setItem("user", JSON.stringify(user));
        } else {
          sessionStorage.setItem("user", JSON.stringify(user));
        }
      } catch (e) {
        console.warn("[LOGIN] storing user failed:", e);
      }

      // ✅ Lưu user vào context + log
      login(user, rememberMe);
      console.log("[LOGIN OK]", user);

      // ✅ Điều hướng: LUÔN về homepage
      setTimeout(() => navigate(HOME_PATH, { replace: true }), 0);
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
  const handleGoogleLogin = async (credentialResponse) => {
    try {
      const idToken = credentialResponse?.credential;
      if (!idToken) {
        alert("Không lấy được idToken từ Google!");
        return;
      }

      const res = await fetch(`${API_BASE}/Auth/login-google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Đăng nhập Google thất bại: ${msg}`);
      }

      const data = await res.json();
      const token = data?.token || data?.message?.token;
      if (!token) throw new Error("Thiếu JWT trong phản hồi backend!");

      // ✅ Lưu token
      storeToken(token);

      const role = getRoleFromToken(token);
      const accountId = getAccountIdFromLoginResponse(data, token);
      const { customerId, companyId } = await resolveIdentity(token, accountId);

      const user = {
        name: data?.user?.fullName || data?.user?.name || "Google User",
        email: data?.user?.email,
        role,
        token,
        customerId,
        companyId,
      };

      localStorage.setItem("user", JSON.stringify(user));
      login(user, true);

      // ✅ Điều hướng: LUÔN về homepage
      navigate(HOME_PATH, { replace: true });
    } catch (err) {
      console.error("Google Login Error:", err);
      alert("Đăng nhập Google thất bại: " + err.message);
    }
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
              <span className="login-text">Hoặc đăng nhập bằng</span>
            </div>

            <div className="social-login">
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => alert("Đăng nhập Google thất bại!")}
                text="signin_with"
                shape="pill"
                width="300"
              />
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