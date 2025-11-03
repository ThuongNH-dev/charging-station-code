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
import IncidentManager from "../pages/staff/IncidentManager";
import StaffPaymentSuccess from "../pages/staff/StaffPaymentSuccess";

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

      {/* 🔹 Đã chuyển điều hướng lên header; bỏ thanh nav nội bộ */}

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
              <Route path="incidents" element={<IncidentManager />} />
              <Route path="reports" element={<ReportPage />} />
              <Route path="invoice" element={<StaffInvoice />} />
              <Route path="*" element={<Navigate to="stations" replace />} />
            </Routes>
          </Content>
          <Foot />
        </div>
      </Layout>
    </>
  );
}