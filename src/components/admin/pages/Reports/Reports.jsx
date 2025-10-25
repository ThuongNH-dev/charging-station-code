// Reports.jsx - PHIÊN BẢN HOÀN CHỈNH (TÍCH HỢP XỬ LÝ DỮ LIỆU)

import React, { useState, useEffect, useMemo } from "react";
import { DownloadOutlined } from "@ant-design/icons";
import "./Reports.css";
import OverviewKPIs from "./OverviewKPIs";
import ReportContent from "./ReportContent";
import { fetchReportData } from "../../../../api/reportsApi";

// Nếu đang ở src/components/admin/pages/Reports/Reports.jsx
import {
  calculateKpiOverview,
  processServiceStructure,
  processRegionalComparison,
  processTimeChartData,
  processWarnings,
} from "../../../../utils/reportProcessing";

// Hàm hỗ trợ định dạng tiền tệ (Sử dụng lại từ reportProcessing.js nếu cần)
const formatCurrency = (value) => {
  if (typeof value !== "number" || isNaN(value)) return "0 đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(value);
};

export default function Reports() {
  const [reportFilter, setReportFilter] = useState({
    scope: "all",
    station: "all",
    viewType: "area-comparison",
  });
  // State lưu dữ liệu THÔ từ API
  const [rawData, setRawData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // GỌI API ĐỂ LẤY DỮ LIỆU THÔ
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      // Giả định: reportFilter có thể bao gồm startDate/endDate để truyền vào fetchReportData
      const data = await fetchReportData(reportFilter);
      setRawData(data); // Lưu dữ liệu thô
      setIsLoading(false);
    }
    loadData();
  }, [reportFilter]);

  // XỬ LÝ DỮ LIỆU VÀ ÁNH XẠ SANG CẤU TRÚC CUỐI CÙNG (SỬ DỤNG useMemo)
  const dataToRender = useMemo(() => {
    if (!rawData) return null;

    // 1. Tính toán tất cả các khối dữ liệu
    const kpiOverview = calculateKpiOverview(rawData);
    const serviceStructure = processServiceStructure(rawData);
    const regionalComparison = processRegionalComparison(rawData);
    const timeChart = processTimeChartData(rawData);
    const warnings = processWarnings(rawData);

    // 2. Xây dựng cấu trúc dữ liệu cuối cùng cho component con

    // --- XỬ LÝ DỮ LIỆU CHO SIDEBAR (OverviewKPIs) ---
    const sidebarData = {
      // a. KPI tổng quan (Đã định dạng trong hàm process)
      kpiOverview: [
        {
          period: "Tổng Doanh thu",
          value: kpiOverview.totalRevenue,
          change: `${kpiOverview.revenuePercent}%`,
          isPositive: parseFloat(kpiOverview.revenuePercent) >= 0,
          icon: "cash",
        },
        {
          period: "Tổng Năng lượng (kWh)",
          value: kpiOverview.totalEnergy,
          change: `${kpiOverview.energyPercent}%`,
          isPositive: parseFloat(kpiOverview.energyPercent) >= 0,
          icon: "energy",
        },
        {
          period: "Doanh thu TB/Phiên",
          value: kpiOverview.avgRevenuePerSession,
          change: "Trung bình",
          isPositive: true,
          icon: "avg-cash",
        },
        {
          period: "Thời lượng TB/Phiên",
          value: kpiOverview.avgDurationPerSession,
          change: "Trung bình",
          isPositive: true,
          icon: "duration",
        },
      ],
      // b. Cảnh báo (Đã có sẵn)
      warnings: warnings,
      // c. Danh sách trạm (Tạo từ detailedStationTable)
      stationList: regionalComparison.detailedStationTable.map((s) => ({
        name: s.stationName,
        capacity: "5 Cổng AC/DC", // Giả định cứng vì không có trong API thô
        usage: s.usage,
      })),
    };

    // --- XỬ LÝ DỮ LIỆU CHO CONTENT (ReportContent) ---
    const contentData = {
      // a. So sánh Khu vực (Area Comparison)
      areaComparison: {
        mienBac: {
          revenue: regionalComparison.regionalSummary["Miền Bắc"].totalValue,
          sessions:
            regionalComparison.regionalSummary["Miền Bắc"].totalSessions,
          avgUsage: `${regionalComparison.regionalSummary["Miền Bắc"].usagePercent}%`,
        },
        mienTrung: {
          revenue: regionalComparison.regionalSummary["Miền Trung"].totalValue,
          sessions:
            regionalComparison.regionalSummary["Miền Trung"].totalSessions,
          avgUsage: `${regionalComparison.regionalSummary["Miền Trung"].usagePercent}%`,
        },
        mienNam: {
          revenue: regionalComparison.regionalSummary["Miền Nam"].totalValue,
          sessions:
            regionalComparison.regionalSummary["Miền Nam"].totalSessions,
          avgUsage: `${regionalComparison.regionalSummary["Miền Nam"].usagePercent}%`,
        },
      },
      // b. Bảng chi tiết trạm (Detailed Station Table)
      detailedStationTable: regionalComparison.detailedStationTable.map(
        (item) => ({
          name: item.stationName,
          // Dùng totalRevenue từ quá trình xử lý nhưng format lại
          revenue: formatCurrency(item.totalRevenue),
          sessions: item.totalSessions,
          usage: item.usage,
          status: item.status,
        })
      ),
      // c. Biểu đồ thời gian
      timeChart: {
        dailySessions: timeChart.dailySessions,
        dailyRevenue: timeChart.dailyRevenue,
      },
      // d. Cơ cấu dịch vụ
      serviceStructure: {
        monthlyRevenue: serviceStructure.monthlyRevenue,
        pieData: serviceStructure.pieChartData, // Đổi tên cho khớp với component ReportContent
      },
    };

    return { ...sidebarData, ...contentData };
  }, [rawData]); // Tính toán lại khi dữ liệu thô thay đổi

  if (isLoading || !dataToRender) {
    return (
      <div className="reports-page loading-screen">
        <div className="spinner"></div>
        <p>Đang tải dữ liệu báo cáo...</p>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <h2 className="admin-title">Báo cáo & Thống kê</h2>

      {/* Thanh lọc/Công cụ */}
      <div className="report-header-controls">
        <div className="filter-group">
          <span className="filter-label">Filter:</span>
          {/* ... Các select box giữ nguyên ... */}
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

      {/* Nội dung báo cáo và Sidebar */}
      <div className="report-main-container">
        <ReportContent mockData={dataToRender} reportFilter={reportFilter} />
        <OverviewKPIs data={dataToRender} />
      </div>
    </div>
  );
}
