// Header.jsx
import React from "react";
import { Layout, Button } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AccountMenu from "../others/Menu";
import "./Header.css";

const { Header } = Layout;

export default function Head() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout, userRole: ctxRole, userName: ctxName } = useAuth();

  // Lấy role/name an toàn
  const role = (user?.role || ctxRole || "").toLowerCase();
  const isStaff = role === "staff";
  const userName = user?.name || user?.userName || ctxName || "User";

  // ===== MENU TRÁI =====
  const items = isStaff
    ? [
        { key: "s1", label: "Quản lý trụ sạc", path: "/staff/stations" },
        { key: "s2", label: "Phiên sạc", path: "/staff/sessions" },
        { key: "s3", label: "Thanh toán", path: "/staff/payments" },
        { key: "s4", label: "Báo cáo", path: "/staff/reports" },
      ]
    : [
        { key: "1", label: "Trang chủ", path: "/" },
        { key: "2", label: "Danh mục", path: "/stations" },
        { key: "3", label: "Dịch vụ", path: "/services" },
        { key: "4", label: "Liên hệ", path: "/contact" },
      ];

  const path = location.pathname;
  let activeKey = isStaff ? "s1" : "1";

  if (isStaff) {
    if (path.startsWith("/staff/stations")) activeKey = "s1";
    else if (path.startsWith("/staff/sessions")) activeKey = "s2";
    else if (path.startsWith("/staff/payments")) activeKey = "s3";
    else if (path.startsWith("/staff/reports")) activeKey = "s4";
  } else {
    if (/^\/(stations|booking|payment|charging)/.test(path)) activeKey = "2";
    else if (path.startsWith("/services")) activeKey = "3";
    else if (path.startsWith("/contact")) activeKey = "4";
    else if (path === "/") activeKey = "1";
  }

  // ===== PHẦN PHẢI: dùng menu cũ (AccountMenu) cho Staff như yêu cầu =====
  const renderRight = () => {
    if (!isAuthenticated) {
      return (
        <>
          <Button className="btn-outline" type="text" onClick={() => navigate("/login")}>
            Đăng nhập
          </Button>
          <Button className="btn-outline" type="text" onClick={() => navigate("/register")}>
            Đăng ký
          </Button>
        </>
      );
    }
    // Dùng đúng menu cũ cho cả Staff (và Customer nếu bạn muốn)
    return <AccountMenu />;
  };

  return (
    <Layout>
      <Header className="app-header">
        {/* ===== BÊN TRÁI: Logo + Menu (đổi theo role) ===== */}
        <div className="left">
          <img
            src="/logoV2.png"
            alt="logo"
            className="logo"
            onClick={() => navigate(isStaff ? "/staff/stations" : "/")}
          />
          <ul className="nav">
            {items.map((item) => (
              <li key={item.key}>
                <div
                  className={`nav-item ${activeKey === item.key ? "active" : ""}`}
                  onClick={() => navigate(item.path)}
                >
                  {item.label}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* ===== BÊN PHẢI ===== */}
        <div className="actions">{renderRight()}</div>
      </Header>
    </Layout>
  );
}
