import React from "react";
import { Link, useLocation } from "react-router-dom";
import { UserOutlined } from "@ant-design/icons";
import "./ProfileSidebar.css";
import { useAuth } from "../../../context/AuthContext";

export default function ProfileSidebar() {
  const location = useLocation();
  const { user } = useAuth(); // Lấy thông tin user từ context
  const userRole = user?.role; // giả sử user.role là "Enterprise", "Business" hoặc "Personal"

  // Menu dùng chung cho cả cá nhân và doanh nghiệp
  const items =
    userRole === "Enterprise" || userRole === "Business"
      ? [
          { to: "/profile/enterprise-info", label: "Thông tin doanh nghiệp" },
          { to: "/profile/payment-info", label: "Phương thức thanh toán" },
          { to: "/profile/change-password", label: "Đổi mật khẩu" },
        ]
      : [
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
        <div className="profile-title">{user?.name || "Cá Nhân"}</div>
        <div className="profile-role">
          {userRole === "Enterprise" || userRole === "Business"
            ? "Doanh nghiệp"
            : "Cơ bản"}
        </div>
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
