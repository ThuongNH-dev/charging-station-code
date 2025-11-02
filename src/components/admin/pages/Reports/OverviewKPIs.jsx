// =========================================================
// OverviewKPIs.jsx — HOÀN CHỈNH (khớp data từ Reports.jsx)
// props.data = { kpi, warnings, stationTable, ... }
// =========================================================

import React from "react";
import { CaretUpOutlined, CaretDownOutlined } from "@ant-design/icons";
import "./OverviewKPIs.css";

const fmt = (n) => {
  if (n === null || n === undefined || n === "") return "—";
  if (typeof n === "number") return n.toLocaleString("vi-VN");
  if (typeof n === "string") return n;
  return "—";
};

const IconByKey = ({ k }) => {
  switch (k) {
    case "revenue":
      return <span className="kpi-emoji">💰</span>;
    case "energy":
      return <span className="kpi-emoji">⚡</span>;
    case "avgRevenue":
      return <span className="kpi-emoji">💸</span>;
    case "duration":
      return <span className="kpi-emoji">⏱️</span>;
    default:
      return <span className="kpi-emoji">📊</span>;
  }
};

function KPIBox({ title, value, change, positive, iconKey }) {
  const Arrow = positive ? CaretUpOutlined : CaretDownOutlined;
  return (
    <div
      className="kpi-row"
      title={title === "Tổng năng lượng" ? "Tổng lượng điện đã sạc (kWh)" : ""}
    >
      <div className="kpi-left">
        <IconByKey k={iconKey} />
        <div className="kpi-title">{title}</div>
      </div>
      <div className="kpi-right">
        <div className="kpi-value">{fmt(value)}</div>
        {!!change && (
          <div className={`kpi-change ${positive ? "up" : "down"}`}>
            <Arrow />
            <span>{change}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function WarningItem({ name, usage, status, color }) {
  const badge =
    (color && color.toLowerCase()) ||
    (parseFloat(usage) >= 90
      ? "danger"
      : parseFloat(usage) <= 20
      ? "warning"
      : "success");
  return (
    <div className="warn-row">
      <div className="warn-info">
        <div className="warn-name">{name || "Không xác định"}</div>
        <div className="warn-sub">
          Sử dụng: <b>{usage ?? 0}%</b>
        </div>
      </div>
      <div className={`warn-badge ${badge}`}>
        {status ||
          (badge === "danger"
            ? "Quá tải"
            : badge === "warning"
            ? "Ít sử dụng"
            : "Tốt")}
      </div>
    </div>
  );
}

function StationItem({ name, capacity, usage }) {
  return (
    <div className="station-row">
      <div className="station-info">
        <div className="station-name">{name || "N/A"}</div>
        <div className="station-sub">{capacity || "—"}</div>
      </div>
      <div className="station-usage">{usage != null ? `${usage}%` : "0%"}</div>
    </div>
  );
}

export default function OverviewKPIs({ data }) {
  if (!data) return null;

  // data.kpi là object từ calculateKpiOverview()
  const k = data.kpi || {};
  // Một số field của bạn đã được format sẵn trong utils (VD: totalRevenue là "x ₫")
  const kpiItems = [
    {
      title: "Tổng doanh thu",
      value: k.totalRevenue, // đã format "₫" từ utils
      change: k.revenuePercent != null ? `${k.revenuePercent}%` : "",
      positive: parseFloat(k.revenuePercent || 0) >= 0,
      iconKey: "revenue",
    },
    {
      title: "Tổng năng lượng",
      value:
        typeof k.totalEnergy === "number"
          ? `${k.totalEnergy.toFixed(2)} kWh`
          : k.totalEnergy || "—",
      change: k.energyPercent != null ? `${k.energyPercent}%` : "",
      positive: parseFloat(k.energyPercent || 0) >= 0,
      iconKey: "energy",
    },
    {
      title: "Doanh thu TB / phiên",
      value: k.avgRevenuePerSession, // đã format "₫"
      change: "",
      positive: true,
      iconKey: "avgRevenue",
    },
    {
      title: "Thời lượng TB / phiên",
      value: k.avgDurationPerSession, // "Xm Ys"
      change: "",
      positive: true,
      iconKey: "duration",
    },
  ];

  const warnings = Array.isArray(data.warnings) ? data.warnings : [];
  // Dùng stationTable từ data, map sang sidebar list gọn
  const stationList =
    (data.stationTable || []).slice(0, 8).map((s) => ({
      name: s.name || s.stationName,
      capacity: s.capacity || "—",
      usage:
        typeof s.usage === "string"
          ? s.usage.replace("%", "")
          : Number.isFinite(s.usage)
          ? s.usage.toFixed(1)
          : 0,
    })) || [];

  return (
    <aside className="sidebar">
      <div className="panel">
        <h3>KPI Tổng quan</h3>
        {kpiItems.map((i, idx) => (
          <KPIBox key={idx} {...i} />
        ))}
      </div>

      <div className="panel">
        <h3>Cảnh báo</h3>
        {warnings.length ? (
          warnings.map((w, i) => <WarningItem key={i} {...w} />)
        ) : (
          <div className="empty">Không có cảnh báo.</div>
        )}
      </div>

      <div className="panel">
        <h3>Danh sách trạm</h3>
        {stationList.length ? (
          stationList.map((s, i) => <StationItem key={i} {...s} />)
        ) : (
          <div className="empty">Chưa có dữ liệu trạm.</div>
        )}
      </div>
    </aside>
  );
}
