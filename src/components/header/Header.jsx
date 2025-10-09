import React, { useState } from "react";
import { Layout, Button } from "antd";
import { useNavigate, useLocation } from "react-router-dom";

const { Header } = Layout;

const Head = ({ role = "guest", isAuthenticated = false, user = null }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const items = [
    { key: "1", label: "Trang chủ", path: "/" },
    { key: "2", label: "Danh mục", path: "/stations" },
    { key: "3", label: "Dịch vụ", path: "/services" },
    { key: "4", label: "Liên hệ", path: "/contact" },
  ];

  // 🔧 SỬA Ở ĐÂY: map đường dẫn hiện tại sang key menu
  const path = location.pathname;

  let activeKey = "1";
  if (path === "/") {
    activeKey = "1";
  } else if (
    path.startsWith("/stations") ||
    path.startsWith("/booking") ||
    path.startsWith("/payment") ||       // ✅ /payment, /payment/success, /payment/fail
    path.startsWith("/charging")         // ✅ nếu có màn hình sạc
  ) {
    activeKey = "2"; // “Danh mục”
  } else if (path.startsWith("/services")) {
    activeKey = "3";
  } else if (path.startsWith("/contact")) {
    activeKey = "4";
  }

  const mainColor = "#006d32";
  const hoverColor = "#009e44";

  return (
    <Layout>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fff",
          height: 64,
          paddingInline: 20,
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        {/* Logo + Menu */}
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <img src="/logoV2.png" alt="logo" style={{ height: 100, width: "auto" }} />

          <ul
            className="custom-menu"
            style={{
              display: "flex",
              alignItems: "center",
              listStyle: "none",
              margin: 0,
              padding: 0,
              gap: 32,
              fontSize: 16,
            }}
          >
            {items.map((it) => (
              <li key={it.key} style={{ margin: 0, padding: 0 }}>
                <div
                  onClick={() => navigate(it.path)} // 👈 chuyển hướng khi click
                  className={`menu-item ${activeKey === it.key ? "active" : ""}`}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    height: 64,
                    padding: "0 4px",
                    textDecoration: "none",
                    color: activeKey === it.key ? mainColor : "#000",
                    fontWeight: activeKey === it.key ? 600 : 500,
                    cursor: "pointer", // 👈 thêm cho biết có thể click
                  }}
                >
                  {it.label}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Nút phải */}
        <div style={{ display: "flex", gap: 12 }}>
          <Button
            type="text"
            style={{
              color: mainColor,
              border: `1px solid ${mainColor}`,
              borderRadius: 6,
              padding: "6px 18px",
              fontWeight: 500,
              transition: "all .3s ease",
              background: "#fff",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = mainColor;
              e.currentTarget.style.color = "#fff";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.color = mainColor;
            }}
            onClick={() => navigate("/login")} // 👈 ví dụ thêm điều hướng
          >
            Đăng nhập
          </Button>

          <Button
            type="text"
            style={{
              color: mainColor,
              border: `1px solid ${mainColor}`,
              borderRadius: 6,
              padding: "6px 18px",
              marginLeft: 8,
              marginRight: 10,
              fontWeight: 500,
              transition: "all .3s ease",
              background: "#fff",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = mainColor;
              e.currentTarget.style.color = "#fff";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.color = mainColor;
            }}
            onClick={() => navigate("/register")} // 👈 ví dụ thêm điều hướng
          >
            Đăng kí
          </Button>
        </div>
      </Header>

      <style>{`
         .menu-item { font-weight: 500; }
        .menu-item::after {
          content: '';
          position: absolute;
          left: 0; right: 0;
          bottom: 0;
          height: 2px;
          background-color: ${mainColor};
          border-radius: 2px;
          transform: scaleX(0);
          transform-origin: center;
          transition: transform .22s ease;
        }
        .menu-item:hover { color: ${mainColor}; }
        .menu-item:hover::after { transform: scaleX(1); }
        .menu-item.active::after { transform: scaleX(1); }
      `}</style>
    </Layout>
  );
};

export default Head;
