import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

const KPIChart = ({ kpiData = {}, timeChartData = [] }) => {
  const {
    totalRevenue = 0,
    totalSessions = 0,
    avgUsage = 0,
    totalStations = 0,
  } = kpiData;

  // Dữ liệu cho biểu đồ cột KPI
  const kpiBarData = [
    { name: "Doanh thu", value: totalRevenue, color: "#4285F4" },
    { name: "Phiên sạc", value: totalSessions, color: "#34A853" },
    { name: "Tỷ lệ sử dụng (%)", value: avgUsage, color: "#FBBC05" },
    { name: "Số trạm", value: totalStations, color: "#EA4335" },
  ];

  // Dữ liệu cho biểu đồ tròn trạng thái
  const statusData = [
    {
      name: "Hoạt động",
      value: Math.floor(totalStations * 0.8),
      color: "#34A853",
    },
    {
      name: "Bảo trì",
      value: Math.floor(totalStations * 0.15),
      color: "#FBBC05",
    },
    {
      name: "Ngừng hoạt động",
      value: Math.floor(totalStations * 0.05),
      color: "#EA4335",
    },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div
          style={{
            backgroundColor: "#fff",
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <p style={{ fontWeight: "bold", marginBottom: "4px" }}>{label}</p>
          <p style={{ color: "#333", margin: "2px 0" }}>
            Giá trị: {data.value?.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid #e0e0e0",
        borderRadius: "12px",
        backgroundColor: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        marginBottom: "20px",
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
        Tổng quan KPI
      </h4>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
      >
        {/* Biểu đồ cột KPI */}
        <div>
          <h5
            style={{ textAlign: "center", marginBottom: "15px", color: "#333" }}
          >
            Chỉ số chính
          </h5>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={kpiBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                axisLine={{ stroke: "#ddd" }}
              />
              <YAxis tick={{ fontSize: 12 }} axisLine={{ stroke: "#ddd" }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#4285F4" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Biểu đồ tròn trạng thái trạm */}
        <div>
          <h5
            style={{ textAlign: "center", marginBottom: "15px", color: "#333" }}
          >
            Trạng thái trạm
          </h5>
          <ResponsiveContainer width="100%" height={250}>
            <RechartsPieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Biểu đồ xu hướng theo thời gian */}
      {timeChartData.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h5
            style={{ textAlign: "center", marginBottom: "15px", color: "#333" }}
          >
            Xu hướng sử dụng theo ngày
          </h5>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timeChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                axisLine={{ stroke: "#ddd" }}
              />
              <YAxis tick={{ fontSize: 12 }} axisLine={{ stroke: "#ddd" }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#4285F4"
                strokeWidth={2}
                dot={{ fill: "#4285F4", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default KPIChart;
