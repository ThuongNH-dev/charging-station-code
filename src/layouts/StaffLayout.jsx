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
import StationManager from "../pages/staff/StationManager"; // ✅ Trang quản lý trạm sạc
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

      {/* 🔹 Thanh điều hướng chính */}
      <div className={`staff-nav ${isFixed ? "fixed" : ""}`}>
        <NavLink
          to="/staff/stations"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Trạm sạc
        </NavLink>
        <NavLink
          to="/staff/chargers"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Trụ sạc
        </NavLink>
        <NavLink
          to="/staff/sessions"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Phiên sạc
        </NavLink>
        <NavLink
          to="/staff/payments"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Thanh toán
        </NavLink>
        <NavLink
          to="/staff/incidents"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Sự cố
        </NavLink>
        <NavLink
          to="/staff/reports"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Báo cáo
        </NavLink>
      </div>

      {/* 🔹 Layout nội dung */}
      <Layout className="station-info staff-layout">
        <Content className="staff-content">
          <Routes>
            {/* ✅ Mặc định vào /staff sẽ điều hướng đến /staff/stations */}
            <Route path="/" element={<Navigate to="stations" replace />} />

            {/* ✅ Quản lý trạm sạc */}
            <Route path="stations" element={<StationManager />} />

            {/* ✅ Quản lý trụ sạc */}
            <Route path="chargers" element={<ChargerManager />} />

            {/* ✅ Các phần còn lại */}
            <Route path="sessions" element={<SessionManager />} />
            <Route path="payments" element={<PaymentManager />} />
            <Route path="reports" element={<ReportPage />} />

            <Route
              path="incidents"
              element={
                <div className="staff-stub">
                  <h2>Sự cố</h2>
                  <p>Trang này sẽ được phát triển sau.</p>
                </div>
              }
            />

            {/* ✅ Route ẩn — Hóa đơn */}
            <Route path="invoice" element={<StaffInvoice />} />

            {/* ✅ fallback */}
            <Route path="*" element={<Navigate to="stations" replace />} />
          </Routes>
        </Content>
        <Foot />
      </Layout>
    </>
  );
}
