// src/components/admin/layout/AdminLayout.jsx
import React from "react";
import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Head from "../../header/header";
import "./AdminLayout.css";

const { Content } = Layout;

export default function AdminLayout() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Sidebar bên trái */}
      <Sidebar />

      {/* Phần bên phải: Header + Content */}
      <Layout className="admin-main">
        <Head /> {/* Header chung */}
        <Content className="admin-content">
          {/* ✅ Render nội dung của route con (StationManagement, v.v.) */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
