import React from "react";
import { Layout } from "antd";
import { NavLink, Routes, Route, Navigate } from "react-router-dom";
import Head from "../components/header/header";
import Foot from "../components/footer/footer";
import ChargerManager from "../pages/staff/ChargerManager";
import SessionManager from "../pages/staff/SessionManager";
import PaymentManager from "../pages/staff/PaymentManager";
import ReportPage from "../pages/staff/ReportPage";
import "./StaffLayout.css";

const { Content } = Layout;

export default function StaffLayout() {
  return (
    <Layout className="station-info staff-layout">
      <Head />
      
      <div className="staff-nav">
        <NavLink to="/staff/stations" className={({ isActive }) => (isActive ? "active" : "")}>
          Trụ sạc
        </NavLink>
        <NavLink to="/staff/sessions" className={({ isActive }) => (isActive ? "active" : "")}>
          Phiên sạc
        </NavLink>
        <NavLink to="/staff/payments" className={({ isActive }) => (isActive ? "active" : "")}>
          Thanh toán
        </NavLink>
        <NavLink to="/staff/incidents" className={({ isActive }) => (isActive ? "active" : "")}>
          Sự cố
        </NavLink>
        <NavLink to="/staff/reports" className={({ isActive }) => (isActive ? "active" : "")}>
          Báo cáo
        </NavLink>
      </div>

      <Content className="staff-content">
        <Routes>
          <Route path="/" element={<Navigate to="stations" replace />} />
          <Route path="stations" element={<ChargerManager />} />
          <Route path="sessions" element={<SessionManager />} />
          <Route path="payments" element={<PaymentManager />} />
          <Route path="incidents" element={
            <div className="staff-stub">
              <h2>Sự cố</h2>
              <p>Trang này sẽ được phát triển sau.</p>
            </div>
          } />
          <Route path="reports" element={<ReportPage />} />
          <Route path="*" element={<Navigate to="stations" replace />} />
        </Routes>
      </Content>

      <Foot />
    </Layout>
  );
}   