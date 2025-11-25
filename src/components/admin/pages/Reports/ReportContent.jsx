import React, { useState, useEffect, useMemo } from "react";
import { DeleteOutlined } from "@ant-design/icons"; // Nhớ import icon thùng rác
import { deletePort } from "../../../../api/reportsApi";

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
// 🔹 6. KPI tổng quan tháng cho Admin
// =========================================================
function AdminMonthlyOverview({ summary, revenueSources }) {
  if (!summary) {
    return (
      <div style={{ padding: 20, color: "#777", fontStyle: "italic" }}>
        Không có dữ liệu tổng quan tháng.
      </div>
    );
  }

  const {
    sessionCount,
    energyKwh,
    subtotal,
    tax,
    total,
    durationMin,
    idleMin,
    avgPricePerKwh,
    month,
    year,
  } = {
    sessionCount: summary.sessionCount ?? 0,
    energyKwh: summary.energyKwh ?? 0,
    subtotal: summary.subtotal ?? 0,
    tax: summary.tax ?? 0,
    total: summary.total ?? 0,
    durationMin: summary.durationMin ?? 0,
    idleMin: summary.idleMin ?? 0,
    avgPricePerKwh: summary.avgPricePerKwh ?? 0,
    month: summary.month,
    year: summary.year,
  };

  const safeRevenueSources = revenueSources || {};
  const customerTotal = safeRevenueSources.customerTotal ?? 0;
  const companyTotal = safeRevenueSources.companyTotal ?? 0;
  const guestTotal = safeRevenueSources.guestTotal ?? 0;
  const allRev = customerTotal + companyTotal + guestTotal || 1;

  const mixRows = [
    { label: "Khách cá nhân", value: customerTotal },
    { label: "Xe công ty", value: companyTotal },
    { label: "Khách vãng lai", value: guestTotal },
  ];

  return (
    <>
      <p style={{ marginBottom: 16, color: "#4b5563" }}>
        Tổng quan tháng{" "}
        <strong>
          {month}/{year}
        </strong>{" "}
        (theo dữ liệu Analytics).
      </p>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Doanh thu sau thuế</span>
          <span className="kpi-value">{total.toLocaleString("vi-VN")} ₫</span>
          <span className="kpi-sub">
            Trước thuế: {subtotal.toLocaleString("vi-VN")} ₫ | Thuế:{" "}
            {tax.toLocaleString("vi-VN")} ₫
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Điện năng tiêu thụ</span>
          <span className="kpi-value">
            {energyKwh.toLocaleString("vi-VN")} kWh
          </span>
          <span className="kpi-sub">
            Giá TB: {avgPricePerKwh.toLocaleString("vi-VN")} ₫/kWh
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Số phiên sạc</span>
          <span className="kpi-value">
            {sessionCount.toLocaleString("vi-VN")}
          </span>
          <span className="kpi-sub">
            Thời gian sạc: {durationMin.toLocaleString("vi-VN")} phút
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Thời gian đỗ chiếm chỗ</span>
          <span className="kpi-value">
            {idleMin.toLocaleString("vi-VN")} phút
          </span>
          <span className="kpi-sub">
            Tỷ lệ Idle / Sạc:{" "}
            {durationMin > 0 ? ((idleMin / durationMin) * 100).toFixed(1) : 0}%
          </span>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h4>Cơ cấu nguồn doanh thu (tháng)</h4>
        <table className="report-table">
          <thead>
            <tr>
              <th>Nguồn</th>
              <th>Doanh thu (₫)</th>
              <th>Tỷ lệ (%)</th>
            </tr>
          </thead>
          <tbody>
            {mixRows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.value.toLocaleString("vi-VN")}</td>
                <td>{((row.value / allRev) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// =========================================================
// 🔹 7. Bảng breakdown theo Công ty
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
// 🔹 7.1 Biểu đồ Doanh thu & Phiên sạc theo Công ty (MỚI)
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
// 🔹 8. Bảng Utilization theo Trạm (ĐÃ SỬA: GỘP DỮ LIỆU FE)
// =========================================================
function StationUtilizationTable({ data = [], allStations = [] }) {
  // 1. Logic Gộp dữ liệu (Merge):
  // Lấy danh sách trạm gốc làm chuẩn, ghép với dữ liệu hiệu suất
  const mergedData = useMemo(() => {
    if (!allStations.length) return data; // Fallback nếu chưa có list gốc

    // Tạo Map để tra cứu nhanh dữ liệu hiệu suất từ BE trả về
    // Key là tên trạm (theo logic BE mapping: code = stationName)
    const statsMap = new Map();
    data.forEach((item) => {
      if (item.code) {
        statsMap.set(item.code, item); // Key gốc
        statsMap.set(item.code.trim().toLowerCase(), item); // Key chuẩn hóa
      }
    });

    // Duyệt qua tất cả trạm trong hệ thống
    const result = allStations.map((station) => {
      // Lấy tên trạm từ danh sách gốc (Thử nhiều trường khác nhau để chắc ăn)
      const rawName =
        station.name ||
        station.stationName ||
        station.code ||
        station.title ||
        "Unknown";
      const searchName = String(rawName).trim().toLowerCase();

      // Thử tìm trong Map
      let stats = statsMap.get(rawName) || statsMap.get(searchName);

      if (stats) {
        return { ...stats, status: "active" }; // Đã có số liệu
      }

      // Nếu không tìm thấy -> Tạo dữ liệu 0
      return {
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
            <th>Trạng thái</th> {/* Cột mới cảnh báo */}
            <th>Số phiên</th>
            <th>kWh</th>
            <th>Thời gian sạc (phút)</th>
            <th>Utilization (%)</th>
          </tr>
        </thead>
        <tbody>
          {mergedData.map((row, idx) => {
            // Logic tô màu cảnh báo
            const isInactive =
              row.status === "inactive" || row.sessionCount === 0;
            const isLowPerformance = !isInactive && row.utilization < 0.05; // Dưới 5%

            let rowStyle = {};
            let statusBadge = (
              <span style={{ color: "green", fontWeight: "bold" }}>
                Hoạt động tốt
              </span>
            );

            if (isInactive) {
              rowStyle = { backgroundColor: "#ffebeb" }; // Đỏ nhạt
              statusBadge = (
                <span style={{ color: "#d63031", fontWeight: "bold" }}>
                  Không hoạt động
                </span>
              );
            } else if (isLowPerformance) {
              rowStyle = { backgroundColor: "#fffbe6" }; // Vàng nhạt
              statusBadge = (
                <span style={{ color: "#f39c12", fontWeight: "bold" }}>
                  Hiệu suất thấp
                </span>
              );
            }

            return (
              <tr key={idx} style={rowStyle}>
                <td>{idx + 1}</td>
                <td style={{ fontWeight: 500 }}>{row.code}</td>
                <td>{statusBadge}</td>
                <td>{row.sessionCount?.toLocaleString("vi-VN")}</td>
                <td>{row.energyKwh?.toLocaleString("vi-VN")}</td>
                <td>{row.chargingMinutes?.toLocaleString("vi-VN")}</td>
                <td>
                  <strong>{((row.utilization ?? 0) * 100).toFixed(2)}%</strong>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
// 🔹 8.1 Biểu đồ Hiệu suất Trạm (ĐÃ SỬA LỖI TOOLTIP)
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
                paddingAngle={5}
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
// 🔹 9. Top / Under / Zero activity (theo Port) - ĐÃ CHỈNH SỬA
// =========================================================

// =========================================================
// 🔹 9.3 Bảng chi tiết Top / Under / Zero (ĐÃ FIX LỖI HOOK)
// =========================================================
function TopUnderZeroSection({ topUnder }) {
  // 1. KHAI BÁO HOOK TRƯỚC (QUAN TRỌNG ĐỂ TRÁNH CRASH)
  const [zeroList, setZeroList] = useState([]);

  // 2. Logic lọc trùng (useMemo) phải khai báo luôn, xử lý null bên trong
  const filteredUnderUtilized = useMemo(() => {
    if (!topUnder) return []; // Xử lý null ở đây thay vì return cả component

    const { topActive = [], underUtilized = [] } = topUnder;
    const topKeys = new Set(
      topActive.map((item) => `${item.key}_${item.key2}`)
    );

    return underUtilized.filter((item) => {
      const uniqueKey = `${item.key}_${item.key2}`;
      return !topKeys.has(uniqueKey);
    });
  }, [topUnder]);

  // 3. useEffect cập nhật zeroList
  useEffect(() => {
    if (topUnder?.zeroActivity) {
      setZeroList(topUnder.zeroActivity);
    }
  }, [topUnder]);

  // 4. Bây giờ mới được return null nếu không có data
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
          <th>#</th>
          <th>Cổng sạc (Port)</th>
          <th>Trụ sạc (Charger)</th>
          {type !== "zero" ? (
            <>
              <th>Số phiên</th>
              <th>kWh</th>
              <th>Doanh thu (₫)</th>
              <th>Thời gian sạc (phút)</th>
            </>
          ) : (
            <th style={{ textAlign: "center", width: 120 }}>Hành động</th>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={`${type}-${row.key ?? idx}`}>
            <td>{idx + 1}</td>
            <td style={{ fontWeight: 500 }}>{row.key}</td>
            <td>{row.key2}</td>
            {type !== "zero" ? (
              <>
                <td>{row.sessionCount?.toLocaleString("vi-VN")}</td>
                <td>{row.energyKwh?.toLocaleString("vi-VN")}</td>
                <td>{row.total?.toLocaleString("vi-VN")}</td>
                <td>{row.durationMin?.toLocaleString("vi-VN")}</td>
              </>
            ) : (
              <td style={{ textAlign: "center" }}>
                <button
                  className="btn-icon-delete"
                  onClick={() => handleDeleteClick(row)}
                  style={{
                    border: "none",
                    background: "#ffebeb",
                    color: "#c0392b",
                    padding: "6px 12px",
                    borderRadius: 4,
                    cursor: "pointer",
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
// 🔹 9.1 Biểu đồ Tròn: Phân loại trạng thái
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
// 🔹 9.2 Biểu đồ Cột: Top 10 Doanh thu (FIX LỖI HIỂN THỊ)
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
// 🔹 11.1 Biểu đồ Tròn: Cơ cấu loại xe (MỚI)
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
// 🔹 11.2 Bảng chi tiết Loại xe (FIX GIAO DIỆN TRÀN)
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
        Ghi chú: <strong>Idle</strong> là thời gian xe đỗ nhưng không sạc.
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

  const { timeChart, serviceStructure, analytics } = data;

  const monthlyRevenue = serviceStructure?.monthlyRevenue || [];

  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (!monthlyRevenue.length) return "";
    return monthlyRevenue[monthlyRevenue.length - 1].month;
  });

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

          <TopUnderZeroSection topUnder={analytics?.topUnder} />
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
