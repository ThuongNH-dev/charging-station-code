import React, { useState, useEffect, useMemo } from "react";
import { DeleteOutlined } from "@ant-design/icons"; // Nhớ import icon thùng rác
import { deletePort, deleteStation } from "../../../../api/reportsApi";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

const COLORS = [
  "#4285F4",
  "#34A853",
  "#FBBC05",
  "#EA4335",
  "#9b59b6",
  "#1abc9c",
  "#7f8c8d",
];
const OFFICIAL_PLANS = [
  "Tiêu chuẩn",
  "Cao cấp",
  "Bạc",
  "Doanh nghiệp",
  "Vàng",
  "Kim cương",
];

// =========================================================
// 🔹 1. Biểu đồ HEATMAP 7×24 (theo giờ)
// =========================================================
function HeatmapHourly({ data = [] }) {
  if (!data.length) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: 40,
          color: "#777",
          fontStyle: "italic",
        }}
      >
        Không có dữ liệu heatmap
      </div>
    );
  }

  const WEEKDAY_LABELS = [
    "CN",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];

  const chartData = Array.from({ length: 24 }, (_, hour) => {
    const row = { hour: `${hour}:00` };

    WEEKDAY_LABELS.forEach((label, weekdayIndex) => {
      const sum = data
        .filter((d) => {
          if (d.hour !== hour) return false;
          const dateObj = new Date(d.date);
          const dow = dateObj.getDay();
          return dow === weekdayIndex;
        })
        .reduce((acc, d) => acc + Number(d.value || 0), 0);

      row[label] = sum;
    });

    return row;
  });

  const maxVal = Math.max(
    1,
    ...chartData.flatMap((row) =>
      WEEKDAY_LABELS.map((label) => Number(row[label] || 0))
    )
  );

  return (
    <div style={{ marginTop: 30 }}>
      <h4 style={{ marginBottom: 8 }}>Mức độ hoạt động theo giờ (7 ngày)</h4>
      <div className="chart-box-400">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis domain={[0, maxVal]} />
            <Tooltip
              formatter={(value, name) => [`${value} phiên`, name]}
              labelFormatter={(label) => `Giờ: ${label}`}
            />
            {WEEKDAY_LABELS.map((label, idx) => (
              <Bar
                key={label}
                dataKey={label}
                stackId="a"
                fill={`hsl(${(idx * 360) / WEEKDAY_LABELS.length}, 70%, 50%)`}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
        Chú thích: Mỗi cột là một giờ (0–23h). Màu sắc thể hiện tổng số phiên
        trong 7 ngày gần nhất của từng thứ (CN, Thứ 2, …, Thứ 7) tại khung giờ
        đó.
      </p>
    </div>
  );
}

// =========================================================
// 🔹 2. Biểu đồ theo ngày (Sessions + Revenue)
// =========================================================
function DailyCharts({ dailySessions = [], dailyRevenue = [] }) {
  return (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 20 }}>
      <div style={{ flex: 1, minWidth: 350 }}>
        <h4>Số phiên sạc theo ngày</h4>
        <div className="chart-box-300">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailySessions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(v) => [`${v} phiên`, "Phiên sạc"]} />
              <Line
                type="monotone"
                dataKey="sessions"
                stroke="#4285F4"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p style={{ marginTop: 6, color: "#666", fontSize: 12 }}>
          Chú thích: Số lượng phiên sạc hoàn tất trong 7 ngày gần nhất.
        </p>
      </div>

      <div style={{ flex: 1, minWidth: 350 }}>
        <h4>Doanh thu theo ngày (nghìn ₫)</h4>
        <div className="chart-box-300">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip
                formatter={(v) => [
                  `${v?.toLocaleString()} nghìn ₫`,
                  "Doanh thu",
                ]}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#34A853"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p style={{ marginTop: 6, color: "#666", fontSize: 12 }}>
          Chú thích: Tổng doanh thu trung bình theo ngày (đơn vị nghìn đồng).
        </p>
      </div>
    </div>
  );
}

