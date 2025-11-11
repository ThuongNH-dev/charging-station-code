import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./ProfileSidebar.css";
import { useAuth } from "../../../context/AuthContext";
import { getApiBase } from "../../../utils/api";

const API_BASE = getApiBase();
const DEFAULT_AVATAR =
  "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg";

/* ===== Helpers storage/JWT (giữ nguyên như bạn có) ===== */
function getStoredUser() {
  try {
    const s =
      sessionStorage.getItem("user") || localStorage.getItem("user") || "";
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}
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
function resolveAccountIdSync() {
  const s1 = sessionStorage.getItem("accountId");
  const s2 = localStorage.getItem("accountId");
  if (s1 && !isNaN(+s1)) return +s1;
  if (s2 && !isNaN(+s2)) return +s2;

  const u = getStoredUser();
  const token = u?.token || localStorage.getItem("token") || "";
  const payload = token ? decodeJwtPayload(token) : null;
  const idFromClaim =
    payload?.nameid || payload?.nameId || payload?.sub || payload?.accountId;
  if (idFromClaim && !isNaN(+idFromClaim)) return +idFromClaim;

  return null;
}
function getStoredToken() {
  const u = getStoredUser();
  return u?.token || localStorage.getItem("token") || "";
}
function getStoredCustomerId() {
  const s1 = sessionStorage.getItem("customerId");
  const s2 = localStorage.getItem("customerId");
  return (s1 && +s1) || (s2 && +s2) || null;
}
async function findAccountIdByCustomerId(token, customerId) {
  if (!customerId) return null;
  try {
    const base = (API_BASE || "").replace(/\/+$/, "");
    const res = await fetch(`${base}/Auth`, {
      headers: {
        accept: "application/json",
        authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const list = Array.isArray(data) ? data : [data];
    const mine = list.find(
      (acc) =>
        Array.isArray(acc?.customers) &&
        acc.customers.some((c) => Number(c?.customerId) === Number(customerId))
    );
    const accId = Number(mine?.accountId ?? mine?.id ?? mine?.userId);
    return Number.isFinite(accId) ? accId : null;
  } catch {
    return null;
  }
}

/* ============= COMPONENT ============= */
export default function ProfileSidebar() {
  const location = useLocation();
  const { user } = useAuth();

  const baseRole = String(user?.role || "");
  const [profile, setProfile] = useState({
    name: user?.name || "",
    role: baseRole,
    avatarUrl: "",
  });

  const [accountId, setAccountId] = useState(() => resolveAccountIdSync());

  // 🔽 NEW: states & refs cho upload
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  // Nếu chưa có accountId nhưng có customerId → dò qua /Auth
  useEffect(() => {
    let alive = true;
    (async () => {
      if (accountId) return;
      const token = getStoredToken();
      const customerId = getStoredCustomerId();
      if (!customerId) return;
      const accId = await findAccountIdByCustomerId(token, customerId);
      if (alive && Number.isFinite(accId)) {
        setAccountId(accId);
        try {
          localStorage.setItem("accountId", String(accId));
          sessionStorage.setItem("accountId", String(accId));
        } catch {}
      }
    })();
    return () => {
      alive = false;
    };
  }, [accountId]);

  // fetch profile theo accountId
  useEffect(() => {
    let aborted = false;
    async function fetchProfile() {
      try {
        const base = (API_BASE || "").replace(/\/+$/, "");
        const url = `${base}/Auth/${accountId}`;
        const token = getStoredToken();
        const res = await fetch(url, {
          headers: {
            accept: "application/json",
            authorization: token ? `Bearer ${token}` : undefined,
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (aborted) return;

        const name =
          data?.customers?.[0]?.fullName ||
          data?.userName ||
          data?.email ||
          user?.name ||
          "Tài khoản";

        const role = String(data?.role || baseRole || "");
        const avatarUrl = String(data?.avatarUrl || "");

        setProfile({
          name: String(name),
          role,
          avatarUrl,
        });
      } catch (e) {
        console.warn("[ProfileSidebar] fetch profile error:", e);
        if (!aborted) {
          setProfile((p) => ({
            ...p,
            avatarUrl: "",
            name: p.name || user?.name || "Tài khoản",
            role: p.role || baseRole || "",
          }));
        }
      }
    }
    if (accountId) fetchProfile();
    return () => {
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const roleNorm = String(profile.role || "").toLowerCase();
  const isActive = (to) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  const items = useMemo(() => {
    if (roleNorm === "staff") {
      return [
        { to: "/profile/staff-info", label: "Thông tin nhân viên" },
        { to: "/profile/change-password", label: "Đổi mật khẩu" },
      ];
    }
    if (roleNorm === "company") {
      return [
        { to: "/profile/enterprise-info", label: "Thông tin doanh nghiệp" },
        { to: "/profile/change-password", label: "Đổi mật khẩu" },
      ];
    }
    if (roleNorm === "admin") {
      return [
        { to: "/profile/admin-info", label: "Cập nhật thông tin" },
        { to: "/profile/change-password", label: "Đổi mật khẩu" },
      ];
    }
    return [
      { to: "/profile/update-info", label: "Cập nhật thông tin" },
      { to: "/profile/vehicle-info", label: "Thông số xe" },
      { to: "/profile/change-password", label: "Đổi mật khẩu" },
    ];
  }, [roleNorm]);

  const roleLabel =
    roleNorm === "company"
      ? "Doanh nghiệp"
      : roleNorm === "staff"
      ? "Nhân viên"
      : roleNorm === "admin"
      ? "Quản trị viên"
      : roleNorm === "customer"
      ? "Khách hàng"
      : profile.role || "—";

  const avatarSrc = profile.avatarUrl || DEFAULT_AVATAR;

  /* ============ Upload handlers ============ */
  function openFilePicker() {
    setErrorMsg("");
    fileInputRef.current?.click();
  }

  function validateImage(file) {
    const okTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    const maxSizeMB = 5;
    if (!okTypes.includes(file.type)) {
      return "Vui lòng chọn ảnh PNG/JPG/WebP.";
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `Ảnh vượt quá ${maxSizeMB}MB.`;
    }
    return "";
  }

  async function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file || !accountId) return;

    const v = validateImage(file);
    if (v) {
      setErrorMsg(v);
      e.target.value = "";
      return;
    }

    // Preview tạm thời
    const objectUrl = URL.createObjectURL(file);
    setProfile((p) => ({ ...p, avatarUrl: objectUrl }));

    try {
      setUploading(true);
      setErrorMsg("");

      const fd = new FormData();
      fd.append("file", file, file.name); // field name phải là "file"

      const base = (API_BASE || "").replace(/\/+$/, "");
      const token = getStoredToken();

      const res = await fetch(`${base}/Auth/upload-avatar/${accountId}`, {
        method: "POST",
        headers: {
          // KHÔNG set 'Content-Type' ở đây
          accept: "*/*",
          authorization: token ? `Bearer ${token}` : undefined,
        },
        body: fd,
      });

      if (!res.ok) {
        throw new Error(`Upload failed (HTTP ${res.status})`);
      }

      // Server có thể trả về JSON chứa url mới, hoặc 204 No Content.
      let newUrl = "";
      try {
        const data = await res.json();
        newUrl =
          data?.avatarUrl || data?.url || data?.avatar || ""; /* tuỳ backend */
      } catch {
        /* không phải json */
      }

      // Nếu server không trả URL, refetch hoặc thêm cache-busting
      if (newUrl) {
        setProfile((p) => ({ ...p, avatarUrl: String(newUrl) }));
      } else {
        // ép reload ảnh cũ bằng query ?t=
        setProfile((p) => ({
          ...p,
          avatarUrl:
            (p.avatarUrl || DEFAULT_AVATAR).split("?t=")[0] +
            `?t=${Date.now()}`,
        }));
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Tải ảnh lên không thành công. Vui lòng thử lại.");
      // Nếu lỗi, trả preview về ảnh cũ nếu có
      setProfile((p) => ({ ...p, avatarUrl: p.avatarUrl || DEFAULT_AVATAR }));
    } finally {
      setUploading(false);
      // reset input để có thể chọn cùng file lần nữa
      e.target.value = "";
    }
  }

  return (
    <div className="profile-sidebar">
      <div className="profile-card">
        <div className="profile-avatar">
          <img
            src={avatarSrc}
            alt="avatar"
            onError={(e) => {
              e.currentTarget.src = DEFAULT_AVATAR;
            }}
          />
          {/* Nút overlay để chọn ảnh */}
          <button
            type="button"
            className="avatar-upload-btn"
            onClick={openFilePicker}
            disabled={!accountId || uploading}
            title={accountId ? "Đổi ảnh đại diện" : "Chưa xác định accountId"}
          >
            {uploading ? "Đang tải..." : "Đổi ảnh"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            style={{ display: "none" }}
            onChange={onFileChange}
          />
        </div>

        <div className="profile-title">{profile.name || "Tài khoản"}</div>
        <div className="profile-role">{roleLabel}</div>
        {errorMsg && <div className="profile-error">{errorMsg}</div>}
      </div>

      <nav className="profile-nav">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            className={`profile-link ${isActive(it.to) ? "active" : ""}`}
          >
            {it.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
