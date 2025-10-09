import React, { useState } from "react";
import { Layout, Button } from "antd";
import { Link, useLocation } from "react-router-dom";
const { Header } = Layout;

const Head = ({ role = "guest", isAuthenticated = false, user = null }) => {
  const location = useLocation();
  const items = [
    { key: "1", label: "Trang chủ", path: "/" },
    { key: "2", label: "Danh mục", path: "/stations" },
    { key: "3", label: "Dịch vụ", path: "/services" },
    { key: "4", label: "Liên hệ", path: "/contact" },
  ];

  const activeKey =
    items.find((it) =>
      it.path === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(it.path)
    )?.key ?? "1";

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
          {/* Giảm size logo để cân header */}
          <img src="/logoV2.png" alt="logo" style={{ height: 100, width: "auto" }} />

          <ul
            className="custom-menu"
            style={{
              display: "flex",
              alignItems: "center",   // căn giữa cả list
              listStyle: "none",
              margin: 0,
              padding: 0,
              gap: 32,
              fontSize: 16,
            }}
          >
            {items.map((it) => (
              <li key={it.key} style={{ margin: 0, padding: 0 }}>
                <Link
                  to={it.path}
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
                  }}
                >
                  {it.label}
                </Link>
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
          bottom: 0;                 /* nếu giữ border-bottom của Header = 1px, đổi thành -1px */
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
