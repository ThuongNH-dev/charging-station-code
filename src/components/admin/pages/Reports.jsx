import React, { useState, useMemo } from "react";
import {
  DownloadOutlined,
  CaretUpOutlined,
  CaretDownOutlined,
} from "@ant-design/icons";
// Import file CSS riêng cho trang Reports
import "./Reports.css";

// =========================================================
// MOCK DATA CHO TRANG BÁO CÁO & THỐNG KÊ (ĐÃ CẬP NHẬT GÓI DỊCH VỤ)
// =========================================================
const mockData = {
  // Dữ liệu KPI Tổng quan (Giữ nguyên)
  kpiOverview: {
    totalRevenue: {
      value: "$3,250",
      change: "+8%",
      isPositive: true,
      period: "so với hôm qua",
      icon: "cash",
    },
    totalEnergy: {
      value: "343,425 kWh",
      change: "+12%",
      isPositive: true,
      period: "so với hôm qua",
      icon: "energy",
    },
    monthlyRevenue: {
      value: "1,068 đ",
      change: "Trung bình",
      isPositive: false,
      period: "Trung bình",
      icon: "avg-cash",
    },
    dailyRevenue: {
      value: "10 đ",
      change: "Trung bình",
      isPositive: false,
      period: "Trung bình",
      icon: "avg-cash",
    },
  },

  // Dữ liệu cảnh báo (Giữ nguyên)
  warnings: [
    { name: "Trạm A - Hà Nội", usage: "72%", status: "Tốt", color: "success" },
    {
      name: "Trạm B - Hà Nội",
      usage: "45%",
      status: "Thấp",
      color: "danger",
    },
    {
      name: "Trạm C - Đà Nẵng",
      usage: "30%",
      status: "Thấp",
      color: "danger",
    },
    {
      name: "Trạm D - HCM",
      usage: "85%",
      status: "Tốt",
      color: "success",
    },
    {
      name: "Trạm E - HCM",
      usage: "50%",
      status: "TB",
      color: "warning",
    },
  ],

  // Danh sách trạm (Giữ nguyên)
  stationList: [
    { name: "Trạm A - Hà Nội", capacity: "1230 đ - 120 phiên", usage: "72%" },
    { name: "Trạm B - Hà Nội", capacity: "600 đ - 95 phiên", usage: "45%" },
    { name: "Trạm C - Đà Nẵng", capacity: "400 đ - 60 phiên", usage: "30%" },
    { name: "Trạm D - HCM", capacity: "1800 đ - 310 phiên", usage: "85%" },
    { name: "Trạm E - HCM", capacity: "750 đ - 90 phiên", usage: "52%" },
  ],

  // Dữ liệu mới cho phần So sánh Khu vực (Giữ nguyên)
  areaComparison: {
    mienBac: {
      revenue: "5,400 đ",
      sessions: "430 phiên",
      avgUsage: "68%",
    },
    mienTrung: {
      revenue: "3,100 đ",
      sessions: "240 phiên",
      avgUsage: "55%",
    },
    mienNam: {
      revenue: "9,250 đ",
      sessions: "720 phiên",
      avgUsage: "78%",
    },
  },

  // Dữ liệu cho Bảng Chi tiết Trạm (Giữ nguyên)
  detailedStationTable: [
    {
      name: "Trạm A - Hà Nội",
      revenue: "1,250 đ",
      sessions: 120,
      usage: "72%",
      status: "Online",
    },
    {
      name: "Trạm B - Hà Nội",
      revenue: "850 đ",
      sessions: 80,
      usage: "48%",
      status: "Cần kiểm tra",
    },
    {
      name: "Trạm C - Đà Nẵng",
      revenue: "430 đ",
      sessions: 40,
      usage: "30%",
      status: "Offline",
    },
    {
      name: "Trạm D - HCM",
      revenue: "1,980 đ",
      sessions: 210,
      usage: "85%",
      status: "Online",
    },
    {
      name: "Trạm E - HCM",
      revenue: "720 đ",
      sessions: 60,
      usage: "50%",
      status: "Online",
    },
  ],

  // DỮ LIỆU MỚI CHO PHẦN BIỂU ĐỒ THỜI GIAN (Giữ nguyên)
  timeChart: {
    // Dữ liệu cho biểu đồ cột: Số phiên sạc (sessions)
    dailySessions: [
      { day: "Thứ 2", sessions: 100 },
      { day: "Thứ 3", sessions: 60 },
      { day: "Thứ 4", sessions: 90 },
      { day: "Thứ 5", sessions: 110 },
      { day: "Thứ 6", sessions: 50 },
      { day: "Thứ 7", sessions: 115 },
      { day: "Chủ nhật", sessions: 130 },
    ],
    // Dữ liệu cho biểu đồ đường: Doanh thu (revenue)
    dailyRevenue: [
      { day: "Thứ 2", revenue: 1500 },
      { day: "Thứ 3", revenue: 1800 },
      { day: "Thứ 4", revenue: 2200 },
      { day: "Thứ 5", revenue: 2000 },
      { day: "Thứ 6", revenue: 2500 },
      { day: "Thứ 7", revenue: 2800 },
      { day: "Chủ nhật", revenue: 3000 },
    ],
  },

  // DỮ LIỆU MỚI CHO PHẦN CƠ CẤU DỊCH VỤ (ĐÃ CẬP NHẬT)
  serviceStructure: {
    // Dữ liệu cho biểu đồ cột (Doanh thu theo gói, qua các tháng)
    monthlyRevenue: [
      {
        month: "Tháng 1",
        total: 1250, // 680 + 570
        member: 680, // Hội viên
        corporate: 570, // Thuê bao (Doanh nghiệp) (170 + 400 cũ)
      },
      {
        month: "Tháng 2",
        total: 1100, // 550 + 550
        member: 550,
        corporate: 550, // (200 + 350 cũ)
      },
      {
        month: "Tháng 3",
        total: 1550, // 480 + 1070
        member: 480,
        corporate: 1070, // (240 + 830 cũ)
      },
      {
        month: "Tháng 4",
        total: 1380, // 420 + 960
        member: 420,
        corporate: 960, // (260 + 700 cũ)
      },
      {
        month: "Tháng 5",
        total: 1200, // 350 + 850
        member: 350,
        corporate: 850, // (260 + 590 cũ)
      },
    ],
    // Dữ liệu cho biểu đồ tròn (Tổng doanh thu) - Đã tính tổng
    // Tổng cũ: 2480 (Hội viên) + 2870 (Thuê bao) + 1130 (Trả trước) = 6480
    // Tổng mới: 2480 (Hội viên) + (2870 + 1130) (Thuê bao mới) = 6480
    pieData: [
      { name: "Hội viên", value: 2480, color: "var(--member-color)" },
      { name: "Thuê bao", value: 4000, color: "var(--success-color)" }, // 2870 + 1130
    ],
  },
};

