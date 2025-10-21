import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DashboardOutlined,
  ThunderboltOutlined,
  UserOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import "./Sidebar.css";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

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
      key: "reports",
      label: "Báo cáo & Thống kê",
      path: "/admin/reports",
      icon: <BarChartOutlined />,
    },
  ];

  return (
    <div className="admin-sidebar">
      <h2 className="sidebar-title">⚡ ADMIN</h2>
      <ul className="sidebar-menu">
        {menuItems.map((item) => (
          <li
            key={item.key}
            className={`menu-item ${
              location.pathname.includes(item.path) ? "active" : ""
            }`}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
