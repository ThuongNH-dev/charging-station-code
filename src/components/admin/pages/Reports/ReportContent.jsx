// =========================================================
// ReportContent.jsx — HOÀN CHỈNH (dùng Recharts + dữ liệu từ API)
// =========================================================

import React from "react";
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
import AreaBox from "./AreaBox";
import DetailedStationTable from "./DetailedStationTable";

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
          padding: "40px",
          color: "#777",
          fontStyle: "italic",
        }}
      >
        Không có dữ liệu heatmap
      </div>
    );
  }

  const days = [...new Set(data.map((d) => d.date))].sort();
  const chartData = Array.from({ length: 24 }, (_, hour) => {
    const obj = { hour: `${hour}:00` };
    days.forEach((day) => {
      const item = data.find((d) => d.date === day && d.hour === hour);
      obj[day] = item?.value || 0;
    });
    return obj;
  });

  const maxVal = Math.max(1, ...data.map((d) => d.value || 0));

  return (
    <div style={{ marginTop: 30 }}>
      <h4 style={{ marginBottom: 15 }}>Mức độ hoạt động theo giờ (7 ngày)</h4>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis domain={[0, maxVal]} />
          <Tooltip />
          {days.map((day, idx) => (
            <Bar
              key={day}
              dataKey={day}
              stackId="a"
              fill={`hsl(${(idx * 360) / days.length}, 70%, 50%)`}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// =========================================================
// 🔹 2. Biểu đồ theo ngày (Sessions + Revenue)
// =========================================================
function DailyCharts({ dailySessions = [], dailyRevenue = [] }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 20,
        flexWrap: "wrap",
        marginTop: 20,
      }}
    >
      {/* Số phiên sạc */}
      <div style={{ flex: 1, minWidth: 350, height: 300 }}>
        <h4>Số phiên sạc theo ngày</h4>
        <ResponsiveContainer>
          <LineChart data={dailySessions}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
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

      {/* Doanh thu */}
      <div style={{ flex: 1, minWidth: 350, height: 300 }}>
        <h4>Doanh thu theo ngày (₫)</h4>
        <ResponsiveContainer>
          <LineChart data={dailyRevenue}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip formatter={(v) => `${v?.toLocaleString()} ₫`} />
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
    </div>
  );
}

// =========================================================
// 🔹 3. Biểu đồ doanh thu theo gói (Stacked Bar)
// =========================================================
function RevenueByPlan({ data = [] }) {
  if (!data.length) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px",
          color: "#777",
          fontStyle: "italic",
        }}
      >
        Không có dữ liệu doanh thu theo gói
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h4>Doanh thu theo gói dịch vụ</h4>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(v) => `${v.toLocaleString()} ₫`} />
          <Legend />
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
          padding: "40px",
          color: "#777",
          fontStyle: "italic",
        }}
      >
        Không có dữ liệu cơ cấu dịch vụ
      </div>
    );
  }

  const total = data.reduce((s, d) => s + Number(d.value || 0), 0);

  return (
    <div style={{ marginTop: 30 }}>
      <h4>Cơ cấu dịch vụ</h4>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={100}
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(1)}%`
            }
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => `${v.toLocaleString()} ₫`}
            labelFormatter={() => `Tổng: ${total.toLocaleString()} ₫`}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
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
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="region" />
          <YAxis />
          <Tooltip formatter={(v) => `${v.toLocaleString()} ₫`} />
          <Legend />
          <Bar dataKey="revenue" fill="#34A853" />
          <Bar dataKey="sessions" fill="#4285F4" />
        </BarChart>
      </ResponsiveContainer>
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

  switch (reportFilter.viewType) {
    // -----------------------------------------------------
    case "area-comparison":
      return (
        <div className="report-content-area">
          <h3 className="comparison-title">So sánh khu vực</h3>

          {/* Tổng quan khu vực */}
          <div
            className="area-boxes-container"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {Object.entries(areaComparison || {}).map(([key, val]) => (
              <AreaBox key={key} name={regionLabel(key)} data={val} />
            ))}
          </div>

          {/* Bảng chi tiết */}
          <DetailedStationTable data={stationTable || []} />

          {/* Biểu đồ tổng hợp khu vực */}
          <AreaComparison areaData={areaComparison} />
        </div>
      );

    // -----------------------------------------------------
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

    // -----------------------------------------------------
    case "service-structure":
      return (
        <div className="report-content-area">
          <h3 className="comparison-title">Cơ cấu dịch vụ</h3>
          <RevenueByPlan data={serviceStructure?.monthlyRevenue || []} />
          <ServiceStructurePie data={serviceStructure?.pieData || []} />
        </div>
      );

    // -----------------------------------------------------
    case "station-output":
      return (
        <div className="report-content-area">
          <h3 className="comparison-title">Hiệu suất xuất trạm</h3>
          <DetailedStationTable data={stationTable || []} />
        </div>
      );

    // -----------------------------------------------------
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