// =========================================================
// 🔹 3. Biểu đồ doanh thu theo gói (Stacked Bar) - PHIÊN BẢN MINI
// =========================================================
function RevenueByPlan({ data = [] }) {
  if (!data.length) return null;

  return (
    <div
      className="plan-revenue-card"
      style={{
        background: "#fff",
        padding: "15px 20px", // Giảm padding
        borderRadius: 12,
        border: "1px solid #eee",
        height: "100%",
      }}
    >
      <div
        className="plan-revenue-top"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 15,
        }}
      >
        <div>
          <p
            className="eyebrow"
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              color: "#888",
              marginBottom: 4,
            }}
          >
            Cơ cấu dịch vụ
          </p>
          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            Doanh thu theo gói
          </h4>
          <span className="subtitle" style={{ fontSize: 12, color: "#999" }}>
            Đơn vị: đồng (₫)
          </span>
        </div>

        {/* Legend nhỏ gọn */}
        <div
          className="mini-legend"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 12px",
            maxWidth: 220,
            justifyContent: "flex-end",
          }}
        >
          {OFFICIAL_PLANS.map((plan, i) => (
            <span
              key={plan}
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: 12,
                color: "#555",
              }}
            >
              <i
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: COLORS[i % COLORS.length],
                  marginRight: 4,
                }}
              />
              {plan}
            </span>
          ))}
        </div>
      </div>

      <div
        className="plan-revenue-chart"
        style={{ width: "100%", height: 320 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f0f0f0"
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "#666" }} // Font trục X nhỏ
              tickLine={false}
              axisLine={{ stroke: "#eee" }}
            />
            <YAxis
              tickFormatter={(val) =>
                new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(
                  val
                )
              }
              tick={{ fontSize: 12, fill: "#666" }} // Font trục Y nhỏ
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
              formatter={(v) => `${v.toLocaleString("vi-VN")} ₫`}
              cursor={{ fill: "rgba(0,0,0,0.03)" }}
            />
            {OFFICIAL_PLANS.map((plan, i) => (
              <Bar
                key={plan}
                dataKey={plan}
                stackId="a"
                fill={COLORS[i % COLORS.length]}
                barSize={40}
                radius={[0, 0, 0, 0]} // Bỏ bo góc để xếp chồng đẹp hơn
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p
        style={{
          marginTop: 10,
          fontSize: 11,
          color: "#aaa",
          textAlign: "center",
        }}
      >
        * Màu sắc thể hiện doanh thu từng gói trong tháng.
      </p>
    </div>
  );
}

// =========================================================
// 🔹 4. Biểu đồ Pie cơ cấu gói dịch vụ - PHIÊN BẢN MINI
// =========================================================
function ServiceStructurePie({ data = [] }) {
  if (!data.length) return null;

  const total = data.reduce((s, d) => s + Number(d.value || 0), 0);
  const dominant = data.reduce(
    (best, item) =>
      Number(item.value || 0) > Number(best.value || 0) ? item : best,
    data[0] || { value: 0 }
  );

  return (
    <div
      className="service-structure-card"
      style={{
        background: "#fff",
        padding: "15px 20px",
        borderRadius: 12,
        border: "1px solid #eee",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h4 style={{ marginBottom: 15, fontSize: 16, fontWeight: 600 }}>
        Cơ cấu dịch vụ
      </h4>

      <div style={{ display: "flex", alignItems: "center", gap: 15, flex: 1 }}>
        {/* Chart Tròn */}
        <div style={{ flex: 1, height: 220, position: "relative" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={50} // Vòng tròn nhỏ lại
                outerRadius={90}
                paddingAngle={4}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v.toLocaleString("vi-VN")} ₫`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Hộp thông tin Top 1 (Đã thu nhỏ) */}
        <div
          style={{
            flex: "0 0 160px", // Cố định chiều rộng
            background: "#f9f9f9",
            padding: 15,
            borderRadius: 8,
            border: "1px solid #eee",
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: "#888",
              textTransform: "uppercase",
              marginBottom: 5,
            }}
          >
            Gói nổi bật nhất
          </p>
          <div
            style={{
              fontSize: 15,
              fontWeight: "bold",
              color: "#2c3e50",
              marginBottom: 2,
            }}
          >
            {dominant?.name || "—"}
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: "#27ae60",
              marginBottom: 8,
            }}
          >
            {total > 0
              ? `${(((dominant?.value || 0) / total) * 100).toFixed(1)}%`
              : "0%"}
          </div>
          <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: 8 }}>
            <p style={{ fontSize: 12, color: "#666" }}>Doanh thu:</p>
            <strong style={{ fontSize: 15, color: "#333" }}>
              {dominant.value?.toLocaleString("vi-VN")} ₫
            </strong>
          </div>
        </div>
      </div>

      {/* Legend danh sách gói (Đã thu nhỏ font và khoảng cách) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr", // Chia 2 cột
          gap: "8px 15px", // Khoảng cách nhỏ
          marginTop: 15,
          paddingTop: 15,
          borderTop: "1px solid #eee",
        }}
      >
        {data.map((item, index) => (
          <div
            key={item.name || index}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: COLORS[index % COLORS.length],
                  marginRight: 6,
                }}
              />
              <span style={{ color: "#555" }}>{item.name}</span>
            </div>
            <span style={{ fontWeight: 600, color: "#333" }}>
              {item.value?.toLocaleString("vi-VN")}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 10,
          textAlign: "right",
          fontSize: 15,
          fontWeight: "bold",
          color: "#1976d2",
        }}
      >
        Tổng: {total.toLocaleString("vi-VN")} ₫
      </div>
    </div>
  );
}

// =========================================================
// 🔹 5. Bảng breakdown theo Công ty
// =========================================================
function CompanyBreakdownTable({ data = [] }) {
  if (!data.length) {
    return (
      <div style={{ padding: 20, color: "#777", fontStyle: "italic" }}>
        Không có dữ liệu công ty.
      </div>
    );
  }

  return (
    <div>
      <h4>Doanh thu theo công ty</h4>
      <table className="report-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Công ty</th>
            <th>Số phiên</th>
            <th>kWh</th>
            <th>Doanh thu (₫)</th>
            <th>Thời gian sạc (phút)</th>
            <th>Idle (phút)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row.key ?? idx}>
              <td>{idx + 1}</td>
              <td>{row.key}</td>
              <td>{row.sessionCount?.toLocaleString("vi-VN")}</td>
              <td>{row.energyKwh?.toLocaleString("vi-VN")}</td>
              <td>{row.total?.toLocaleString("vi-VN")}</td>
              <td>{row.durationMin?.toLocaleString("vi-VN")}</td>
              <td>{row.idleMin?.toLocaleString("vi-VN")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="table-footnote">
        Ghi chú: dữ liệu đã được sắp xếp theo doanh thu giảm dần từ backend.
      </p>
    </div>
  );
}

// =========================================================
// 🔹 5.1 Biểu đồ Doanh thu & Phiên sạc theo Công ty (MỚI)
// =========================================================
function CompanyRevenueChart({ data = [] }) {
  if (!data.length) return null;

  // Sắp xếp giảm dần theo doanh thu và lấy Top 10 để biểu đồ không bị rối
  const chartData = [...data]
    .sort((a, b) => (b.total || 0) - (a.total || 0))
    .slice(0, 10)
    .map((item) => ({
      name: item.key, // Tên công ty
      revenue: item.total || 0,
      sessions: item.sessionCount || 0,
    }));

  return (
    <div style={{ marginBottom: 30 }}>
      <h4>Biểu đồ doanh thu Top 10 Công ty</h4>
      <div className="chart-box-400">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <CartesianGrid stroke="#f5f5f5" />
            <XAxis
              dataKey="name"
              scale="band"
              angle={-15}
              textAnchor="end"
              interval={0}
              height={60}
              tick={{ fontSize: 12 }}
            />
            {/* Trục trái: Doanh thu */}
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke="#34A853"
              tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
              label={{
                value: "Doanh thu (VNĐ)",
                angle: -90,
                position: "insideLeft",
              }}
            />
            {/* Trục phải: Số phiên */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#4285F4"
              label={{ value: "Số phiên", angle: 90, position: "insideRight" }}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === "Doanh thu")
                  return `${value.toLocaleString("vi-VN")} ₫`;
                return `${value} phiên`;
              }}
              labelStyle={{ color: "#333", fontWeight: "bold" }}
            />
            <Legend />
            {/* Cột doanh thu */}
            <Bar
              yAxisId="left"
              dataKey="revenue"
              name="Doanh thu"
              barSize={40}
              fill="#34A853"
              radius={[4, 4, 0, 0]}
            />
            {/* Đường số phiên */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="sessions"
              name="Số phiên"
              stroke="#4285F4"
              strokeWidth={3}
              dot={{ r: 4, fill: "#4285F4", strokeWidth: 2, stroke: "#fff" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p
        style={{
          marginTop: 8,
          color: "#666",
          fontSize: 12,
          textAlign: "center",
        }}
      >
        Biểu đồ thể hiện mối tương quan giữa Doanh thu (Cột xanh lá) và Số lượng
        phiên sạc (Đường xanh dương).
      </p>
    </div>
  );
}

// =========================================================
// 🔹 6. Bảng Utilization theo Trạm (ĐÃ CẬP NHẬT NÚT XÓA)
// =========================================================
function StationUtilizationTable({ data = [], allStations = [], onRefresh }) {
  // Logic Gộp dữ liệu (Giữ nguyên như cũ)
  const mergedData = useMemo(() => {
    if (!allStations.length) return data;

    const statsMap = new Map();
    data.forEach((item) => {
      if (item.code) {
        statsMap.set(item.code, item);
        statsMap.set(item.code.trim().toLowerCase(), item);
      }
    });

    const result = allStations.map((station) => {
      const rawName =
        station.name ||
        station.stationName ||
        station.code ||
        station.title ||
        "Unknown";
      const searchName = String(rawName).trim().toLowerCase();
      const stats = statsMap.get(rawName) || statsMap.get(searchName);

      // 👈 Lưu ý: Phải spread ...station để lấy được stationId/id
      if (stats) {
        return { ...station, ...stats, status: "active" };
      }

      return {
        ...station, // 👈 Quan trọng: giữ lại ID của trạm để xóa
        code: rawName,
        sessionCount: 0,
        energyKwh: 0,
        chargingMinutes: 0,
        utilization: 0,
        status: "inactive",
      };
    });

    return result.sort((a, b) => (b.utilization || 0) - (a.utilization || 0));
  }, [data, allStations]);

  // 👇 2. Hàm xử lý xóa trạm
  const handleDeleteStation = async (station) => {
    // Lấy ID: backend trả về thường là stationId hoặc id
    const idToDelete = station.stationId || station.id;

    if (!idToDelete) {
      alert("Không tìm thấy ID trạm để xóa!");
      return;
    }

    const confirm = window.confirm(
      `CẢNH BÁO: Bạn có chắc muốn xóa trạm "${
        station.code || station.name
      }" khỏi hệ thống không?`
    );

    if (confirm) {
      const success = await deleteStation(idToDelete);
      if (success) {
        alert("Đã xóa trạm thành công!");
        // Reload lại trang để cập nhật dữ liệu mới nhất
        if (onRefresh) onRefresh();
      }
    }
  };

  if (!mergedData.length) {
    return (
      <div style={{ padding: 20, color: "#777", fontStyle: "italic" }}>
        Không có dữ liệu trạm.
      </div>
    );
  }

  return (
    <div>
      <h4>Hiệu suất sử dụng trạm sạc (Toàn hệ thống)</h4>
      <table className="report-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Trạm</th>
            <th>Trạng thái</th>
            <th>Số phiên</th>
            <th>kWh</th>
            <th>Thời gian sạc (phút)</th>
            <th>Utilization (%)</th>
            {/* 👇 3. Thêm cột Hành động */}
            <th style={{ textAlign: "center", width: "100px" }}>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {mergedData.map((row, idx) => {
            const isInactive =
              row.status === "inactive" || row.sessionCount === 0;
            const isLowPerformance = !isInactive && row.utilization < 0.05;

            let rowStyle = {};
            let statusBadge = (
              <span style={{ color: "green", fontWeight: "bold" }}>
                Hoạt động tốt
              </span>
            );

            if (isInactive) {
              rowStyle = { backgroundColor: "#ffebeb" };
              statusBadge = (
                <span style={{ color: "#d63031", fontWeight: "bold" }}>
                  Không hoạt động
                </span>
              );
            } else if (isLowPerformance) {
              rowStyle = { backgroundColor: "#fffbe6" };
              statusBadge = (
                <span style={{ color: "#f39c12", fontWeight: "bold" }}>
                  Hiệu suất thấp
                </span>
              );
            }

            return (
              <tr key={idx} style={rowStyle}>
                <td>{idx + 1}</td>
                <td style={{ fontWeight: 500 }}>
                  {row.code || row.stationName}
                </td>
                <td>{statusBadge}</td>
                <td>{row.sessionCount?.toLocaleString("vi-VN")}</td>
                <td>{row.energyKwh?.toLocaleString("vi-VN")}</td>
                <td>{row.chargingMinutes?.toLocaleString("vi-VN")}</td>
                <td>
                  <strong>{((row.utilization ?? 0) * 100).toFixed(2)}%</strong>
                </td>

                {/* 👇 4. Hiển thị nút xóa nếu trạm không hoạt động */}
                <td style={{ textAlign: "center" }}>
                  {isInactive ? (
                    <button
                      className="btn-icon-delete"
                      onClick={() => handleDeleteStation(row)}
                      title="Xóa trạm này"
                      style={{
                        border: "none",
                        background: "#fff",
                        color: "#c0392b",
                        padding: "6px 10px",
                        borderRadius: 4,
                        cursor: "pointer",
                        border: "1px solid #fab1a0",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        margin: "0 auto",
                      }}
                    >
                      <DeleteOutlined /> Xóa
                    </button>
                  ) : (
                    <span style={{ color: "#ccc" }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer ghi chú giữ nguyên */}
      <p className="table-footnote">
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            background: "#ffebeb",
            border: "1px solid #ccc",
            marginRight: 5,
          }}
        ></span>
        Màu đỏ: Trạm không phát sinh doanh thu (0 phiên). <br />
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            background: "#fffbe6",
            border: "1px solid #ccc",
            marginRight: 5,
          }}
        ></span>
        Màu vàng: Hiệu suất thấp (dưới 5%).
      </p>
    </div>
  );
}

// =========================================================
// 🔹 6.1 Biểu đồ Hiệu suất Trạm (ĐÃ SỬA LỖI TOOLTIP)
// =========================================================
function StationUtilizationCharts({ data = [], allStations = [] }) {
  // 1. Logic Gộp dữ liệu (Giữ nguyên)
  const mergedData = useMemo(() => {
    if (!allStations.length) return [];

    const statsMap = new Map();
    data.forEach((item) => {
      if (item.code) {
        statsMap.set(item.code, item);
        statsMap.set(item.code.trim().toLowerCase(), item);
      }
    });

    return allStations.map((station) => {
      const rawName =
        station.name || station.stationName || station.code || "Unknown";
      const searchName = String(rawName).trim().toLowerCase();
      const stats = statsMap.get(rawName) || statsMap.get(searchName);

      if (stats) return { ...stats, name: rawName, status: "active" };

      return {
        name: rawName,
        sessionCount: 0,
        energyKwh: 0,
        utilization: 0,
        status: "inactive",
      };
    });
  }, [data, allStations]);

  if (!mergedData.length) return null;

  // 2. Chuẩn bị dữ liệu (Giữ nguyên)
  let goodCount = 0;
  let lowCount = 0;
  let inactiveCount = 0;

  mergedData.forEach((item) => {
    if (item.status === "inactive" || !item.sessionCount) {
      inactiveCount++;
    } else if (item.utilization < 0.05) {
      lowCount++;
    } else {
      goodCount++;
    }
  });

  const pieData = [
    { name: "Hoạt động tốt", value: goodCount, color: "#27ae60" },
    { name: "Hiệu suất thấp", value: lowCount, color: "#f39c12" },
    { name: "Không doanh thu", value: inactiveCount, color: "#c0392b" },
  ].filter((d) => d.value > 0);

  const barData = [...mergedData]
    .sort((a, b) => (b.utilization || 0) - (a.utilization || 0))
    .slice(0, 10)
    .map((item) => ({
      name: item.name,
      util: ((item.utilization || 0) * 100).toFixed(2),
      sessions: item.sessionCount || 0,
    }));

  return (
    <div
      style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 30 }}
    >
      {/* --- CHART 1: DONUT CHART --- */}
      <div
        style={{
          flex: "1 1 350px",
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 20,
          background: "#fff",
        }}
      >
        <h4 style={{ textAlign: "center", marginBottom: 10 }}>
          Tỷ lệ hoạt động trạm
        </h4>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(val) => [`${val} trạm`, "Số lượng"]} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "#666" }}>
          Tổng số trạm: <strong>{mergedData.length}</strong>
        </p>
      </div>

      {/* --- CHART 2: BAR CHART (SỬA TOOLTIP Ở ĐÂY) --- */}
      <div
        style={{
          flex: "2 1 500px",
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 20,
          background: "#fff",
        }}
      >
        <h4 style={{ textAlign: "center", marginBottom: 10 }}>
          Top 10 Trạm có hiệu suất cao nhất (%)
        </h4>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart
              data={barData}
              layout="vertical"
              margin={{ left: 20, right: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, "auto"]} unit="%" />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                tick={{ fontSize: 12 }}
                interval={0}
              />
              {/* 👇 ĐÃ SỬA: Bỏ logic điều kiện phức tạp, ép cứng hiển thị đúng label */}
              <Tooltip
                formatter={(val) => [`${val}%`, "Hiệu suất"]}
                cursor={{ fill: "transparent" }}
                contentStyle={{ borderRadius: 8 }}
              />
              <Bar
                dataKey="util"
                name="Hiệu suất" // Đổi tên hiển thị cho khớp
                fill="#4285F4"
                radius={[0, 4, 4, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "#666" }}>
          Chỉ số Utilization thể hiện tỷ lệ thời gian trạm được sử dụng sạc
          trong tháng.
        </p>
      </div>
    </div>
  );
}

