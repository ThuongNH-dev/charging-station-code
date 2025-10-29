// src/components/form/Info/ProfileSidebar.jsx
import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { UserOutlined } from "@ant-design/icons";
import "./ProfileSidebar.css";
import { useAuth } from "../../../context/AuthContext";

export default function ProfileSidebar() {
  const location = useLocation();
  const { user } = useAuth();

  const role = String(user?.role || "");
  const roleNorm = role.toLowerCase();

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
    // default: customer
    return [
      { to: "/profile/update-info", label: "Cập nhật thông tin" },
      { to: "/profile/vehicle-info", label: "Thông số xe" },
      { to: "/profile/payment-info", label: "Phương thức thanh toán" },
      { to: "/profile/change-password", label: "Đổi mật khẩu" },
    ];
  }, [roleNorm]);

  const roleLabel =
    roleNorm === "company"
      ? "Doanh nghiệp"
      : roleNorm === "staff"
      ? "Nhân viên"
      : roleNorm === "customer"
      ? "Khách hàng"
      : role || "—";

  return (
    <div className="profile-sidebar">
      <div className="profile-card">
        <div className="profile-avatar">
          <UserOutlined style={{ fontSize: 34 }} />
        </div>
        <div className="profile-title">{user?.name || "Tài khoản"}</div>
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
