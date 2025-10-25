// =========================================================
// OverviewKPIs.jsx — HOÀN CHỈNH + DEBUG + % thống nhất
// =========================================================

import React from "react";
import { CaretUpOutlined, CaretDownOutlined } from "@ant-design/icons";
import "./OverviewKPIs.css";

const DEBUG_MODE = true;

// 🔹 KPIBox
function KPIBox({ kpi }) {
  if (!kpi) return null;
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
      case "duration":
        return <span className="kpi-icon">⏱️</span>;
      default:
        return <span className="kpi-icon">📊</span>;
    }
  };

  if (DEBUG_MODE) console.log("[KPIBox]", kpi);

  return (
    <div className="kpi-box">
      <div className="kpi-header">
        {getIcon(icon)}
        <span className="kpi-period">{period || "Chỉ số"}</span>
      </div>
      <div className="kpi-value">{value || "0"}</div>
      <div className={`kpi-change ${changeClass}`}>
        {change && <Icon />} {change || "0%"}
      </div>
    </div>
  );
}

// 🔹 WarningItem
function WarningItem({ name, usage, status, color }) {
  if (!name) return null;

  const statusColorMap = {
    normal: "green",
    warning: "yellow",
    critical: "red",
  };
  const statusClasses = `warning-status ${
    color || statusColorMap[status?.toLowerCase()] || ""
  }`;

  if (DEBUG_MODE) console.log("[WarningItem]", { name, usage, status });

  return (
    <div className="warning-item">
      <div className="warning-info">
        <div className="warning-name">{name}</div>
        <div className="warning-usage">
          Sử dụng: <strong>{usage != null ? `${usage}%` : "0%"}</strong>
        </div>
      </div>
      <div className={statusClasses}>{status || "Chưa rõ"}</div>
    </div>
  );
}

// 🔹 StationListItem
function StationListItem({ name, capacity, usage }) {
  if (DEBUG_MODE) console.log("[StationListItem]", { name, capacity, usage });

  return (
    <div className="station-list-item">
      <div className="station-info">
        <div className="station-name">{name || "Không xác định"}</div>
        <div className="station-capacity">{capacity || "N/A"}</div>
      </div>
      <div className="station-usage-percent">
        {usage != null ? `${usage}%` : "0%"}
      </div>
    </div>
  );
}

// 🔹 Component chính
export default function OverviewKPIs({ data }) {
  if (DEBUG_MODE) console.log("[OverviewKPIs] props", data);

  if (!data)
    return <div className="report-sidebar empty">Đang tải dữ liệu KPI...</div>;

  const { kpiOverview = [], warnings = [], stationList = [] } = data;

  return (
    <div className="report-sidebar">
      <div className="kpi-total-section card">
        <h3>KPI Tổng quan</h3>
        {Array.isArray(kpiOverview) && kpiOverview.length > 0 ? (
          kpiOverview.map((kpi, index) => <KPIBox key={index} kpi={kpi} />)
        ) : (
          <p className="empty-msg">Không có dữ liệu KPI.</p>
        )}
      </div>

      <div className="sidebar-divider"></div>

      <div className="warnings-section card">
        <h3>Cảnh báo</h3>
        {warnings.length > 0 ? (
          warnings.map((warning, index) => (
            <WarningItem key={index} {...warning} />
          ))
        ) : (
          <p className="empty-msg">Không có cảnh báo.</p>
        )}
      </div>

      <div className="sidebar-divider"></div>

      <div className="station-list-section card">
        <h3>Danh sách trạm</h3>
        {stationList.length > 0 ? (
          stationList.map((station, index) => (
            <StationListItem key={index} {...station} />
          ))
        ) : (
          <p className="empty-msg">Chưa có dữ liệu trạm.</p>
        )}
      </div>
    </div>
  );
}