// =========================================================
// CÁC COMPONENT CON VÀ HÀM RENDER BIỂU ĐỒ (Đã cập nhật renderStackedBarChart và renderPieChart)
// =========================================================

// Component hiển thị một KPI nhỏ (Giữ nguyên)
function KPIBox({ kpi }) {
  const { value, change, isPositive, period, icon } = kpi;
  const changeClass = isPositive ? "positive" : "negative";
  const Icon = isPositive ? CaretUpOutlined : CaretDownOutlined;

  // Giả lập icon dựa trên tên
  const getIcon = (name) => {
    switch (name) {
      case "cash":
        return <span className="kpi-icon">💰</span>;
      case "energy":
        return <span className="kpi-icon">⚡</span>;
      case "avg-cash":
        return <span className="kpi-icon">💸</span>;
      default:
        return null;
    }
  };

  return (
    <div className="kpi-box">
      <div className="kpi-header">
        <span className="kpi-period">{period}</span>
        {getIcon(icon)}
      </div>
      <div className="kpi-value">{value}</div>
      <div className={`kpi-change ${changeClass}`}>
        {change !== "Trung bình" && <Icon />} {change}
      </div>
    </div>
  );
}

// Component hiển thị Cảnh báo (Giữ nguyên)
function WarningItem({ name, usage, status, color }) {
  const statusClasses = `warning-status ${color}`;
  return (
    <div className="warning-item">
      <div className="warning-info">
        <div className="warning-name">{name}</div>
        <div className="warning-usage">Sử dụng: **{usage}**</div>
      </div>
      <div className={statusClasses}>{status}</div>
    </div>
  );
}

