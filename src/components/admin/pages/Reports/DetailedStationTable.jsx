import React from "react";

const currency = (v) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(Number(v || 0));

export default function DetailedStationTable({ data = [] }) {
  return (
    <div
      className="detailed-table-container"
      style={{
        marginTop: 20,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        padding: 20,
        overflowX: "auto",
      }}
    >
      <h4 style={{ margin: "0 0 14px", fontWeight: 700, color: "#333" }}>
        Bảng chi tiết trạm
      </h4>

      <table
        className="station-detail-table"
        style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}
      >
        <thead>
          <tr style={{ background: "#f8f9fa" }}>
            <th style={{ textAlign: "left", padding: "12px 14px" }}>Trạm</th>
            <th style={{ textAlign: "right", padding: "12px 14px" }}>
              Doanh thu
            </th>
            <th style={{ textAlign: "center", padding: "12px 14px" }}>
              Phiên sạc
            </th>
            <th style={{ textAlign: "center", padding: "12px 14px" }}>
              Sử dụng
            </th>
            <th style={{ textAlign: "center", padding: "12px 14px" }}>
              Trạng thái
            </th>
          </tr>
        </thead>
        <tbody>
          {(data || []).map((s, i) => {
            const usageVal =
              typeof s.usage === "string"
                ? parseFloat(s.usage)
                : Number(s.usage || 0);

            const status =
              s.status ||
              (usageVal > 80
                ? "Online"
                : usageVal < 10
                ? "Cần kiểm tra"
                : "Online");

            return (
              <tr key={i} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: "12px 14px" }}>
                  {s.name || s.stationName || "N/A"}
                </td>
                <td style={{ textAlign: "right", padding: "12px 14px" }}>
                  {currency(s.revenue)}
                </td>
                <td style={{ textAlign: "center", padding: "12px 14px" }}>
                  {Number(s.sessions || s.totalSessions || 0)}
                </td>
                <td style={{ textAlign: "center", padding: "12px 14px" }}>
                  {isFinite(usageVal) ? usageVal.toFixed(1) : 0}%
                </td>
                <td style={{ textAlign: "center", padding: "12px 14px" }}>
                  <span
                    className={`status-badge ${
                      /offline/i.test(status)
                        ? "offline"
                        : /kiểm/i.test(status)
                        ? "cần-kiểm-tra"
                        : "online"
                    }`}
                    style={{
                      display: "inline-block",
                      padding: "6px 10px",
                      color: "#fff",
                      borderRadius: 6,
                      fontSize: 12,
                      background: /offline/i.test(status)
                        ? "#dc3545"
                        : /kiểm/i.test(status)
                        ? "#ffc107"
                        : "#28a745",
                    }}
                  >
                    {status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
