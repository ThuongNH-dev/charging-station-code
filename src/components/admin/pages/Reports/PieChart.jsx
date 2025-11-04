// =========================================================
// PieChart.jsx — Pie cơ cấu gói dịch vụ (Recharts)
// Dữ liệu vào: [{ name: "Tiêu chuẩn", value: 1230000 }, ...]
// =========================================================

import React, { useMemo } from "react";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

/** 6 gói hợp lệ (có dấu) */
const OFFICIAL_PLANS = [
  "Tiêu chuẩn",
  "Cao cấp",
  "Bạc",
  "Doanh nghiệp",
  "Vàng",
  "Kim cương",
];

/** Màu cố định theo thứ tự OFFICIAL_PLANS */
const OFFICIAL_COLORS = {
  "Tiêu chuẩn": "#4285F4",
  "Cao cấp": "#34A853",
  Bạc: "#FBBC05",
  "Doanh nghiệp": "#EA4335",
  Vàng: "#9b59b6",
  "Kim cương": "#1abc9c",
};

const FALLBACK = [
  "#4285F4",
  "#34A853",
  "#FBBC05",
  "#EA4335",
  "#9b59b6",
  "#1abc9c",
  "#7f8c8d",
];

/** Chuẩn hoá alias không dấu → tên chính thức (chỉ cho hiển thị/legend) */
const normalizePlanName = (raw) => {
  const s = (raw ?? "").toString().trim().toLowerCase();
  if (!s) return "Tiêu chuẩn";
  if (["tiêu chuẩn", "tieu chuan"].includes(s)) return "Tiêu chuẩn";
  if (["cao cấp", "cao cap"].includes(s)) return "Cao cấp";
  if (["bạc", "bac"].includes(s)) return "Bạc";
  if (["doanh nghiệp", "doanh nghiep"].includes(s)) return "Doanh nghiệp";
  if (["vàng", "vang"].includes(s)) return "Vàng";
  if (["kim cương", "kim cuong"].includes(s)) return "Kim cương";
  return "Tiêu chuẩn";
};

/** Gộp các mục trùng tên sau khi chuẩn hoá */
const normalizeAndAggregate = (data) => {
  const acc = new Map();
  (Array.isArray(data) ? data : []).forEach((d) => {
    const name = normalizePlanName(d?.name);
    const val = Number(d?.value) || 0;
    acc.set(name, (acc.get(name) || 0) + val);
  });
  return OFFICIAL_PLANS.map((name) => ({ name, value: acc.get(name) || 0 }));
};

/** Label renderer — đẩy nhãn ra ngoài lát, ẩn lát quá nhỏ để tránh chồng */
const MIN_LABEL_PERCENT = 0.5; // ẩn label nếu < 0.5%

const renderLabel = (props, total) => {
  const { cx, cy, midAngle, outerRadius, name, value } = props;
  const val = Number(value) || 0;
  const pct = total ? (val / total) * 100 : 0;

  // Ẩn mọi lát 0% hoặc rất nhỏ để khỏi chồng nhau
  if (val <= 0 || pct < MIN_LABEL_PERCENT) return null;

  const r = outerRadius + 18;
  const x = cx + r * Math.cos(-(midAngle * Math.PI) / 180);
  const y = cy + r * Math.sin(-(midAngle * Math.PI) / 180);

  return (
    <text
      x={x}
      y={y}
      textAnchor={x >= cx ? "start" : "end"}
      dominantBaseline="central"
      style={{ fontSize: 12 }}
    >
      {`${name} ${pct.toFixed(1)}%`}
    </text>
  );
};

export default function PieChart({ data = [] }) {
  const normalized = useMemo(() => normalizeAndAggregate(data), [data]);
  const hasData = normalized.some((d) => Number(d.value) > 0);

  if (!hasData) {
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
        Không có dữ liệu cơ cấu gói dịch vụ
      </div>
    );
  }

  const palette = OFFICIAL_PLANS.map(
    (n, i) => OFFICIAL_COLORS[n] || FALLBACK[i % FALLBACK.length]
  );
  const total = normalized.reduce((s, d) => s + (Number(d.value) || 0), 0);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0];
    const val = Number(p.value || 0);
    const percent = total ? ((val / total) * 100).toFixed(1) : 0;
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #ddd",
          padding: 12,
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{p.name}</div>
        <div>Giá trị: {val.toLocaleString("vi-VN")} đ</div>
        <div>Tỷ lệ: {percent}%</div>
      </div>
    );
  };

  const CustomLegend = ({ payload }) => (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 16,
        marginTop: 10,
      }}
    >
      {payload.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              background: it.color,
              borderRadius: 3,
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 14 }}>{it.value}</span>
        </div>
      ))}
    </div>
  );

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
        Cơ cấu gói dịch vụ
      </h4>

      <ResponsiveContainer width="100%" height={360}>
        <RePieChart>
          <Pie
            data={normalized}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60} // donut để thoáng
            outerRadius={110}
            startAngle={90} // xoay để label phân tán
            endAngle={-270}
            paddingAngle={2} // tạo khe giữa các lát
            minAngle={2}
            label={(p) => renderLabel(p, total)}
            labelLine={false}
          >
            {normalized.map((_, i) => (
              <Cell key={i} fill={palette[i]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  );
}
