// =========================================================
// ReportContent.jsx — PHIÊN BẢN HOÀN CHỈNH (DEBUG TOÀN DIỆN + HEATMAP 7x24)
// =========================================================

import React from "react";

const DEBUG_MODE = true;

// =========================================================
// 🔹 Component hiển thị từng khu vực
// =========================================================
function AreaBox({ name, data = {} }) {
  const revenue = Number(data.revenue ?? 0);
  const sessions = Number(data.sessions ?? 0);
  const avgUsage = Number(data.avgUsage ?? 0);

  if (DEBUG_MODE) {
    console.log(`[AreaBox] region=${name}`, { revenue, sessions, avgUsage });
  }

  return (
    <div className="area-box">
      <h5 className="area-name">{name}</h5>
      <div className="area-revenue">{revenue.toLocaleString()} đ</div>
      <div className="area-sessions-usage">
        {sessions} phiên - Sử dụng TB {avgUsage.toFixed(1)}%
      </div>
    </div>
  );
}

// =========================================================
// 🔹 Bảng chi tiết trạm
// =========================================================
function DetailedStationTable({ data = [] }) {
  if (DEBUG_MODE) {
    console.log("[DetailedStationTable] data", data);
  }

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
        className="station-detail-table"
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
              <tr
                key={i}
                style={{
                  borderBottom: "1px solid #f0f0f0",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f7f9fc")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <td style={{ padding: "12px 16px" }}>{s.name || "N/A"}</td>
                <td style={{ textAlign: "center" }}>
                  {revenue.toLocaleString()} đ
                </td>
                <td style={{ textAlign: "center" }}>{sessions}</td>
                <td style={{ textAlign: "center" }}>{usage.toFixed(1)}%</td>
                <td style={{ textAlign: "center" }}>
                  <span
                    className="status-badge"
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background:
                        status.toLowerCase() === "open"
                          ? "#e8f5e9"
                          : status.toLowerCase() === "closed"
                          ? "#ffebee"
                          : "#f1f1f1",
                      color:
                        status.toLowerCase() === "open"
                          ? "#2e7d32"
                          : status.toLowerCase() === "closed"
                          ? "#c62828"
                          : "#555",
                      fontWeight: 500,
                      textTransform: "capitalize",
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

// =========================================================
// 🔹 Biểu đồ heatmap 7x24 theo giờ
// =========================================================
function renderHourlyHeatmap(data = []) {
  if (DEBUG_MODE) {
    console.log("[Heatmap] hourly data", data);
  }

  if (!data.length) return <div>Không có dữ liệu biểu đồ theo giờ</div>;

  const days = [...new Set(data.map((d) => d.date))];

  return (
    <div style={{ overflowX: "auto", marginTop: "20px" }}>
      <table style={{ borderCollapse: "collapse", minWidth: "900px" }}>
        <thead>
          <tr>
            <th>Giờ / Ngày</th>
            {days.map((day) => (
              <th key={day} style={{ padding: "4px 8px" }}>
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(24).keys()].map((hour) => (
            <tr key={hour}>
              <td style={{ padding: "4px 8px", fontWeight: "bold" }}>
                {hour}:00
              </td>
              {days.map((day) => {
                const entry = data.find(
                  (d) => d.date === day && d.hour === hour
                );
                const value = entry?.value || 0;
                return (
                  <td
                    key={day}
                    style={{
                      padding: "4px 8px",
                      background: `rgba(66, 133, 244, ${Math.min(
                        value / 100,
                        1
                      )})`,
                      color: value > 50 ? "#fff" : "#000",
                      textAlign: "center",
                      fontSize: "12px",
                    }}
                  >
                    {value.toFixed(1)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =========================================================
// 🔹 Stacked Bar Chart & Pie Chart
// =========================================================
function renderStackedBarChart(data = []) {
  if (DEBUG_MODE) console.log("[StackedBar] data", data);

  if (!data.length) return <div>Không có dữ liệu doanh thu theo gói</div>;

  const max = Math.max(...data.map((d) => d.total || 0));
  const colorMap = {
    "Tieu chuan": "#4285F4",
    "Cao cap": "#34A853",
    Bac: "#FBBC05",
    "Doanh nghiep": "#EA4335",
    Vang: "#9b59b6",
    "Kim cuong": "#1abc9c",
  };
  const planNames = Object.keys(colorMap);

  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "10px",
        marginBottom: "30px",
        backgroundColor: "#fff",
      }}
    >
      <h4
        style={{
          color: "#4285F4",
          fontWeight: "600",
          textAlign: "center",
          marginBottom: "20px",
          fontSize: "1.2rem",
        }}
      >
        Doanh thu theo gói
      </h4>
      <div
        className="chart-data-container stacked"
        style={{
          height: "300px",
          display: "flex",
          alignItems: "flex-end",
          gap: "30px",
          padding: "0 10px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            left: 0,
            top: 0,
            pointerEvents: "none",
          }}
        >
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                bottom: `${i * 20}%`,
                width: "100%",
                borderTop: "1px dashed #f0f0f0",
              }}
            />
          ))}
        </div>
        {data.map((d, i) => {
          const total = d.total || 0;
          const segments = planNames
            .map((name) => ({
              name,
              value: d[name] || 0,
              color: colorMap[name],
            }))
            .filter((s) => s.value > 0);

          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  marginBottom: "5px",
                  fontWeight: "bold",
                  fontSize: "14px",
                  color: "#333",
                }}
              >
                {total.toLocaleString()}
              </div>
              <div
                style={{
                  height: `${(total / max) * 100}%`,
                  width: "40px",
                  borderRadius: "5px 5px 0 0",
                  display: "flex",
                  flexDirection: "column-reverse",
                  overflow: "hidden",
                }}
              >
                {segments.map((seg, index) => (
                  <div
                    key={index}
                    style={{
                      height: `${(seg.value / total) * 100 || 0}%`,
                      backgroundColor: seg.color,
                      textAlign: "center",
                      color: "#fff",
                      fontSize: "10px",
                      lineHeight: 1.2,
                    }}
                  >
                    {((seg.value / total) * 100 || 0).toFixed(1)}%
                  </div>
                ))}
              </div>
              <span
                className="bar-label"
                style={{ marginTop: "5px", fontSize: "13px", color: "#555" }}
              >
                {d.month}
              </span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "25px",
          marginTop: "20px",
          borderTop: "1px solid #eee",
          paddingTop: "15px",
          flexWrap: "wrap",
        }}
      >
        {planNames.map((key) => (
          <div
            key={key}
            style={{ display: "flex", alignItems: "center", fontSize: "13px" }}
          >
            <span
              style={{
                width: "10px",
                height: "10px",
                backgroundColor: colorMap[key],
                borderRadius: "2px",
                marginRight: "8px",
              }}
            />
            {key}
          </div>
        ))}
      </div>
    </div>
  );
}

function renderPieChart(data = []) {
  if (DEBUG_MODE) console.log("[PieChart] data", data);

  if (!data.length) return <div>Không có dữ liệu cơ cấu gói dịch vụ</div>;

  const colorMap = {
    "Tieu chuan": "#4285F4",
    "Cao cap": "#34A853",
    Bac: "#FBBC05",
    "Doanh nghiep": "#EA4335",
    Vang: "#9b59b6",
    "Kim cuong": "#1abc9c",
  };

  const total = data.reduce((a, b) => a + (b.value || 0), 0);
  let start = 0;

  const segments = data.map((d) => {
    const pct = (d.value / total) * 100;
    const color = colorMap[d.name] || "#7f8c8d";
    const seg = `${color} ${start}% ${start + pct}%`;
    start += pct;
    return { seg, color, ...d, percentage: pct };
  });

  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "10px",
        backgroundColor: "#fff",
      }}
    >
      <h4
        style={{
          color: "#4285F4",
          fontWeight: "600",
          textAlign: "center",
          marginBottom: "20px",
          fontSize: "1.2rem",
        }}
      >
        Cơ cấu gói dịch vụ
      </h4>
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "200px",
            height: "200px",
            margin: "10px 0",
          }}
        >
          <div
            className="pie-chart"
            style={{
              background: `conic-gradient(${segments
                .map((s) => s.seg)
                .join(", ")})`,
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              boxShadow: "0 0 15px rgba(0,0,0,0.1)",
            }}
          />
        </div>
        <div
          className="chart-legend"
          style={{ fontSize: "14px", flexBasis: "40%", minWidth: "150px" }}
        >
          {segments.map((d, i) => (
            <div
              key={i}
              className="legend-item"
              style={{ marginBottom: "8px" }}
            >
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "2px",
                  backgroundColor: d.color,
                  display: "inline-block",
                  marginRight: "8px",
                }}
              />
              {d.name} ({d.percentage.toFixed(1)}%)
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// 🔹 Component chính
// =========================================================
export default function ReportContent({ data, reportFilter }) {
  if (DEBUG_MODE) console.log("[ReportContent] props", { data, reportFilter });

  if (!data)
    return <div className="report-loading">Đang tải dữ liệu báo cáo...</div>;

  switch (reportFilter.viewType) {
    case "time-chart":
      return (
        <div className="time-chart-content">
          {renderHourlyHeatmap(data.timeChart?.hourly)}
        </div>
      );

    case "area-comparison":
      return (
        <div className="area-comparison-content">
          <h3>So sánh hiệu suất khu vực</h3>
          <div className="area-boxes-container">
            {Object.entries(data.areaComparison || {}).map(
              ([region, regionData]) => (
                <AreaBox key={region} name={region} data={regionData} />
              )
            )}
          </div>
          <DetailedStationTable data={data.stationTable || []} />
        </div>
      );

    case "service-structure":
      return (
        <div className="service-structure-content">
          {renderStackedBarChart(data.serviceStructure?.monthlyRevenue)}
          {renderPieChart(data.serviceStructure?.pieData)}
        </div>
      );

    default:
      return <div>Chọn loại báo cáo để xem nội dung.</div>;
  }
}
