// src/components/StackedBarChart.jsx
import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const normalize = (s = "") =>
  s
    .toString()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

// Bản đồ màu “chuẩn” cho các gói quen thuộc
const BASE_COLOR_MAP_RAW = {
  "Tiêu chuẩn": "#4285F4",
  "Cao cấp": "#34A853",
  Bạc: "#FBBC05",
  "Doanh nghiệp": "#EA4335",
  Vàng: "#9b59b6",
  "Kim cương": "#1abc9c",
  Khác: "#8e44ad",
};
const BASE_COLOR_MAP = Object.fromEntries(
  Object.entries(BASE_COLOR_MAP_RAW).map(([k, v]) => [normalize(k), v])
);

const PALETTE = [
  "#4285F4",
  "#34A853",
  "#FBBC05",
  "#EA4335",
  "#9b59b6",
  "#1abc9c",
  "#7f8c8d",
  "#8e44ad",
  "#16a085",
  "#2ecc71",
  "#e67e22",
  "#d35400",
];

const StackedBarChart = ({ data = [] }) => {
  // Không có dữ liệu
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "#666",
          fontSize: "16px",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e0e0e0",
        }}
      >
        Không có dữ liệu doanh thu theo gói
      </div>
    );
  }

  // Lấy tập tất cả dataKeys (các gói) trừ "month" và "total"
  const planKeys = useMemo(() => {
    const keys = new Set();
    data.forEach((row) => {
      Object.keys(row || {}).forEach((k) => {
        if (k !== "month" && k !== "total") keys.add(k);
      });
    });
    return Array.from(keys);
  }, [data]);

  // Ánh xạ màu: ưu tiên BASE_COLOR_MAP, nếu thiếu thì rải theo PALETTE
  const colorMap = useMemo(() => {
    const map = { ...BASE_COLOR_MAP };
    let paletteIdx = 0;
    planKeys.forEach((key) => {
      const nk = normalize(key);
      if (!map[nk]) {
        map[nk] = PALETTE[paletteIdx % PALETTE.length];
        paletteIdx += 1;
      }
    });
    return map;
  }, [planKeys]);

  // Tooltip tuỳ biến: hiển thị Tổng + từng gói theo VND
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const total = payload.reduce((sum, p) => sum + (p.value || 0), 0);

    return (
      <div
        style={{
          backgroundColor: "#fff",
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          minWidth: 200,
        }}
      >
        <p style={{ fontWeight: 700, marginBottom: 8 }}>{label}</p>
        <p style={{ margin: "0 0 6px", color: "#333" }}>
          Tổng: {total.toLocaleString("vi-VN")} đ
        </p>
        {payload.map((entry, idx) => (
          <p
            key={idx}
            style={{
              color: entry.color,
              margin: "2px 0",
              fontSize: 14,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span>{entry.name}</span>
            <span>{(entry.value || 0).toLocaleString("vi-VN")} đ</span>
          </p>
        ))}
      </div>
    );
  };

  // Format trục Y: rút gọn theo triệu (M) khi cần
  const yTick = (v) => {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
    return v;
  };

  return (
    <div
      style={{
        padding: 20,
        border: "1px solid #e0e0e0",
        borderRadius: 12,
        backgroundColor: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        marginBottom: 20,
      }}
    >
      <h4
        style={{
          color: "#4285F4",
          fontWeight: 600,
          textAlign: "center",
          marginBottom: 20,
          fontSize: "1.2rem",
        }}
      >
        Doanh thu theo gói dịch vụ
      </h4>

      <ResponsiveContainer width="100%" height={360} minWidth={0}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            axisLine={{ stroke: "#ddd" }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            axisLine={{ stroke: "#ddd" }}
            tickFormatter={yTick}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {planKeys.map((plan) => (
            <Bar
              key={plan}
              dataKey={plan}
              name={plan}
              stackId="a"
              fill={colorMap[normalize(plan)] || "#7f8c8d"}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StackedBarChart;
