// =========================================================
// ReportContent.jsx — HOÀN CHỈNH (Recharts + dữ liệu từ API)
// =========================================================
import React, { useState, useEffect, useMemo } from "react";

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

const regionLabel = (key) => {
  switch (key) {
    case "mienBac":
      return "Miền Bắc";
    case "mienTrung":
      return "Miền Trung";
    case "mienNam":
      return "Miền Nam";
    default:
      return key;
  }
};

// =========================================================
// 🔹 1. Biểu đồ HEATMAP 7×24 (theo giờ)
// =========================================================
// =========================================================
// 🔹 1. Biểu đồ HEATMAP 7×24 (theo giờ, gộp theo THỨ)
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

  // 0 = CN, 1 = T2, ...
  const WEEKDAY_LABELS = [
    "CN",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];

  // Chuẩn hoá dữ liệu: gộp theo (hour, weekday)
  const chartData = Array.from({ length: 24 }, (_, hour) => {
    const row = { hour: `${hour}:00` };

    WEEKDAY_LABELS.forEach((label, weekdayIndex) => {
      const sum = data
        .filter((d) => {
          if (d.hour !== hour) return false;
          const dateObj = new Date(d.date);
          const dow = dateObj.getDay(); // 0..6
          return dow === weekdayIndex;
        })
        .reduce((acc, d) => acc + Number(d.value || 0), 0);

      row[label] = sum;
    });

    return row;
  });

  // Tìm max để set Y-axis domain
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
              // name = label (Thứ 2, Thứ 3...), value = số phiên
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
      {/* Số phiên sạc */}
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

      {/* Doanh thu */}
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
// 🔹 3. Biểu đồ doanh thu theo gói (Stacked Bar)
// =========================================================
function RevenueByPlan({ data = [] }) {
  if (!data.length) {
    return (
      <div className="chart-empty">Không có dữ liệu doanh thu theo gói</div>
    );
  }

  return (
    <div className="plan-revenue-card">
      <div className="plan-revenue-top">
        <div>
          <p className="eyebrow">Cơ cấu dịch vụ</p>
          <h4>Doanh thu theo gói dịch vụ</h4>
          <span className="subtitle">Đơn vị: đồng (₫)</span>
        </div>
        <div className="mini-legend">
          {OFFICIAL_PLANS.map((plan, i) => (
            <span key={plan}>
              <i style={{ background: COLORS[i % COLORS.length] }} />
              {plan}
            </span>
          ))}
        </div>
      </div>

      <div className="plan-revenue-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(v) => `${v.toLocaleString()} ₫`} />
            {OFFICIAL_PLANS.map((plan, i) => (
              <Bar
                key={plan}
                dataKey={plan}
                stackId="a"
                fill={COLORS[i % COLORS.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-footnote">
        Chú thích: Mỗi cột là một tháng; màu sắc thể hiện doanh thu từng gói.
      </p>
    </div>
  );
}

// =========================================================
// 🔹 4. Biểu đồ Pie cơ cấu gói dịch vụ
// =========================================================
function ServiceStructurePie({ data = [] }) {
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
        Không có dữ liệu cơ cấu dịch vụ
      </div>
    );
  }

  const total = data.reduce((s, d) => s + Number(d.value || 0), 0);
  const dominant = data.reduce(
    (best, item) =>
      Number(item.value || 0) > Number(best.value || 0) ? item : best,
    data[0] || { value: 0 }
  );

  const renderLabel = ({ name, percent }) => {
    if (percent < 0.06) return "";
    return `${name} ${(percent * 100).toFixed(1)}%`;
  };

  return (
    <div className="service-structure-card">
      <h4>Cơ cấu dịch vụ (theo doanh thu)</h4>
      <div className="service-structure-pie">
        <div className="pie-chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 8 }}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={2}
                labelLine={false}
                label={renderLabel}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => `${v.toLocaleString()} ₫`}
                labelFormatter={() => `Tổng: ${total.toLocaleString()} ₫`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="pie-summary">
          <p className="pie-summary-label">Gói nổi bật</p>
          <h5>{dominant?.name || "—"}</h5>
          <span className="pie-summary-percent">
            {total > 0
              ? `${(((dominant?.value || 0) / total) * 100).toFixed(1)}%`
              : "0%"}
          </span>
          <p className="pie-summary-total">
            Tổng doanh thu: <strong>{total.toLocaleString()} ₫</strong>
          </p>
        </div>
      </div>

      <div className="pie-legend">
        {data.map((item, index) => (
          <div className="pie-legend-item" key={item.name || index}>
            <span
              className="dot"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="name">{item.name}</span>
            <span className="value">{item.value?.toLocaleString() || 0} ₫</span>
          </div>
        ))}
      </div>

      <p className="pie-footnote">
        Chú thích: Tỷ trọng doanh thu giữa 6 gói dịch vụ hợp lệ.
      </p>
    </div>
  );
}

// =========================================================
// 🔹 5. So sánh khu vực (Bar)
// =========================================================
function AreaComparison({ areaData = {} }) {
  const data = Object.entries(areaData).map(([key, value]) => ({
    region: regionLabel(key),
    revenue: Number(value.revenue || 0),
    sessions: Number(value.sessions || 0),
  }));

  return (
    <div style={{ marginTop: 20 }}>
      <h4>So sánh hiệu suất khu vực</h4>
      <div className="chart-box-350">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="region" />
            <YAxis />
            <Tooltip
              formatter={(v, name) =>
                name === "revenue"
                  ? [`${v.toLocaleString()} ₫`, "Doanh thu"]
                  : [`${v.toLocaleString()}`, "Phiên sạc"]
              }
            />
            <Legend />
            <Bar dataKey="revenue" fill="#34A853" />
            <Bar dataKey="sessions" fill="#4285F4" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
        Chú thích: Doanh thu (₫) và số phiên (lần) theo từng khu vực.
      </p>
    </div>
  );
}

// =========================================================
// 🔹 COMPONENT CHÍNH
// =========================================================
export default function ReportContent({ data, reportFilter }) {
  if (!data)
    return (
      <div style={{ padding: 30, textAlign: "center" }}>
        Đang tải dữ liệu...
      </div>
    );

  const { areaComparison, stationTable, timeChart, serviceStructure } = data;

  // ====== CHỌN THÁNG + PIE DATA THEO THÁNG ======
  const monthlyRevenue = serviceStructure?.monthlyRevenue || [];

  // state: tháng đang chọn (VD "11/2025")
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (!monthlyRevenue.length) return "";
    // mặc định: tháng mới nhất
    return monthlyRevenue[monthlyRevenue.length - 1].month;
  });

  // Khi monthlyRevenue thay đổi (do filter ngày / trạm),
  // nếu tháng đang chọn không còn trong danh sách thì nhảy về tháng mới nhất
  useEffect(() => {
    if (!monthlyRevenue.length) {
      setSelectedMonth("");
      return;
    }
    const exists = monthlyRevenue.some((row) => row.month === selectedMonth);
    if (!selectedMonth || !exists) {
      setSelectedMonth(monthlyRevenue[monthlyRevenue.length - 1].month);
    }
  }, [monthlyRevenue, selectedMonth]);

  // Tính pieData theo THÁNG đang chọn
  const pieDataForSelectedMonth = useMemo(() => {
    if (!monthlyRevenue.length) return [];

    const row =
      monthlyRevenue.find((r) => r.month === selectedMonth) ||
      monthlyRevenue[monthlyRevenue.length - 1];

    if (!row) return [];

    return OFFICIAL_PLANS.map((name) => ({
      name,
      value: Number(row[name] || 0),
    }));
  }, [monthlyRevenue, selectedMonth]);
  // ====== HẾT PHẦN THÊM MỚI ======

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

    case "service-structure":
      return (
        <div className="report-content-area">
          <h3 className="comparison-title">Cơ cấu dịch vụ</h3>

          {/* Bộ lọc tháng cho view Cơ cấu dịch vụ */}
          {monthlyRevenue.length > 0 && (
            <div
              style={{
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontWeight: 500 }}>Tháng:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  minWidth: 120,
                }}
              >
                {monthlyRevenue.map((row) => (
                  <option key={row.month} value={row.month}>
                    {row.month}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 12, color: "#666" }}>
                (Bar hiển thị toàn bộ các tháng trong khoảng lọc. Pie hiển thị
                riêng tháng đang chọn.)
              </span>
            </div>
          )}

          <RevenueByPlan data={monthlyRevenue} />
          <ServiceStructurePie data={pieDataForSelectedMonth} />
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
