// DetailedStationTable.jsx
import React from "react";

const DEBUG_MODE = true;

export default function DetailedStationTable({ data = [] }) {
  if (DEBUG_MODE) console.log("[DetailedStationTable] data", data);

  return (
    <div
      className="detailed-table-container"
      style={{
        maxHeight: "500px",
        overflowY: "auto",
        overflowX: "auto",
        marginTop: "20px",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        backgroundColor: "#fff",
        padding: "20px",
      }}
    >
      <h4 style={{ marginBottom: "16px", fontWeight: "600" }}>
        Bảng chi tiết trạm
      </h4>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "15px",
          minWidth: "700px",
        }}
      >
        <thead style={{ backgroundColor: "#f9fafb" }}>
          <tr>
            <th style={{ textAlign: "left", padding: "12px 16px" }}>Trạm</th>
            <th style={{ textAlign: "center", padding: "12px 16px" }}>
              Doanh thu
            </th>
            <th style={{ textAlign: "center", padding: "12px 16px" }}>
              Phiên sạc
            </th>
            <th style={{ textAlign: "center", padding: "12px 16px" }}>
              Tỷ lệ sử dụng
            </th>
            <th style={{ textAlign: "center", padding: "12px 16px" }}>
              Trạng thái
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((s, i) => {
            const revenue = Number(s.revenue ?? 0);
            const sessions = Number(s.sessions ?? 0);
            const usage = Number(s.usage ?? 0);
            const status = s.status ?? "N/A";

            return (
              <tr key={i}>
                <td style={{ padding: "12px 16px" }}>{s.name || "N/A"}</td>
                <td style={{ textAlign: "center" }}>
                  {revenue.toLocaleString()} đ
                </td>
                <td style={{ textAlign: "center" }}>{sessions}</td>
                <td style={{ textAlign: "center" }}>{usage.toFixed(1)}%</td>
                <td style={{ textAlign: "center" }}>{status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
