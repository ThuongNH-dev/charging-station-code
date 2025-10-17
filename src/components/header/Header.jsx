import React from "react";
import { Layout, Button } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AccountMenu from "../dropdown/Menu";
import "./Header.css";

const { Header } = Layout;

export default function Head() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, userRole, userName, logout } = useAuth();

  // ===== MENU TRÁI =====
  const items = [
    { key: "1", label: "Trang chủ", path: "/" },
    { key: "2", label: "Danh mục", path: "/stations" },
    { key: "3", label: "Dịch vụ", path: "/services" },
    { key: "4", label: "Liên hệ", path: "/contact" },
  ];

  const path = location.pathname;
  let activeKey = "1";

  if (/^\/(stations|booking|payment|charging)/.test(path)) activeKey = "2";
  else if (path.startsWith("/services")) activeKey = "3";
  else if (path.startsWith("/contact")) activeKey = "4";
  else if (path === "/") activeKey = "1";

  // ===== PHẦN PHẢI: thay đổi theo role =====
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

    switch (userRole) {
      // case "Admin":
      //   return (
      //     <>
      //       <span className="user-chip">🛡️ Admin: {userName || "Quản trị"}</span>
      //       <Button className="btn-outline" type="text" onClick={() => navigate("/admin")}>
      //         Bảng điều khiển
      //       </Button>
      //       <Button
      //         className="btn-outline"
      //         type="text"
      //         onClick={() => {
      //           logout();
      //           navigate("/");
      //         }}
      //       >
      //         Đăng xuất
      //       </Button>
      //     </>
      //   );

      case "Customer":
      default:
        return (
          <>
            <div>
              <AccountMenu/>
            </div>
          </>
        );
    }
  };

  return (
    <Layout>
      <Header className="app-header">
        {/* ===== BÊN TRÁI: Logo + Menu ===== */}
        <div className="left">
          <img
            src="/logoV2.png"
            alt="logo"
            className="logo"
            onClick={() => navigate("/")}
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

        {/* ===== BÊN PHẢI: Theo role ===== */}
        <div className="actions">{renderRight()}</div>
      </Header>
    </Layout>
  );
}
