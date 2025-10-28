import React from "react";
import { Layout, Button, Tooltip, Dropdown } from "antd"; // 👈 thêm Dropdown
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AccountMenu from "../others/Menu";
import { FileSearchOutlined, FileTextOutlined } from "@ant-design/icons";
import "./Header.css";
const { Header } = Layout;

export default function Head() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, userRole: ctxRole, userName: ctxName } = useAuth();

  const role = (user?.role || ctxRole || "").toLowerCase();
  const isStaff = role === "staff";
  const isAdmin = role === "admin";
  const isCustomer = role === "customer";
  const isCompany = role === "company";
  const userName = user?.name || user?.userName || ctxName || "User";

  const items = isStaff
    ? [
        { key: "s1", label: "Quản lý trụ sạc", path: "/staff/stations" },
        { key: "s2", label: "Phiên sạc", path: "/staff/sessions" },
        { key: "s3", label: "Thanh toán", path: "/staff/payments" },
        { key: "s4", label: "Báo cáo", path: "/staff/reports" },
      ]
    : isCompany
    ? [
        { key: "c1", label: "Quản lý nguồn lực", path: "/company" },
        { key: "3", label: "Dịch vụ", path: "/services" },
        { key: "4", label: "Liên hệ", path: "/contact" },
      ]
    : [
        { key: "1", label: "Trang chủ", path: "/" },
        // key "2" vẫn là Danh mục (parent), nhưng sẽ hiển thị Dropdown
        { key: "2", label: "Danh mục", path: "/stations" },
        { key: "3", label: "Dịch vụ", path: "/services" },
        { key: "4", label: "Liên hệ", path: "/contact" },
      ];

  const path = location.pathname;
  let activeKey = "1";

  if (isStaff) {
    if (path.startsWith("/staff/stations")) activeKey = "s1";
    else if (path.startsWith("/staff/sessions")) activeKey = "s2";
    else if (path.startsWith("/staff/payments")) activeKey = "s3";
    else if (path.startsWith("/staff/reports")) activeKey = "s4";
  } else if (isCompany) {
    if (path.startsWith("/company")) activeKey = "c1";
    else if (path.startsWith("/services")) activeKey = "3";
    else if (path.startsWith("/contact")) activeKey = "4";
    else if (path === "/") activeKey = "1";
  } else {
    if (/^\/(stations|booking|payment|charging)/.test(path)) activeKey = "2";
    else if (path.startsWith("/services")) activeKey = "3";
    else if (path.startsWith("/contact")) activeKey = "4";
    else if (path === "/") activeKey = "1";
  }

  // ▶ Menu con cho "Danh mục"
  const danhMucMenuItems = [
    {
      key: "dm-1",
      label: "Tìm trạm sạc",
      onClick: () => navigate("/stations"), // link cũ của Danh mục
    },
    {
      key: "dm-2",
      label: "Phiên sạc",
      onClick: () => navigate("/charging/start"), // trang phiên sạc của user
    },
  ];

  const renderRight = () => {
    if (!isAuthenticated) {
      return (
        <>
          <Button className="btn-outline" type="text" onClick={() => navigate("/login")}>
            Đăng nhập
          </Button>
          <Button className="btn-outline" type="text" onClick={() => navigate("/register/select")}>
            Đăng ký
          </Button>
        </>
      );
    }

    return (
      <div className="header-right">
        {isCustomer && (
          <Tooltip title="Phiên đặt chỗ">
            <FileSearchOutlined className="history-icon" onClick={() => navigate("/user/history")} />
          </Tooltip>
        )}

        {(isCustomer || isCompany) && (
          <Tooltip title="Hóa đơn phiên sạc">
            <FileTextOutlined className="invoice-icon" onClick={() => navigate("/invoiceSummary")} />
          </Tooltip>
        )}
        <AccountMenu />
      </div>
    );
  };

  return (
    <Layout>
      <Header className="app-header">
        <div className="left">
          <img src="/logoV2.png" alt="logo" className="logo" />

          {!isAdmin && (
            <ul className="nav">
              {items.map((item) => {
                const isDanhMuc = item.key === "2" && !isStaff && !isCompany;
                if (isDanhMuc) {
                  // Bọc riêng "Danh mục" bằng Dropdown
                  return (
                    <li key={item.key}>
                      <Dropdown
                        trigger={["hover", "click"]}
                        placement="bottom"
                        menu={{ items: danhMucMenuItems, onClick: ({ domEvent }) => domEvent.stopPropagation() }}
                      >
                        <div
                          className={`nav-item ${activeKey === item.key ? "active" : ""} nav-dropdown`}
                          onClick={(e) => e.preventDefault()} // click vào parent vẫn đi /stations
                        >
                          {item.label} <span className="caret">▾</span>
                        </div>
                      </Dropdown>
                    </li>
                  );
                }

                return (
                  <li key={item.key}>
                    <div
                      className={`nav-item ${activeKey === item.key ? "active" : ""}`}
                      onClick={() => navigate(item.path)}
                    >
                      {item.label}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="actions">{renderRight()}</div>
      </Header>
    </Layout>
  );
}
