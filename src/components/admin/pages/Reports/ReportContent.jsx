// =========================================================
// ReportContent.jsx — RECHARTS CHO TẤT CẢ BIỂU ĐỒ
// =========================================================
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
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

const DEBUG_MODE = true;

// =========================================================
// 🔹 Heatmap Giờ x Ngày
// =========================================================
function HeatmapHourly({ data = [] }) {
  if (!data.length) return <div>Không có dữ liệu heatmap</div>;

  const days = [...new Set(data.map((d) => d.date))];
  const chartData = [...Array(24)].map((_, hour) => {
    const obj = { hour: `${hour}:00` };
    days.forEach((day) => {
      const entry = data.find((d) => d.date === day && d.hour === hour);
      obj[day] = entry?.value || 0;
    });
    return obj;
  });

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart
        data={chartData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="hour" />
        <YAxis />
        <Tooltip />
        {days.map((day, index) => (
          <Bar key={day} dataKey={day} fill={COLORS[index % COLORS.length]} />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// =========================================================
// 🔹 LineChart: Số phiên sạc / Doanh thu theo ngày
// =========================================================
function DailyLineCharts({ sessionsData = [], revenueData = [] }) {
  return (
    <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: "300px", height: "300px" }}>
        <h4>Số phiên sạc theo ngày</h4>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={sessionsData}
            margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="sessions"
              stroke="#4285F4"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ flex: 1, minWidth: "300px", height: "300px" }}>
        <h4>Doanh thu theo ngày (nghìn VND)</h4>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={revenueData}
            margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#34A853"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// =========================================================
// 🔹 Stacked Bar Chart: Doanh thu theo gói
// =========================================================
function StackedRevenue({ data = [] }) {
  if (!data.length) return <div>Không có dữ liệu doanh thu theo gói</div>;

  const planNames = [
    "Tieu chuan",
    "Cao cap",
    "Bac",
    "Doanh nghiep",
    "Vang",
    "Kim cuong",
    "Trả trước",
  ];

  return (
    <div style={{ width: "100%", height: 400 }}>
      <h4>Doanh thu theo gói</h4>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          {planNames.map((plan, index) => (
            <Bar
              key={plan}
              dataKey={plan}
              stackId="a"
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// =========================================================
// 🔹 PieChart: Cơ cấu gói dịch vụ
// =========================================================
function ServicePie({ data = [] }) {
  if (!data.length) return <div>Không có dữ liệu cơ cấu gói dịch vụ</div>;

  return (
    <div style={{ width: "100%", height: 300 }}>
      <h4>Cơ cấu gói dịch vụ</h4>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            fill="#8884d8"
            label={({ name, percent }) =>
              `${name} (${(percent * 100).toFixed(1)}%)`
            }
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// =========================================================
// 🔹 Area / Station Comparison (Hiệu suất trạm cũ)
// =========================================================
import AreaBox from "./AreaBox"; // Giữ nguyên file AreaBox cũ
import DetailedStationTable from "./DetailedStationTable"; // Giữ nguyên file DetailedStationTable cũ

// =========================================================
// 🔹 AreaComparisonCharts chuyển sang "Hiệu suất trạm" mới
// =========================================================
function AreaComparisonNew({ areaData = {}, timeChart = {} }) {
  const areaKeys = Object.keys(areaData);
  const barData = areaKeys.map((key) => ({
    name: key,
    sessions: areaData[key].sessions || 0,
    revenue: parseFloat((areaData[key].revenue / 1000).toFixed(2)) || 0,
  }));

  return (
    <div style={{ width: "100%" }}>
      <h3>Hiệu suất trạm</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={barData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="sessions" fill="#4285F4" />
          <Bar dataKey="revenue" fill="#34A853" />
        </BarChart>
      </ResponsiveContainer>

      <HeatmapHourly data={timeChart?.hourly || []} />
      <DailyLineCharts
        sessionsData={timeChart?.dailySessions || []}
        revenueData={timeChart?.dailyRevenue || []}
      />
    </div>
  );
}

// =========================================================
// 🔹 Component chính
// =========================================================
export default function ReportContent({ data, reportFilter }) {
  if (!data) return <div>Đang tải dữ liệu báo cáo...</div>;

  switch (reportFilter.viewType) {
    case "time-chart":
      return (
        <div>
          <HeatmapHourly data={data.timeChart?.hourly} />
          <DailyLineCharts
            sessionsData={data.timeChart?.dailySessions}
            revenueData={data.timeChart?.dailyRevenue}
          />
        </div>
      );

    case "area-comparison":
      return (
        <div>
          {/* Giữ nguyên so sánh khu vực cũ */}
          <div>
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

          {/* Hiệu suất trạm mới (chuyển sang phần riêng) */}
          <AreaComparisonNew
            areaData={data.areaComparison || {}}
            timeChart={data.timeChart || {}}
          />
        </div>
      );

    case "service-structure":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
          <StackedRevenue data={data.serviceStructure?.monthlyRevenue} />
          <ServicePie data={data.serviceStructure?.pieData} />
        </div>
      );

    default:
      return <div>Chọn loại báo cáo để xem nội dung.</div>;
  }
}
