import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DashboardOutlined,
  ThunderboltOutlined,
  UserOutlined,
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import "./Sidebar.css";

export default function Sidebar({ collapsed, onCollapseChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use prop if provided, otherwise use internal state (backward compatibility)
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = collapsed !== undefined ? collapsed : internalCollapsed;
  const setIsCollapsed = onCollapseChange || setInternalCollapsed;

  const menuItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      path: "/admin/dashboard",
      icon: <DashboardOutlined />,
    },
    {
      key: "stations",
      label: "Trạm & Điểm sạc",
      path: "/admin/stations",
      icon: <ThunderboltOutlined />,
    },
    {
      key: "users",
      label: "Người dùng",
      path: "/admin/users",
      icon: <UserOutlined />,
    },
    {
   key: "invoices",
   label: "Quản lý Hóa đơn",
   path: "/admin/invoices-admin",
   icon: <BarChartOutlined />,
 },
    {
      key: "reports",
      label: "Báo cáo & Thống kê",
      path: "/admin/reports",
      icon: <BarChartOutlined />,
    },
  ];

  return (
    <div className={`admin-sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <button
          className="sidebar-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </button>
        <h2 className="sidebar-title">
          <span className="sidebar-icon">⚡</span>
          {!isCollapsed && <span className="sidebar-title-text">ADMIN</span>}
        </h2>
      </div>
      <ul className="sidebar-menu">
        {menuItems.map((item) => (
          <li
            key={item.key}
            className={`menu-item ${
              location.pathname.includes(item.path) ? "active" : ""
            }`}
            onClick={() => navigate(item.path)}
            title={isCollapsed ? item.label : ""}
          >
            <span className="menu-icon">{item.icon}</span>
            {!isCollapsed && <span className="menu-label">{item.label}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
