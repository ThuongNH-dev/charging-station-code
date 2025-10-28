// src/components/form/Info/ProfileSidebar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { UserOutlined } from "@ant-design/icons";
import "./ProfileSidebar.css";
import { useAuth } from "../../../context/AuthContext";

export default function ProfileSidebar() {
  const location = useLocation();
  const { user } = useAuth();

  const role = String(user?.role || "");
  const roleNorm = role.toLowerCase();
  const isCompany = roleNorm === "company";
  const isCustomer = roleNorm === "customer";

  // Customer: 4 mục | Company: 2 mục (Thông tin + Đổi mật khẩu)
  const items = isCompany
    ? [
        { to: "/profile/enterprise-info", label: "Thông tin doanh nghiệp" },
        { to: "/profile/change-password", label: "Đổi mật khẩu" },
      ]
    : [
        { to: "/profile/update-info", label: "Cập nhật thông tin" },
        { to: "/profile/vehicle-info", label: "Thông số xe" },
        { to: "/profile/payment-info", label: "Phương thức thanh toán" },
        { to: "/profile/change-password", label: "Đổi mật khẩu" },
      ];

  // helper: active khi đường dẫn khớp đầu (để không bị mất active ở route con)
  const isActive = (to) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <div className="profile-sidebar">
      <div className="profile-card">
        <div className="profile-avatar">
          <UserOutlined style={{ fontSize: 34 }} />
        </div>
        <div className="profile-title">{user?.name || "Tài khoản"}</div>
        <div className="profile-role">
          {isCompany ? "Doanh nghiệp" : isCustomer ? "Khách hàng" : role || "—"}
        </div>
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
