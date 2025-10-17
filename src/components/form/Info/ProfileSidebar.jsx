import React from "react";
import { Link, useLocation } from "react-router-dom";
import { UserOutlined } from "@ant-design/icons";
import "./ProfileSidebar.css";

export default function ProfileSidebar() {
  const location = useLocation();
  const items = [
    { to: "/profile/update-info", label: "Cập nhật thông tin" },
    { to: "/profile/vehicle-info", label: "Thông số xe" },
    { to: "/profile/payment-info", label: "Phương thức thanh toán" },
    { to: "/profile/change-password", label: "Đổi mật khẩu" },
  ];

  return (
    <div className="profile-sidebar">
      <div className="profile-card">
        <div className="profile-avatar">
          <UserOutlined style={{ fontSize: 34 }} />
        </div>
        <div className="profile-title">Cá Nhân</div>
        <div className="profile-role">Cơ Bản</div>
      </div>

      <nav className="profile-nav">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            className={`profile-link ${
              location.pathname === it.to ? "active" : ""
            }`}
          >
            {it.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