// Component hiển thị Danh sách trạm (Giữ nguyên)
function StationListItem({ name, capacity, usage }) {
  return (
    <div className="station-list-item">
      <div className="station-info">
        <div className="station-name">{name}</div>
        <div className="station-capacity">{capacity}</div>
      </div>
      <div className="station-usage-percent">{usage}</div>
    </div>
  );
}

// Component cho Ô So sánh Khu vực (Giữ nguyên)
function AreaBox({ name, data }) {
  const { revenue, sessions, avgUsage } = data;

  return (
    <div className="area-box">
      <h5 className="area-name">{name}</h5>
      <div className="area-revenue">{revenue}</div>
      <div className="area-sessions-usage">
        {sessions} - Sử dụng trung bình {avgUsage}
      </div>
      {/* Thanh hiển thị trung bình sử dụng */}
      <div className="usage-bar-wrapper">
        <div className="usage-bar" style={{ width: avgUsage }}></div>
      </div>
    </div>
  );
}

// Component cho Bảng Chi tiết Trạm (Giữ nguyên)
function DetailedStationTable({ data }) {
  return (
    <div className="detailed-table-container">
      <h4>Bảng chi tiết trạm</h4>
      <table className="station-detail-table">
        <thead>
          <tr>
            <th>Trạm</th>
            <th>Doanh thu</th>
            <th>Phiên sạc</th>
            <th>Sử dụng</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td>{item.name}</td>
              <td>{item.revenue}</td>
              <td>{item.sessions}</td>
              <td>{item.usage}</td>
              <td>
                <span
                  className={`status-badge ${item.status
                    .toLowerCase()
                    .replace(/\s/g, "-")}`}
                >
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// HÀM RENDER BIỂU ĐỒ CỘT (Số phiên sạc) (Giữ nguyên)
function renderSessionsChart(data) {
  // Tìm giá trị sessions lớn nhất để chuẩn hóa chiều cao cột
  const maxSessions = data.reduce(
    (max, item) => Math.max(max, item.sessions),
    0
  );
  const chartHeight = 200; // Chiều cao tối đa của vùng biểu đồ

  return (
    <div className="chart-box time-chart-sessions">
      <h4>Số phiên sạc trong ngày</h4>
      <div
        className="chart-area bar-chart-area"
        style={{ height: `${chartHeight}px` }}
      >
        {/* Trục Y (Mô phỏng) */}
        <div className="chart-y-axis">
          <span>{maxSessions}</span>
          <span>{Math.round(maxSessions * 0.75)}</span>
          <span>{Math.round(maxSessions * 0.5)}</span>
          <span>{Math.round(maxSessions * 0.25)}</span>
          <span>0</span>
          {/* Gird lines (có thể thêm tại đây nếu cần) */}
        </div>
        {/* Cột dữ liệu */}
        <div className="chart-data-container">
          {data.map((item, index) => {
            const heightPercent = (item.sessions / maxSessions) * 100;
            return (
              <div key={index} className="chart-bar-wrapper">
                <div
                  className="chart-bar"
                  style={{ height: `${heightPercent}%` }}
                  title={`${item.day}: ${item.sessions} phiên`}
                >
                  <span className="bar-value">{item.sessions}</span>
                </div>
                <span className="bar-label">
                  {item.day.replace("Thứ ", "T").replace("Chủ nhật", "CN")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// HÀM RENDER BIỂU ĐỒ ĐƯỜNG (Doanh thu theo ngày) (Giữ nguyên)
function renderRevenueChart(data) {
  const maxRevenue = data.reduce((max, item) => Math.max(max, item.revenue), 0);
  const minRevenue = data.reduce(
    (min, item) => Math.min(min, item.revenue),
    maxRevenue
  );
  const range = maxRevenue - minRevenue;
  const chartHeight = 250;

  // Chuẩn hóa dữ liệu thành tọa độ Y (từ 0 đến chartHeight)
  const points = data.map((item) => {
    // Độ cao thực tế của điểm (tính từ mức minRevenue)
    const y =
      range === 0 ? 0 : ((item.revenue - minRevenue) / range) * chartHeight;
    return y;
  });

  // Tạo chuỗi cho thuộc tính style 'clip-path' (Giả lập đường đi của biểu đồ)
  const linePoints = points
    .map((y, index) => {
      const x = (index / (data.length - 1)) * 100;
      // Chuyển đổi Y thành độ cao tính từ ĐÁY (100% - height)
      const yNormalized = 100 - (y / chartHeight) * 100;
      return `${x}% ${yNormalized}%`;
    })
    .join(", ");

  // Thêm các điểm góc để đóng lại thành một khu vực (Area Chart)
  const areaPoints = `0% 100%, ${linePoints}, 100% 100%`;

  return (
    <div className="chart-box time-chart-revenue">
      <h4>Doanh thu theo ngày</h4>
      <div
        className="chart-area line-chart-area"
        style={{ height: `${chartHeight}px` }}
      >
        {/* Trục Y (Mô phỏng) */}
        <div className="chart-y-axis-line">
          <span>{maxRevenue.toLocaleString()} đ</span>
          <span>
            {Math.round(minRevenue + range * 0.75).toLocaleString()} đ
          </span>
          <span>{Math.round(minRevenue + range * 0.5).toLocaleString()} đ</span>
          <span>
            {Math.round(minRevenue + range * 0.25).toLocaleString()} đ
          </span>
          <span>{minRevenue.toLocaleString()} đ</span>
        </div>
        {/* Vùng biểu đồ */}
        <div
          className="chart-line-visual"
          style={{
            clipPath: `polygon(${areaPoints})`,
            WebkitClipPath: `polygon(${areaPoints})`,
          }}
        >
          {/* Các chấm tròn (data points) */}
          {points.map((y, index) => {
            const xPos = (index / (data.length - 1)) * 100;
            // Vị trí y cần phải chuyển đổi từ giá trị pixel sang position: bottom
            const yPos = y;
            return (
              <div
                key={index}
                className="data-point"
                style={{
                  left: `${xPos}%`,
                  bottom: `${yPos}px`,
                }}
                title={`${data[index].day}: ${data[
                  index
                ].revenue.toLocaleString()} đ`}
              />
            );
          })}
        </div>
      </div>
      {/* Trục X (Nhãn ngày) */}
      <div className="chart-x-axis-line">
        {data.map((item, index) => (
          <span key={index}>
            {item.day.replace("Thứ ", "T").replace("Chủ nhật", "CN")}
          </span>
        ))}
      </div>
    </div>
  );
}

// HÀM RENDER BIỂU ĐỒ CỘT XẾP CHỒNG (Doanh thu theo Gói) - ĐÃ CẬP NHẬT
function renderStackedBarChart(data) {
  // Tìm giá trị total lớn nhất để chuẩn hóa chiều cao cột
  const maxTotal = data.reduce((max, item) => Math.max(max, item.total), 0);
  const chartHeight = 250;
  // CHỈ CÒN member VÀ corporate
  const revenueKeys = ["member", "corporate"];
  const revenueColors = {
    member: "var(--member-color)",
    corporate: "var(--success-color)",
    // prepaid: "var(--warning-color)", // BỎ
  };
  const labelMap = {
    member: "Hội viên",
    corporate: "Thuê bao (Doanh nghiệp)",
    // prepaid: "Trả trước", // BỎ
  };

  // Tạo nhãn trục Y
  const yAxisLabels = Array.from({ length: 9 }).map((_, i) =>
    Math.round((maxTotal / 8) * (8 - i))
  );

  return (
    <div className="chart-box service-chart-monthly">
      <h4>Doanh thu theo gói</h4>
      <div
        className="chart-area stacked-bar-chart-area"
        style={{ height: `${chartHeight}px` }}
      >
        {/* Trục Y (Mô phỏng) */}
        <div className="chart-y-axis stacked-y-axis">
          {yAxisLabels.map((label, index) => (
            <span key={index}>{label.toLocaleString()}</span>
          ))}
        </div>
        {/* Lưới ngang (Grid lines) */}
        <div className="chart-grid-lines">
          {yAxisLabels.slice(0, -1).map((_, index) => (
            <div
              key={index}
              className="grid-line"
              style={{ bottom: `${(index + 1) * 12.5}%` }}
            ></div>
          ))}
        </div>

        {/* Cột dữ liệu */}
        <div className="chart-data-container stacked-bar-container">
          {data.map((item, index) => {
            const totalHeight = (item.total / maxTotal) * 100;

            return (
              <div
                key={index}
                className="chart-bar-wrapper stacked-bar-wrapper"
              >
                <div
                  className="chart-bar stacked-bar"
                  style={{ height: `${totalHeight}%` }}
                >
                  {/* Phần tử trên cùng (Total Value) */}
                  <span className="bar-value total-value">
                    {item.total.toLocaleString()}
                  </span>

                  {/* Các Segment Doanh thu xếp chồng (Render theo thứ tự ngược lại để corporate nằm dưới cùng) */}
                  {revenueKeys
                    .slice()
                    .reverse()
                    .map((key, segmentIndex) => {
                      const segmentValue = item[key];
                      const segmentHeight = (segmentValue / item.total) * 100;
                      const segmentPercent = (
                        (segmentValue / item.total) *
                        100
                      ).toFixed(1);

                      return (
                        <div
                          key={segmentIndex}
                          className={`bar-segment ${key}`}
                          style={{
                            height: `${segmentHeight}%`,
                            backgroundColor: revenueColors[key],
                          }}
                          title={`${
                            labelMap[key]
                          }: ${segmentValue.toLocaleString()} đ`}
                        >
                          {/* Hiển thị phần trăm nếu segment đủ lớn */}
                          {segmentHeight > 10 && (
                            <span className="segment-percent">
                              {segmentPercent}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
                <span className="bar-label">{item.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chú thích (Legend) */}
      <div className="chart-legend service-legend">
        {Object.keys(revenueColors).map((key) => (
          <span key={key} className="legend-item">
            <span
              className="legend-color"
              style={{ backgroundColor: revenueColors[key] }}
            ></span>
            {labelMap[key]}
          </span>
        ))}
      </div>
    </div>
  );
}

// HÀM RENDER BIỂU ĐỒ TRÒN (Tỷ trọng Doanh thu) - ĐÃ CẬP NHẬT
function renderPieChart(data) {
  const totalRevenue = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercent = 0;

  // Tạo mảng CSS Conic Gradient cho biểu đồ tròn
  const conicGradientSegments = data
    .map((item) => {
      const percent = (item.value / totalRevenue) * 100;
      const startAngle = cumulativePercent;
      cumulativePercent += percent;
      return `${item.color} ${startAngle}% ${cumulativePercent}%`;
    })
    .join(", ");

  // Reset cumulativePercent để tính toán vị trí nhãn
  cumulativePercent = 0;

  return (
    <div className="chart-box service-chart-pie">
      <h4>Cơ cấu gói dịch vụ</h4>
      <div className="pie-chart-container">
        {/* Vùng biểu đồ tròn (dùng conic-gradient) */}
        <div
          className="pie-chart"
          style={{
            background: `conic-gradient(${conicGradientSegments})`,
          }}
        >
          {/* Label mô phỏng nằm giữa slice */}
          {data.map((item, index) => {
            const percent = (item.value / totalRevenue) * 100;
            // Góc quay để đặt nhãn vào giữa slice
            const rotationAngle = cumulativePercent + percent / 2;
            cumulativePercent += percent;

            // Chỉ hiển thị nhãn nếu phần trăm đủ lớn
            if (percent < 5) return null;

            return (
              <div
                key={index}
                className="pie-label-placeholder"
                style={{
                  // Áp dụng góc quay để di chuyển nhãn ra ngoài tâm
                  transform: `rotate(${rotationAngle}deg) translate(100px) rotate(-${rotationAngle}deg)`,
                }}
              >
                {percent.toFixed(1)}%
              </div>
            );
          })}
        </div>
        {/* Chú thích (Legend) */}
        <div className="chart-legend pie-legend">
          {data.map((item, index) => (
            <span key={index} className="legend-item">
              <span
                className="legend-color"
                style={{ backgroundColor: item.color }}
              ></span>
              {item.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// COMPONENT CHÍNH: REPORTS (Giữ nguyên)
// =========================================================
export default function Reports() {
  // State cho bộ lọc chính
  const [reportFilter, setReportFilter] = useState({
    scope: "all",
    station: "all",
    viewType: "area-comparison", // Mặc định là So sánh khu vực
  });

  // Giả định dữ liệu Heatmap (sử dụng cho Hiệu suất xuất trạm)
  const heatmapData = useMemo(
    () => [
      {
        day: "Thứ 2",
        hours: [
          0, 0, 0, 0, 2, 5, 8, 10, 5, 3, 2, 1, 1, 1, 2, 3, 5, 8, 10, 12, 9, 6,
          3, 1,
        ],
      },
      {
        day: "Thứ 3",
        hours: [
          0, 0, 0, 1, 3, 6, 9, 11, 6, 4, 3, 2, 1, 1, 3, 4, 6, 9, 11, 13, 10, 7,
          4, 2,
        ],
      },
      {
        day: "Thứ 4",
        hours: [
          1, 1, 0, 2, 4, 7, 10, 12, 7, 5, 4, 3, 2, 1, 4, 5, 7, 10, 12, 14, 11,
          8, 5, 3,
        ],
      },
      {
        day: "Thứ 5",
        hours: [
          1, 1, 1, 3, 5, 8, 11, 13, 8, 6, 5, 4, 3, 2, 5, 6, 8, 11, 13, 15, 12,
          9, 6, 4,
        ],
      },
      {
        day: "Thứ 6",
        hours: [
          2, 1, 1, 4, 6, 9, 12, 14, 9, 7, 6, 5, 4, 3, 6, 7, 9, 12, 14, 16, 13,
          10, 7, 5,
        ],
      },
      {
        day: "Thứ 7",
        hours: [
          3, 2, 1, 5, 7, 10, 13, 15, 10, 8, 7, 6, 5, 4, 7, 8, 10, 13, 15, 17,
          14, 11, 8, 6,
        ],
      },
      {
        day: "Chủ nhật",
        hours: [
          4, 3, 2, 6, 8, 11, 14, 16, 11, 9, 8, 7, 6, 5, 8, 9, 11, 14, 16, 18,
          15, 12, 9, 7,
        ],
      },
    ],
    []
  );

  // Hàm giả lập tính toán cường độ màu cho heatmap (Giữ nguyên)
  const getIntensityClass = (value) => {
    if (value > 15) return "intensity-high";
    if (value > 10) return "intensity-medium-high";
    if (value > 5) return "intensity-medium";
    if (value > 0) return "intensity-low";
    return "intensity-none";
  };

  // Hàm render nội dung chính dựa trên viewType (Giữ nguyên)
  const renderReportContent = () => {
    switch (reportFilter.viewType) {
      case "station-output":
        return (
          <>
            <div className="report-chart-section">
              <div className="chart-box">
                <h4>Hiệu suất sạc trong ngày</h4>
                <div className="chart-placeholder bar-chart">
                  {/* Sử dụng ảnh placeholder cho Biểu đồ cột */}
                  <img
                    src="https://via.placeholder.com/400x200/B0E0E6/000000?text=Bar+Chart+Placeholder"
                    alt="Biểu đồ cột hiệu suất sạc"
                    style={{
                      maxWidth: "100%",
                      height: "200px",
                      objectFit: "contain",
                    }}
                  />
                  <div className="chart-x-axis">
                    <span>Thứ 2</span>
                    <span>Thứ 3</span>
                    <span>Thứ 4</span>
                    <span>Thứ 5</span>
                    <span>Thứ 6</span>
                    <span>Thứ 7</span>
                    <span>CN</span>
                  </div>
                </div>
              </div>
              <div className="chart-box">
                <h4>Sản lượng sạc theo ngày</h4>
                <div className="chart-placeholder line-chart">
                  {/* Sử dụng ảnh placeholder cho Biểu đồ đường */}
                  <img
                    src="https://via.placeholder.com/400x200/ADD8E6/000000?text=Line+Chart+Placeholder"
                    alt="Biểu đồ đường sản lượng sạc"
                    style={{
                      maxWidth: "100%",
                      height: "200px",
                      objectFit: "contain",
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="heatmap-section">
              <h4 className="heatmap-title">Heatmap: Hoạt động theo giờ</h4>
              <p className="heatmap-description">
                Mỗi ô là số phiên sạc (xấp xỉ). Màu càng đậm càng nhiều phiên.
              </p>
              <div className="heatmap-grid">
                {/* Header giờ */}
                <div className="heatmap-row header-row">
                  <div className="heatmap-cell day-label">Giờ: </div>
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <div key={hour} className="heatmap-cell hour-header">
                      {hour}
                    </div>
                  ))}
                </div>
                {/* Data */}
                {heatmapData.map((dayData) => (
                  <div key={dayData.day} className="heatmap-row">
                    <div className="heatmap-cell day-label">{dayData.day}</div>
                    {dayData.hours.map((value, hourIndex) => (
                      <div
                        key={hourIndex}
                        className={`heatmap-cell data-cell ${getIntensityClass(
                          value
                        )}`}
                        title={`Giờ ${hourIndex}: ${value} phiên`}
                      ></div>
                    ))}
                  </div>
                ))}
              </div>
              <p className="heatmap-note">
                Gợi ý: xem các ô tối để biết giờ cao điểm.
              </p>
            </div>
          </>
        );
      case "area-comparison":
        return (
          <div className="area-comparison-content">
            <h3 className="comparison-title">So sánh hiệu suất khu vực</h3>
            <div className="area-boxes-container">
              <AreaBox name="Miền Bắc" data={mockData.areaComparison.mienBac} />
              <AreaBox
                name="Miền Trung"
                data={mockData.areaComparison.mienTrung}
              />
              <AreaBox name="Miền Nam" data={mockData.areaComparison.mienNam} />
            </div>

            <DetailedStationTable data={mockData.detailedStationTable} />
          </div>
        );
      case "time-chart":
        return (
          <div className="time-chart-content">
            <h3 className="comparison-title">Biểu đồ thời gian</h3>

            {/* 1. Biểu đồ cột: Số phiên sạc */}
            {renderSessionsChart(mockData.timeChart.dailySessions)}

            {/* 2. Biểu đồ đường: Doanh thu theo ngày */}
            {renderRevenueChart(mockData.timeChart.dailyRevenue)}
          </div>
        );
      case "service-structure":
        return (
          <div className="service-structure-content">
            <h3 className="comparison-title">Cơ cấu gói dịch vụ</h3>

            {/* 1. Biểu đồ cột xếp chồng */}
            {renderStackedBarChart(mockData.serviceStructure.monthlyRevenue)}

            {/* 2. Biểu đồ tròn (Tỷ trọng tổng doanh thu) */}
            {renderPieChart(mockData.serviceStructure.pieData)}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="reports-page">
      <h2 className="admin-title">Báo cáo & Thống kê</h2>

      {/* Thanh lọc/Công cụ */}
      <div className="report-header-controls">
        <div className="filter-group">
          <span className="filter-label">Filter:</span>
          <select
            className="filter-dropdown"
            value={reportFilter.scope}
            onChange={(e) =>
              setReportFilter({ ...reportFilter, scope: e.target.value })
            }
          >
            <option value="all">Tất cả</option>
            <option value="day">Ngày</option>
            <option value="month">Tháng</option>
            <option value="year">Năm</option>
          </select>
          {/* ... các dropdown lọc khác (Ngày, Tháng, Năm, Trạm) ... */}
          <select className="filter-dropdown">
            <option value="day-selection">Ngày</option>
          </select>
          <select className="filter-dropdown">
            <option value="month-selection">Tháng</option>
          </select>
          <select className="filter-dropdown">
            <option value="year-selection">Năm</option>
          </select>
          <select
            className="filter-dropdown"
            value={reportFilter.station}
            onChange={(e) =>
              setReportFilter({ ...reportFilter, station: e.target.value })
            }
          >
            <option value="all">Tất cả trạm</option>
            <option value="station-a">Trạm A</option>
          </select>
        </div>
        <div className="export-buttons">
          <button className="btn secondary">
            <DownloadOutlined /> Xuất CSV
          </button>
          <button className="btn secondary">
            <DownloadOutlined /> Xuất PDF
          </button>
        </div>
      </div>

      {/* Thanh lựa chọn báo cáo chi tiết */}
      <div className="report-view-options">
        <button
          className={`view-btn ${
            reportFilter.viewType === "station-output" ? "active" : ""
          }`}
          onClick={() =>
            setReportFilter({ ...reportFilter, viewType: "station-output" })
          }
        >
          Hiệu suất xuất trạm
        </button>
        <button
          className={`view-btn ${
            reportFilter.viewType === "area-comparison" ? "active" : ""
          }`}
          onClick={() =>
            setReportFilter({ ...reportFilter, viewType: "area-comparison" })
          }
        >
          So sánh khu vực
        </button>
        <button
          className={`view-btn ${
            reportFilter.viewType === "time-chart" ? "active" : ""
          }`}
          onClick={() =>
            setReportFilter({ ...reportFilter, viewType: "time-chart" })
          }
        >
          Biểu đồ thời gian
        </button>
        <button
          className={`view-btn ${
            reportFilter.viewType === "service-structure" ? "active" : ""
          }`}
          onClick={() =>
            setReportFilter({ ...reportFilter, viewType: "service-structure" })
          }
        >
          Cơ cấu dịch vụ
        </button>
      </div>

      {/* Nội dung báo cáo */}
      <div className="report-content-area">{renderReportContent()}</div>

      {/* Bổ sung các section còn lại từ Dashboard (KPI, Cảnh báo, Danh sách trạm) */}
      <div className="report-sidebar">
        {/* KPI Tổng quan */}
        <div className="kpi-total-section card">
          <h3>KPI Tổng quan</h3>
          {Object.values(mockData.kpiOverview).map((kpi, index) => (
            <KPIBox key={index} kpi={kpi} />
          ))}
        </div>

        <div className="sidebar-divider"></div>

        {/* Cảnh báo */}
        <div className="warnings-section card">
          <h3>Cảnh báo</h3>
          {mockData.warnings.map((warning, index) => (
            <WarningItem key={index} {...warning} />
          ))}
        </div>

        <div className="sidebar-divider"></div>

        {/* Danh sách trạm */}
        <div className="station-list-section card">
          <h3>Danh sách trạm</h3>
          {mockData.stationList.map((station, index) => (
            <StationListItem key={index} {...station} />
          ))}
        </div>
      </div>
    </div>
  );
}