// =========================================================
// 🔹 7. Bảng chi tiết Top / Under / Zero (BẢN FIX LỖI MAPPING)
// =========================================================
function TopUnderZeroSection({ topUnder, chargers = [], stations = [] }) {
  const [zeroList, setZeroList] = useState([]);

  // 1. Tạo Map tra cứu: ChargerCode -> StationName (Cực kỳ mạnh mẽ)
  const stationLookup = useMemo(() => {
    const sMap = {}; // ID -> Name
    const cMap = {}; // Code -> Name

    // B1: Map StationID -> StationName
    stations.forEach((s) => {
      const sId = s.stationId || s.StationId || s.id;
      const sName = s.stationName || s.StationName || s.name || "Unknown";
      if (sId) sMap[sId] = sName;
    });

    // B2: Map ChargerCode -> StationName (Chuẩn hóa Key)
    chargers.forEach((c) => {
      // Lấy code, chuyển về chuỗi, cắt khoảng trắng, viết thường
      const rawCode = c.code || c.Code || "";
      const cCode = String(rawCode).trim().toLowerCase();

      const sId = c.stationId || c.StationId;

      if (cCode && sId && sMap[sId]) {
        cMap[cCode] = sMap[sId];
      }
    });

    // Debug xem map được bao nhiêu cái (F12 xem console)
    console.log(
      "🗺️ Mapping Chargers:",
      Object.keys(cMap).length,
      "trụ sạc đã map thành công."
    );

    return cMap;
  }, [chargers, stations]);

  // Hàm lấy tên trạm an toàn (Có chuẩn hóa đầu vào)
  const getStationName = (chargerCode) => {
    if (!chargerCode) return "---";
    // Chuẩn hóa input giống hệt lúc tạo Map
    const lookupKey = String(chargerCode).trim().toLowerCase();
    return stationLookup[lookupKey] || "Không xác định";
  };

  // 2. Logic lọc trùng (Giữ nguyên)
  const filteredUnderUtilized = useMemo(() => {
    if (!topUnder) return [];
    const { topActive = [], underUtilized = [] } = topUnder;
    const topKeys = new Set(
      topActive.map((item) => `${item.key}_${item.key2}`)
    );
    return underUtilized.filter((item) => {
      const uniqueKey = `${item.key}_${item.key2}`;
      return !topKeys.has(uniqueKey);
    });
  }, [topUnder]);

  useEffect(() => {
    if (topUnder?.zeroActivity) {
      setZeroList(topUnder.zeroActivity);
    }
  }, [topUnder]);

  if (!topUnder) {
    return (
      <div style={{ padding: 20, color: "#777", fontStyle: "italic" }}>
        Đang tải hoặc không có dữ liệu phân loại.
      </div>
    );
  }

  const { topActive = [] } = topUnder;

  // --- HÀM XỬ LÝ XÓA (Giữ nguyên) ---
  const handleDeleteClick = async (item) => {
    const confirm = window.confirm(
      `Bạn chắc chắn muốn xóa cổng sạc: ${item.key}?`
    );
    if (!confirm) return;
    const idToDelete =
      item.portId ||
      (item.key && item.key.includes("#") ? item.key.split("#")[1] : null);
    if (!idToDelete) return alert("Lỗi ID");
    try {
      if (await deletePort(idToDelete)) {
        setZeroList((prev) => prev.filter((p) => p.key !== item.key));
        alert("Đã xóa thành công!");
      }
    } catch (error) {
      alert("Lỗi xóa");
    }
  };

  // Hàm render bảng con
  const renderPortTable = (rows, type) => (
    <table className="report-table" key={type}>
      <thead>
        <tr>
          <th style={{ width: "50px" }}>#</th>
          <th>Cổng sạc (Port)</th>
          <th>Trụ sạc (Charger)</th>

          {/* CỘT TRẠM */}
          <th style={{ color: "#444" }}>Trạm (Station)</th>

          {type !== "zero" ? (
            <>
              <th style={{ textAlign: "right" }}>Số phiên</th>
              <th style={{ textAlign: "right" }}>kWh</th>
              <th style={{ textAlign: "right" }}>Doanh thu (₫)</th>
              <th style={{ textAlign: "right" }}>Thời gian sạc</th>
            </>
          ) : (
            <th style={{ textAlign: "center", width: 100 }}>Hành động</th>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={`${type}-${row.key ?? idx}`}>
            <td>{idx + 1}</td>
            <td style={{ fontWeight: 600, color: "#2980b9" }}>{row.key}</td>

            {/* Cột Trụ Sạc */}
            <td>{row.key2}</td>

            {/* Cột Tên Trạm: Gọi hàm getStationName với key2 (ChargerCode) */}
            <td style={{ fontWeight: 500, color: "#2c3e50" }}>
              {getStationName(row.key2 || row.chargerCode)}
            </td>

            {type !== "zero" ? (
              <>
                <td style={{ textAlign: "right" }}>
                  {row.sessionCount?.toLocaleString("vi-VN")}
                </td>
                <td style={{ textAlign: "right" }}>
                  {row.energyKwh?.toLocaleString("vi-VN", {
                    maximumFractionDigits: 1,
                  })}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontWeight: "bold",
                    color: "#27ae60",
                  }}
                >
                  {row.total?.toLocaleString("vi-VN")}
                </td>
                <td style={{ textAlign: "right" }}>
                  {row.durationMin?.toLocaleString("vi-VN")} p
                </td>
              </>
            ) : (
              <td style={{ textAlign: "center" }}>
                <button
                  className="btn-icon-delete"
                  onClick={() => handleDeleteClick(row)}
                  title="Xóa cổng này"
                  style={{
                    border: "none",
                    background: "#ffebeb",
                    color: "#c0392b",
                    padding: "6px 10px",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  <DeleteOutlined /> Xóa
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="top-under-layout">
      <div className="top-under-block">
        <h4 style={{ color: "#27ae60" }}>Top hoạt động hiệu quả</h4>
        {topActive.length ? (
          renderPortTable(topActive, "top")
        ) : (
          <div className="empty-block">Chưa có dữ liệu.</div>
        )}
      </div>
      <div className="top-under-block">
        <h4 style={{ color: "#f39c12" }}>Cảnh báo: Hiệu suất thấp</h4>
        {filteredUnderUtilized.length ? (
          renderPortTable(filteredUnderUtilized, "under")
        ) : (
          <div className="empty-block">Không có cổng sạc hiệu suất thấp.</div>
        )}
      </div>
      <div className="top-under-block">
        <h4 style={{ color: "#c0392b" }}>
          Cảnh báo: Không phát sinh giao dịch
        </h4>
        {zeroList.length ? (
          renderPortTable(zeroList, "zero")
        ) : (
          <div className="empty-block">
            Tất cả cổng sạc đều đang hoạt động tốt.
          </div>
        )}
      </div>
    </div>
  );
}
// =========================================================
// 🔹 7.1 Biểu đồ Tròn: Phân loại trạng thái
// =========================================================
function PortStatusPieChart({ topUnderData }) {
  if (!topUnderData) return null;
  const {
    topActive = [],
    underUtilized = [],
    zeroActivity = [],
  } = topUnderData;

  const pieData = [
    { name: "Hiệu quả cao", value: topActive.length, color: "#27ae60" },
    { name: "Hiệu suất thấp", value: underUtilized.length, color: "#f39c12" },
    { name: "Không giao dịch", value: zeroActivity.length, color: "#c0392b" },
  ].filter((d) => d.value > 0);

  return (
    <div
      style={{
        background: "#fff",
        padding: 20,
        borderRadius: 12,
        border: "1px solid #eee",
        marginBottom: 20,
        flex: "1 1 300px", // Chia tỷ lệ cột
        minWidth: 0,
      }}
    >
      <h4 style={{ textAlign: "center", marginBottom: 15 }}>
        Tổng quan trạng thái cổng sạc
      </h4>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(val) => [`${val} cổng`, "Số lượng"]} />
            <Legend verticalAlign="bottom" />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{
          textAlign: "center",
          marginTop: 10,
          fontSize: 13,
          color: "#666",
        }}
      >
        Tổng số cổng ghi nhận:{" "}
        <strong>
          {topActive.length + underUtilized.length + zeroActivity.length}
        </strong>
      </div>
    </div>
  );
}

// =========================================================
// 🔹 7.2 Biểu đồ Cột: Top 10 Doanh thu (FIX LỖI HIỂN THỊ)
// =========================================================
function TopPortRevenueChart({ topUnderData }) {
  if (!topUnderData || !topUnderData.topActive) return null;

  const data = topUnderData.topActive.slice(0, 10).map((item) => ({
    name: item.key || "Unknown",
    revenue: item.total || 0,
    sessions: item.sessionCount || 0,
  }));

  return (
    <div
      style={{
        background: "#fff",
        padding: 20,
        borderRadius: 12,
        border: "1px solid #eee",
        marginBottom: 20,
        flex: "2 1 500px", // Quan trọng: Giúp flex-box chia cột đúng
        minWidth: 0, // Quan trọng: Tránh lỗi co cụm trong Flex/Grid
      }}
    >
      <h4 style={{ marginBottom: 15 }}>
        Top 10 Cổng sạc có doanh thu cao nhất
      </h4>
      <div style={{ width: "100%", height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            {/* Đã bỏ scale="band" để Recharts tự tính toán */}
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />

            <YAxis
              yAxisId="left"
              orientation="left"
              stroke="#34A853"
              tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
              width={60}
              label={{ value: "Doanh thu", angle: -90, position: "insideLeft" }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#4285F4"
              width={50}
              label={{ value: "Số phiên", angle: 90, position: "insideRight" }}
            />
            <Tooltip
              cursor={{ fill: "transparent" }}
              formatter={(value, name) => {
                if (name === "Doanh thu")
                  return `${value.toLocaleString("vi-VN")} ₫`;
                return `${value} phiên`;
              }}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="revenue"
              name="Doanh thu"
              fill="#34A853"
              barSize={40} // Đặt kích thước cố định để cột không bị mất
              radius={[4, 4, 0, 0]}
              isAnimationActive={false} // Tắt hiệu ứng để tránh lỗi render
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="sessions"
              name="Số phiên"
              stroke="#4285F4"
              strokeWidth={3}
              dot={{ r: 4, fill: "#4285F4", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// =========================================================
// 🔹 8. Biểu đồ Tròn: Cơ cấu loại xe (MỚI)
// =========================================================
function VehicleTypePieChart({ data = [] }) {
  if (!data.length) return null;
  const validData = data.filter((i) => (i.total || 0) > 0);
  return (
    <div
      style={{
        background: "#fff",
        padding: 20,
        borderRadius: 12,
        border: "1px solid #eee",
        marginBottom: 20,
        flex: "1 1 300px",
        minWidth: 0,
      }}
    >
      <h4 style={{ textAlign: "center", marginBottom: 15 }}>
        Tỷ trọng doanh thu theo loại xe
      </h4>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={validData}
              dataKey="total"
              nameKey="key"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
            >
              {validData.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(val) => `${val.toLocaleString("vi-VN")} ₫`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// =========================================================
// 🔹 8.1 Bảng chi tiết Loại xe (FIX GIAO DIỆN TRÀN)
// =========================================================
function VehicleTypeTable({ data = [] }) {
  if (!data.length) {
    return (
      <div style={{ padding: 20, color: "#777", fontStyle: "italic" }}>
        Chưa có dữ liệu phân loại xe.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        padding: 20,
        borderRadius: 12,
        border: "1px solid #eee",
        flex: "2 1 500px",
        minWidth: 0, // Quan trọng để không bị đẩy layout
        overflowX: "auto", // Quan trọng: Tạo thanh cuộn ngang nếu bảng quá to
      }}
    >
      <h4 style={{ marginBottom: 15 }}>Thống kê chi tiết theo loại xe</h4>
      <table
        className="report-table"
        style={{ width: "100%", minWidth: "650px" }}
      >
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th>Loại xe</th>
            <th style={{ textAlign: "right" }}>Số phiên</th>
            <th style={{ textAlign: "right" }}>Sản lượng (kWh)</th>
            <th style={{ textAlign: "right" }}>Doanh thu (₫)</th>
            <th style={{ textAlign: "right" }}>Thời gian sạc</th>
            <th style={{ textAlign: "right" }}>Idle</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row.key || idx}>
              <td>{idx + 1}</td>

              <td
                style={{
                  fontWeight: 600,
                  color: "#2980b9",
                  whiteSpace: "nowrap",
                }}
              >
                {row.key || "Unknown"}
              </td>

              <td style={{ textAlign: "right" }}>
                {row.sessionCount?.toLocaleString("vi-VN")}
              </td>

              <td style={{ textAlign: "right" }}>
                {row.energyKwh?.toLocaleString("vi-VN", {
                  maximumFractionDigits: 1,
                })}
              </td>

              <td
                style={{
                  textAlign: "right",
                  fontWeight: "bold",
                  color: "#27ae60",
                  whiteSpace: "nowrap",
                }}
              >
                {row.total?.toLocaleString("vi-VN")}
              </td>

              <td style={{ textAlign: "right" }}>
                {row.durationMin?.toLocaleString("vi-VN")} p
              </td>

              <td style={{ textAlign: "right", color: "#7f8c8d" }}>
                {row.idleMin?.toLocaleString("vi-VN")} p
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="table-footnote">
        Ghi chú: <strong>Idle</strong> là thời gian xe chiếm chỗ.
      </p>
    </div>
  );
}
// =========================================================
// 🔹 9. Báo cáo theo Khung giờ (Time Range) - ĐÃ NÂNG CẤP
// =========================================================
function TimeRangeSection({ data = [] }) {
  if (!data || data.length === 0) return null;

  const validData = data.filter((i) => (i.total || 0) > 0);

  // Hàm dịch từ khóa sang tiếng Việt
  const translateKey = (key) => {
    const k = (key || "").toLowerCase();
    if (k.includes("peak") && !k.includes("off")) return "Cao điểm (Peak)";
    if (k.includes("low") || k.includes("off")) return "Thấp điểm (Low)";
    if (k.includes("normal") || k.includes("standard"))
      return "Bình thường (Normal)";
    return key || "Khác";
  };

  // Hàm lấy màu sắc tương ứng (Cao điểm = Đỏ/Cam, Bình thường = Xanh, Thấp điểm = Xanh lá)
  const getColor = (key) => {
    const k = (key || "").toLowerCase();
    if (k.includes("peak")) return "#EA4335"; // Đỏ
    if (k.includes("low") || k.includes("off")) return "#34A853"; // Xanh lá
    return "#4285F4"; // Xanh dương (Bình thường)
  };

  return (
    <div style={{ marginTop: 30 }}>
      <h4
        style={{
          marginBottom: 15,
          borderLeft: "4px solid #4285F4",
          paddingLeft: 10,
        }}
      >
        Phân tích hiệu quả theo Khung giờ
      </h4>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
        {/* --- Biểu đồ tròn --- */}
        <div
          style={{
            flex: "1 1 300px",
            background: "#fff",
            padding: 20,
            borderRadius: 12,
            border: "1px solid #eee",
          }}
        >
          <h5 style={{ textAlign: "center", marginBottom: 10 }}>
            Tỷ trọng Doanh thu
          </h5>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={validData}
                  dataKey="total"
                  nameKey="key"
                  cx="50%"
                  cy="50%"
                  innerRadius={50} // Làm rỗng giữa cho đẹp
                  outerRadius={80}
                  paddingAngle={2}
                  label={({ name, percent }) =>
                    `${translateKey(name).split("(")[0]} ${(
                      percent * 100
                    ).toFixed(0)}%`
                  }
                >
                  {validData.map((entry, index) => (
                    <Cell key={index} fill={getColor(entry.key)} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => `${val.toLocaleString("vi-VN")} ₫`}
                />
                <Legend
                  formatter={(val) => translateKey(val)} // Dịch chú thích
                  verticalAlign="bottom"
                  height={36}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- Bảng chi tiết --- */}
        <div
          style={{
            flex: "2 1 450px",
            background: "#fff",
            padding: 20,
            borderRadius: 12,
            border: "1px solid #eee",
            overflowX: "auto",
          }}
        >
          <h5 style={{ marginBottom: 15 }}>Chi tiết số liệu</h5>
          <table className="report-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Khung giờ</th>
                <th style={{ textAlign: "right" }}>Số phiên</th>
                <th style={{ textAlign: "right" }}>Sản lượng (kWh)</th>
                <th style={{ textAlign: "right" }}>Doanh thu (₫)</th>
                <th style={{ textAlign: "right" }}>TB/Phiên</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx}>
                  <td
                    style={{
                      fontWeight: 600,
                      color: getColor(row.key),
                    }}
                  >
                    {translateKey(row.key)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {row.sessionCount?.toLocaleString("vi-VN")}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {row.energyKwh?.toLocaleString("vi-VN", {
                      maximumFractionDigits: 1,
                    })}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: "bold",
                      color: "#333",
                    }}
                  >
                    {row.total?.toLocaleString("vi-VN")}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontSize: 13,
                      color: "#7f8c8d",
                    }}
                  >
                    {(row.sessionCount > 0
                      ? row.total / row.sessionCount
                      : 0
                    ).toLocaleString("vi-VN", {
                      maximumFractionDigits: 0,
                    })}{" "}
                    ₫
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
// =========================================================
// 🔹 COMPONENT CHÍNH
// =========================================================
export default function ReportContent({ data, reportFilter, onRefresh }) {
  if (!data)
    return (
      <div style={{ padding: 30, textAlign: "center" }}>
        Đang tải dữ liệu...
      </div>
    );

  const { timeChart, serviceStructure, analytics } = data;

  const monthlyRevenue = serviceStructure?.monthlyRevenue || [];

  const pieDataForSelectedMonth = useMemo(() => {
    if (!monthlyRevenue.length) return [];

    // Lấy tháng và năm từ bộ lọc tổng (reportFilter.endDate có dạng "YYYY-MM-DD")
    const dateObj = new Date(reportFilter.endDate);
    const filterMonth = dateObj.getMonth() + 1; // Tháng 1-12
    const filterYear = dateObj.getFullYear();

    // Tìm dòng dữ liệu trong monthlyRevenue khớp với tháng/năm của bộ lọc
    const targetRow = monthlyRevenue.find((row) => {
      // row.month thường có dạng "MM-YYYY" hoặc "MM/YYYY" hoặc "M-YYYY"
      // Tách chuỗi để so sánh chính xác
      const parts = row.month.split(/[-/]/);
      if (parts.length < 2) return false;

      const m = parseInt(parts[0], 10);
      const y = parseInt(parts[1], 10);
      return m === filterMonth && y === filterYear;
    });

    // Nếu tìm thấy thì dùng, nếu không thì fallback về cái cuối cùng (để tránh lỗi crash chart)
    const rowToRender = targetRow || monthlyRevenue[monthlyRevenue.length - 1];

    if (!rowToRender) return [];

    return OFFICIAL_PLANS.map((name) => ({
      name,
      value: Number(rowToRender[name] || 0),
    }));
  }, [monthlyRevenue, reportFilter.endDate]);

  switch (reportFilter.viewType) {
    case "time-chart":
      return (
        <div className="report-content-area">
          <h3 className="comparison-title">Biểu đồ theo thời gian</h3>
          <HeatmapHourly data={timeChart?.hourly || []} />
          <DailyCharts
            dailySessions={timeChart?.dailySessions || []}
            dailyRevenue={timeChart?.dailyRevenue || []}
          />
        </div>
      );

    case "time-range-analysis":
      return (
        <div className="report-content-area">
          <h3 className="comparison-title">
            Phân tích hiệu quả theo Khung giờ
          </h3>

          {/* Sử dụng dữ liệu timeRangeRaw (đã tính toán theo ngày) */}
          <TimeRangeSection
            data={
              data.timeRangeRaw && data.timeRangeRaw.length > 0
                ? data.timeRangeRaw
                : analytics?.timeRangeBreakdown || []
            }
          />
        </div>
      );

    case "service-structure":
      return (
        <div className="report-content-area">
          <h3 className="comparison-title">Cơ cấu dịch vụ</h3>

          {/* Hiển thị tháng đang chọn */}
          <div
            style={{
              marginBottom: 20,
              padding: "10px 15px",
              background: "#e3f2fd",
              color: "#1976d2",
              borderRadius: 8,
              display: "inline-block",
              fontSize: "14px",
            }}
          >
            Đang hiển thị dữ liệu tháng:{" "}
            <strong>
              {new Date(reportFilter.endDate).getMonth() + 1}/
              {new Date(reportFilter.endDate).getFullYear()}
            </strong>
          </div>

          {/* 👇 THAY ĐỔI Ở ĐÂY: Sử dụng Flexbox để chia cột */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap", // Tự xuống dòng trên màn hình nhỏ
              gap: 25, // Khoảng cách giữa 2 biểu đồ
              alignItems: "stretch", // Kéo giãn cho bằng chiều cao
            }}
          >
            {/* Cột trái: Biểu đồ Bar (chiếm 60%) */}
            <div style={{ flex: "3 1 600px", minWidth: 0 }}>
              <RevenueByPlan data={monthlyRevenue} />
            </div>

            {/* Cột phải: Biểu đồ Pie (chiếm 40%) */}
            <div style={{ flex: "2 1 400px", minWidth: 0 }}>
              <ServiceStructurePie data={pieDataForSelectedMonth} />
            </div>
          </div>
        </div>
      );
    // ✅ VIEW MỚI: Breakdown theo Công ty
    case "admin-company":
      return (
        <div className="report-content-area">
          <h3 className="comparison-title">Báo cáo theo công ty</h3>

          {/* 1. Hiển thị Biểu đồ trước */}
          <CompanyRevenueChart data={analytics?.companyBreakdown || []} />

          {/* 2. Hiển thị Bảng số liệu chi tiết sau */}
          <CompanyBreakdownTable data={analytics?.companyBreakdown || []} />
        </div>
      );

    // ✅ VIEW MỚI: Hiệu suất trạm
    case "admin-utilization":
      return (
        <div className="report-content-area">
          <h3 className="comparison-title">Hiệu suất sử dụng trạm</h3>

          <StationUtilizationCharts
            data={analytics?.utilizationStations || []}
            allStations={data?.allStations || []}
          />

          <StationUtilizationTable
            data={analytics?.utilizationStations || []}
            allStations={data?.allStations || []}
            onRefresh={onRefresh}
          />
        </div>
      );

    // ✅ VIEW MỚI: Top / Under / Zero activity
    case "admin-top-under":
      return (
        <div className="report-content-area">
          <h3 className="comparison-title">Phân loại hiệu suất cổng sạc</h3>

          {/* 👇 THAY ĐỔI Ở ĐÂY: Dùng Flexbox thay vì Grid */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
            <PortStatusPieChart topUnderData={analytics?.topUnder} />
            <TopPortRevenueChart topUnderData={analytics?.topUnder} />
          </div>

          <TopUnderZeroSection
            topUnder={analytics?.topUnder}
            chargers={data?.chargersData || []}
            stations={data?.allStations || []}
          />
        </div>
      );

    // ✅ VIEW MỚI: Phân loại xe
    case "admin-vehicle-type":
      return (
        <div className="report-content-area">
          <h3 className="comparison-title">Báo cáo theo Loại Xe</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
            <VehicleTypePieChart data={analytics?.vehicleTypeBreakdown || []} />
            <VehicleTypeTable data={analytics?.vehicleTypeBreakdown || []} />
          </div>
        </div>
      );
    default:
      return (
        <div className="report-content-area">
          <p style={{ textAlign: "center" }}>
            Chọn loại báo cáo để xem nội dung.
          </p>
        </div>
      );
  }
}
