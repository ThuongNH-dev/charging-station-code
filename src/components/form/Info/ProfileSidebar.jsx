import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./ProfileSidebar.css";
import { useAuth } from "../../../context/AuthContext";

/** Nếu dự án bạn có util getApiBase(): */
// import { getApiBase } from "../../../utils/api";
// const API_BASE = getApiBase();

/** Chưa có thì dùng hằng này khi dev: */
const API_BASE = "https://localhost:7268/api";

const DEFAULT_AVATAR =
  "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg";

/* ===== Helpers đọc storage/JWT để suy ra accountId ===== */
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

function resolveAccountId() {
  const s1 = sessionStorage.getItem("accountId");
  const s2 = localStorage.getItem("accountId");
  if (s1 && !isNaN(+s1)) return +s1;
  if (s2 && !isNaN(+s2)) return +s2;

  const u = getStoredUser();
  const token = u?.token || localStorage.getItem("token") || "";
  const payload = token ? decodeJwtPayload(token) : null;

  // Chỉnh key claim theo BE của bạn nếu khác
  const idFromClaim =
    payload?.nameid || payload?.nameId || payload?.sub || payload?.accountId;

  if (idFromClaim && !isNaN(+idFromClaim)) return +idFromClaim;

  // Fallback khi dev/test (khớp mẫu bạn gửi)
  return 4;
}

export default function ProfileSidebar() {
  const location = useLocation();
  const { user } = useAuth();

  // ---- Lấy role từ AuthContext trước, sau đó có thể ghi đè từ API (nếu cần) ----
  const baseRole = String(user?.role || "");
  const [profile, setProfile] = useState({
    name: user?.name || "",
    role: baseRole,
    avatarUrl: "",
  });

  const accountId = useMemo(() => resolveAccountId(), []);

  useEffect(() => {
    let aborted = false;

    async function fetchProfile() {
      try {
        const url = `${API_BASE}/Auth/${accountId}`;
        const res = await fetch(url, { headers: { accept: "*/*" } });
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

  // Menu theo role (giữ nguyên như bạn đang có)
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
    // default: customer
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
        </div>
        <div className="profile-title">{profile.name || "Tài khoản"}</div>
        <div className="profile-role">{roleLabel}</div>
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
