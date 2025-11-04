import React from "react";

const currency = (v) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(Number(v || 0));

export default function AreaBox({ name, data = {} }) {
  const revenue = Number(data.revenue ?? 0);
  const sessions = Number(data.sessions ?? data.totalSessions ?? 0);
  const usage = Number(data.usagePercent ?? data.avgUsage ?? data.usage ?? 0);

  const width = Math.max(0, Math.min(100, isFinite(usage) ? usage : 0));

  return (
    <div
      className="area-box"
      style={{
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      <h5
        className="area-name"
        style={{ margin: 0, color: "#6c757d", fontWeight: 600 }}
      >
        {name}
      </h5>

      <div
        className="area-revenue"
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: "#007bff",
          margin: "8px 0 10px",
        }}
      >
        {currency(revenue)}
      </div>

      <div className="area-sessions-usage" style={{ color: "#333" }}>
        {sessions} phiên • Sử dụng TB {width.toFixed(1)}%
      </div>

      <div
        className="usage-bar-wrapper"
        style={{
          height: 6,
          width: "100%",
          background: "#e9ecef",
          borderRadius: 4,
          marginTop: 10,
        }}
      >
        <div
          className="usage-bar"
          style={{
            width: `${width}%`,
            height: "100%",
            background: "#007bff",
            borderRadius: 4,
            transition: "width .4s ease",
          }}
        />
      </div>
    </div>
  );
}
