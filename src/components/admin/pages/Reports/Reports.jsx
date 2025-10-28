// =========================================================
// Reports.jsx - PHIÊN BẢN HOÀN CHỈNH + DEBUG HEATMAP
// =========================================================

import React, { useState, useEffect, useMemo } from "react";
import { DownloadOutlined } from "@ant-design/icons";
import "./Reports.css";

// --- Thành phần con ---
import OverviewKPIs from "./OverviewKPIs";
import ReportContent from "./ReportContent";

// --- API ---
import { fetchReportData } from "../../../../api/reportsApi";

// --- Xử lý dữ liệu ---
import {
  calculateKpiOverview,
  processServiceStructure,
  processRegionalComparison,
  processTimeChartData,
  processTimeChartHourly,
  processWarnings,
} from "../../../../utils/reportProcessing";

// =========================================================
// Hàm hỗ trợ định dạng tiền tệ
// =========================================================
const formatCurrency = (value) => {
  const num = Number(value);
  if (isNaN(num)) return "0 đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(num);
};

// =========================================================
// Component chính
// =========================================================
export default function Reports() {
  const [reportFilter, setReportFilter] = useState({
    scope: "all",
    station: "all",
    viewType: "area-comparison",
  });

  const [rawData, setRawData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // =========================================================
  // GỌI API LẤY DỮ LIỆU THÔ
  // =========================================================
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchReportData(reportFilter);
        if (isMounted) setRawData(data);
        console.log("📥 Raw data fetched:", data); // ✅ debug
      } catch (error) {
        console.error("⚠️ Lỗi tải dữ liệu báo cáo:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [reportFilter]);

  // =========================================================
  // TIỀN XỬ LÝ DỮ LIỆU
  // =========================================================
  const dataToRender = useMemo(() => {
    if (!rawData) return null;

    console.log("🟢 Processing rawData...");

    // KPI Overview
    const kpiOverview = calculateKpiOverview(rawData);
    console.log("📊 KPI Overview:", kpiOverview);

    // Service Structure
    const serviceStructure = processServiceStructure(rawData);
    console.log("📊 Service Structure:", serviceStructure);

    // Regional Comparison
    const regionalComparison = processRegionalComparison(rawData);
    console.log("📊 Regional Comparison:", regionalComparison);

    // Time Chart (7 ngày)
    const timeChart = processTimeChartData(rawData);
    console.log("📊 Time Chart (7 days):", timeChart);

    // Hourly Heatmap (7x24)
    const timeChartHourly = processTimeChartHourly(rawData);
    console.log("🔥 Time Chart Hourly (Heatmap 7x24):", timeChartHourly);

    // Warnings
    const warnings = processWarnings(rawData);
    console.log("⚠️ Warnings:", warnings);

    // --- DỮ LIỆU SIDEBAR ---
    const sidebarData = {
      kpiOverview: [
        {
          period: "Tổng Doanh thu",
          value: formatCurrency(kpiOverview.totalRevenue),
          change: `${kpiOverview.revenuePercent}%`,
          isPositive: parseFloat(kpiOverview.revenuePercent) >= 0,
          icon: "cash",
        },
        {
          period: "Tổng Năng lượng (kWh)",
          value: kpiOverview.totalEnergy?.toLocaleString() || "0",
          change: `${kpiOverview.energyPercent}%`,
          isPositive: parseFloat(kpiOverview.energyPercent) >= 0,
          icon: "energy",
        },
        {
          period: "Doanh thu TB/Phiên",
          value: formatCurrency(kpiOverview.avgRevenuePerSession),
          change: "Trung bình",
          isPositive: true,
          icon: "avg-cash",
        },
        {
          period: "Thời lượng TB/Phiên",
          value: `${kpiOverview.avgDurationPerSession || 0} phút`,
          change: "Trung bình",
          isPositive: true,
          icon: "duration",
        },
      ],
      warnings,
      stationList:
        regionalComparison?.detailedStationTable?.map((s) => ({
          name: s.stationName || "Không xác định",
          capacity: s.capacity || "5 Cổng AC/DC",
          usage: `${
            isNaN(Number(s.usage)) ? "0.0" : Number(s.usage).toFixed(1)
          }%`,
        })) || [],
    };

    // --- DỮ LIỆU CHÍNH ---
    const contentData = {
      areaComparison: {
        mienBac: regionalComparison?.regionalSummary?.["Miền Bắc"] || {},
        mienTrung: regionalComparison?.regionalSummary?.["Miền Trung"] || {},
        mienNam: regionalComparison?.regionalSummary?.["Miền Nam"] || {},
      },
      stationTable:
        regionalComparison?.detailedStationTable?.map((item) => ({
          name: item.stationName || "N/A",
          revenue: Number(item.totalRevenue) || 0,
          sessions: Number(item.totalSessions) || 0,
          usage: Number(item.usage) || 0,
          status: item.status || "Không xác định",
        })) || [],
      timeChart,
      timeChartHourly, // ✅ gắn vào data truyền xuống ReportContent
      serviceStructure: {
        monthlyRevenue: serviceStructure.monthlyRevenue || [],
        pieData: serviceStructure.pieChartData || [],
      },
    };

    return { ...sidebarData, ...contentData };
  }, [rawData]);

  // =========================================================
  // Giao diện chờ tải
  // =========================================================
  if (isLoading || !dataToRender) {
    return (
      <div className="reports-page loading-screen">
        <div className="spinner"></div>
        <p>Đang tải dữ liệu báo cáo...</p>
      </div>
    );
  }

  // =========================================================
  // Giao diện chính
  // =========================================================
  return (
    <div className="reports-page">
      <h2 className="admin-title">Báo cáo & Thống kê</h2>

      {/* --- Bộ lọc --- */}
      <div className="report-header-controls">
        <div className="filter-group">
          <span className="filter-label">Phạm vi:</span>
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

      {/* --- Lựa chọn chế độ hiển thị --- */}
      <div className="report-view-options">
        {[
          ["station-output", "Hiệu suất xuất trạm"],
          ["area-comparison", "So sánh khu vực"],
          ["time-chart", "Biểu đồ thời gian"],
          ["service-structure", "Cơ cấu dịch vụ"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`view-btn ${
              reportFilter.viewType === key ? "active" : ""
            }`}
            onClick={() => setReportFilter({ ...reportFilter, viewType: key })}
          >
            {label}
          </button>
        ))}
      </div>

      {/* --- Nội dung báo cáo và Sidebar --- */}
      <div className="report-main-container">
        <ReportContent data={dataToRender} reportFilter={reportFilter} />
        <OverviewKPIs data={dataToRender} />
      </div>
    </div>
  );
}
