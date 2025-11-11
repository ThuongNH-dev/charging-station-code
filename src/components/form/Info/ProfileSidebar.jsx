import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./ProfileSidebar.css";
import { useAuth } from "../../../context/AuthContext";
import { getApiBase } from "../../../utils/api";

/** API base từ utils */
const API_BASE = getApiBase();

const DEFAULT_AVATAR =
  "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg";

/* ===== Helpers đọc storage/JWT ===== */
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

/** Lấy accountId đồng bộ từ storage/JWT; KHÔNG dùng fallback số cứng */
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

  // Thiếu accountId ⇒ để effect async dò bằng customerId
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

/** Nếu thiếu accountId mà có customerId → gọi GET /Auth (list) để match */
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

  // accountId trong state; nếu thiếu sẽ được dò bằng customerId
  const [accountId, setAccountId] = useState(() => resolveAccountIdSync());

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

  // Menu theo role
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
