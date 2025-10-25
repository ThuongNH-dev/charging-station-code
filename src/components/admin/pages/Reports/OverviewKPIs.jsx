// Sections/OverviewKPIs.jsx

import React from "react";
import { CaretUpOutlined, CaretDownOutlined } from "@ant-design/icons";

// =========================================================
// Các Component con (Giữ nguyên)
// =========================================================

function KPIBox({ kpi }) {
  const { value, change, isPositive, period, icon } = kpi;
  const changeClass = isPositive ? "positive" : "negative";
  const Icon = isPositive ? CaretUpOutlined : CaretDownOutlined;

  const getIcon = (name) => {
    switch (name) {
      case "cash":
        return <span className="kpi-icon">💰</span>;
      case "energy":
        return <span className="kpi-icon">⚡</span>;
      case "avg-cash":
        return <span className="kpi-icon">💸</span>;
      default:
        return null;
    }
  };

  return (
    <div className="kpi-box">
      <div className="kpi-header">
        <span className="kpi-period">{period}</span>
        {getIcon(icon)}
      </div>
      <div className="kpi-value">{value}</div>
      <div className={`kpi-change ${changeClass}`}>
        {change !== "Trung bình" && <Icon />} {change}
      </div>
    </div>
  );
}

function WarningItem({ name, usage, status, color }) {
  const statusClasses = `warning-status ${color}`;
  return (
    <div className="warning-item">
      <div className="warning-info">
        <div className="warning-name">{name}</div>
        <div className="warning-usage">Sử dụng: **{usage}**</div>
      </div>
      <div className={statusClasses}>{status}</div>
    </div>
  );
}

function StationListItem({ name, capacity, usage }) {
  return (
    <div className="station-list-item">
      <div className="station-info">
        <div className="station-name">{name}</div>
        <div className="station-capacity">{capacity}</div>
      </div>
      <div className="station-usage-percent">{usage}</div>
    </div>
  );
}

// =========================================================
// Component chính cho Sidebar
// =========================================================

export default function OverviewKPIs({ data }) {
  if (!data || !data.kpiOverview) return null;

  return (
    <div className="report-sidebar">
      {/* KPI Tổng quan */}
      <div className="kpi-total-section card">
        <h3>KPI Tổng quan</h3>
        {Object.values(data.kpiOverview).map((kpi, index) => (
          <KPIBox key={index} kpi={kpi} />
        ))}
      </div>

      <div className="sidebar-divider"></div>

      {/* Cảnh báo */}
      <div className="warnings-section card">
        <h3>Cảnh báo</h3>
        {data.warnings.map((warning, index) => (
          <WarningItem key={index} {...warning} />
        ))}
      </div>

      <div className="sidebar-divider"></div>

      {/* Danh sách trạm */}
      <div className="station-list-section card">
        <h3>Danh sách trạm</h3>
        {data.stationList.map((station, index) => (
          <StationListItem key={index} {...station} />
        ))}
      </div>
    </div>
  );
}
