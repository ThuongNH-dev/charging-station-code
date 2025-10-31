import React, { useEffect, useState } from "react";
import { Layout } from "antd";
import { NavLink, Routes, Route, Navigate } from "react-router-dom";
import Head from "../components/header/header";
import Foot from "../components/footer/footer";
import ChargerManager from "../pages/staff/ChargerManager";
import SessionManager from "../pages/staff/SessionManager";
import PaymentManager from "../pages/staff/PaymentManager";
import ReportPage from "../pages/staff/ReportPage";
import StaffInvoice from "../pages/staff/StaffInvoice";
import StationManager from "../pages/staff/StationManager";
import "./StaffLayout.css";

const { Content } = Layout;

export default function StaffLayout() {
  const [isFixed, setIsFixed] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsFixed(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <Head />

      {/* 🔹 Thanh điều hướng staff */}
      <div className={`staff-nav ${isFixed ? "fixed" : ""}`}>
        <NavLink to="/staff/stations" className={({ isActive }) => (isActive ? "active" : "")}>
          Trạm sạc
        </NavLink>
        <NavLink to="/staff/chargers" className={({ isActive }) => (isActive ? "active" : "")}>
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

      {/* 🔹 Placeholder giữ chỗ khi nav fixed */}
      {isFixed && <div className="nav-placeholder"></div>}

      {/* 🔹 Layout nội dung */}
      <Layout className="staff-layout">
        <div className="staff-wrapper">
          <Content className="staff-content">
            <Routes>
              <Route path="/" element={<Navigate to="stations" replace />} />
              <Route path="stations" element={<StationManager />} />
              <Route path="chargers" element={<ChargerManager />} />
              <Route path="sessions" element={<SessionManager />} />
              <Route path="payments" element={<PaymentManager />} />
              <Route path="reports" element={<ReportPage />} />
              <Route path="invoice" element={<StaffInvoice />} />
              <Route
                path="incidents"
                element={
                  <div className="staff-stub">
                    <h2>Sự cố</h2>
                    <p>Trang này sẽ được phát triển sau.</p>
                  </div>
                }
              />
              <Route path="*" element={<Navigate to="stations" replace />} />
            </Routes>
          </Content>
          <Foot />
        </div>
      </Layout>
    </>
  );
}
