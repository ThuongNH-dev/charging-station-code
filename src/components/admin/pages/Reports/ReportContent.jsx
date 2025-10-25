// Sections/ReportContent.jsx

import React, { useMemo } from "react";

// =========================================================
// Component và Hàm Render biểu đồ
// =========================================================

// Component cho Ô So sánh Khu vực
function AreaBox({ name, data }) {
  const { revenue, sessions, avgUsage } = data;

  return (
    <div className="area-box">
      <h5 className="area-name">{name}</h5>
      <div className="area-revenue">{revenue}</div>
      <div className="area-sessions-usage">
        {sessions} - Sử dụng trung bình {avgUsage}
      </div>
      <div className="usage-bar-wrapper">
        <div className="usage-bar" style={{ width: avgUsage }}></div>
      </div>
    </div>
  );
}

// Component cho Bảng Chi tiết Trạm
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

// =========================================================
// Hàm Render Biểu đồ
// =========================================================

// Biểu đồ cột: Số phiên sạc
function renderSessionsChart(data) {
  const maxSessions = data.reduce(
    (max, item) => Math.max(max, item.sessions),
    0
  );
  const chartHeight = 200;

  return (
    <div className="chart-box time-chart-sessions">
      <h4>Số phiên sạc trong ngày</h4>
      <div
        className="chart-area bar-chart-area"
        style={{ height: `${chartHeight}px` }}
      >
        {/* Trục Y */}
        <div className="chart-y-axis">
          <span>{maxSessions}</span>
          <span>{Math.round(maxSessions * 0.75)}</span>
          <span>{Math.round(maxSessions * 0.5)}</span>
          <span>{Math.round(maxSessions * 0.25)}</span>
          <span>0</span>
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

// Biểu đồ đường: Doanh thu theo ngày
function renderRevenueChart(data) {
  const maxRevenue = data.reduce((max, item) => Math.max(max, item.revenue), 0);
  const minRevenue = data.reduce(
    (min, item) => Math.min(min, item.revenue),
    maxRevenue
  );
  const range = maxRevenue - minRevenue;
  const chartHeight = 250;

  const points = data.map((item) =>
    range === 0 ? 0 : ((item.revenue - minRevenue) / range) * chartHeight
  );

  const linePoints = points
    .map((y, index) => {
      const x = (index / (data.length - 1)) * 100;
      const yNormalized = 100 - (y / chartHeight) * 100;
      return `${x}% ${yNormalized}%`;
    })
    .join(", ");

  const areaPoints = `0% 100%, ${linePoints}, 100% 100%`;

  return (
    <div className="chart-box time-chart-revenue">
      <h4>Doanh thu theo ngày</h4>
      <div
        className="chart-area line-chart-area"
        style={{ height: `${chartHeight}px` }}
      >
        {/* Trục Y */}
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
          {points.map((y, index) => {
            const xPos = (index / (data.length - 1)) * 100;
            return (
              <div
                key={index}
                className="data-point"
                style={{ left: `${xPos}%`, bottom: `${y}px` }}
                title={`${data[index].day}: ${data[
                  index
                ].revenue.toLocaleString()} đ`}
              />
            );
          })}
        </div>
      </div>
      {/* Trục X */}
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

// Biểu đồ cột xếp chồng: Doanh thu theo gói
function renderStackedBarChart(data) {
  const maxTotal = data.reduce((max, item) => Math.max(max, item.total), 0);
  const chartHeight = 250;
  const revenueKeys = ["member", "corporate"];
  const revenueColors = {
    member: "var(--member-color)",
    corporate: "var(--success-color)",
  };
  const labelMap = {
    member: "Hội viên",
    corporate: "Thuê bao (Doanh nghiệp)",
  };
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
        {/* Trục Y */}
        <div className="chart-y-axis stacked-y-axis">
          {yAxisLabels.map((label, index) => (
            <span key={index}>{label.toLocaleString()}</span>
          ))}
        </div>
        {/* Lưới ngang */}
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
                  <span className="bar-value total-value">
                    {item.total.toLocaleString()}
                  </span>
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
      {/* Chú thích */}
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

// Biểu đồ tròn: Tỷ trọng Doanh thu
function renderPieChart(data) {
  const totalRevenue = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercent = 0;

  const conicGradientSegments = data
    .map((item) => {
      const percent = (item.value / totalRevenue) * 100;
      const startAngle = cumulativePercent;
      cumulativePercent += percent;
      return `${item.color} ${startAngle}% ${cumulativePercent}%`;
    })
    .join(", ");

  cumulativePercent = 0;

  return (
    <div className="chart-box service-chart-pie">
      <h4>Cơ cấu gói dịch vụ</h4>
      <div className="pie-chart-container">
        <div
          className="pie-chart"
          style={{ background: `conic-gradient(${conicGradientSegments})` }}
        >
          {data.map((item, index) => {
            const percent = (item.value / totalRevenue) * 100;
            const rotationAngle = cumulativePercent + percent / 2;
            cumulativePercent += percent;
            if (percent < 5) return null;
            return (
              <div
                key={index}
                className="pie-label-placeholder"
                style={{
                  transform: `rotate(${rotationAngle}deg) translate(100px) rotate(-${rotationAngle}deg)`,
                }}
              >
                {percent.toFixed(1)}%
              </div>
            );
          })}
        </div>
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
// Component Render Nội dung chính
// =========================================================

export default function ReportContent({ mockData, reportFilter }) {
  const getIntensityClass = (value) => {
    if (value > 15) return "intensity-high";
    if (value > 10) return "intensity-medium-high";
    if (value > 5) return "intensity-medium";
    if (value > 0) return "intensity-low";
    return "intensity-none";
  };

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

  const renderContent = () => {
    switch (reportFilter.viewType) {
      case "station-output":
        return (
          <>
            <div className="report-chart-section">
              {/* Placeholder Biểu đồ cột */}
              <div className="chart-box">
                <h4>Hiệu suất sạc trong ngày</h4>
                <div className="chart-placeholder bar-chart">
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
              {/* Placeholder Biểu đồ đường */}
              <div className="chart-box">
                <h4>Sản lượng sạc theo ngày</h4>
                <div className="chart-placeholder line-chart">
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
                <div className="heatmap-row header-row">
                  <div className="heatmap-cell day-label">Giờ: </div>
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <div key={hour} className="heatmap-cell hour-header">
                      {hour}
                    </div>
                  ))}
                </div>
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
            {renderSessionsChart(mockData.timeChart.dailySessions)}
            {renderRevenueChart(mockData.timeChart.dailyRevenue)}
          </div>
        );

      case "service-structure":
        return (
          <div className="service-structure-content">
            <h3 className="comparison-title">Cơ cấu gói dịch vụ</h3>
            {renderStackedBarChart(mockData.serviceStructure.monthlyRevenue)}
            {renderPieChart(mockData.serviceStructure.pieData)}
          </div>
        );

      default:
        return null;
    }
  };

  return <div className="report-content-area">{renderContent()}</div>;
}
