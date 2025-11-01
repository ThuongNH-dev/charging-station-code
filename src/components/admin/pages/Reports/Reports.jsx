// =========================================================
// Reports.jsx - PHIÊN BẢN HOÀN CHỈNH + LIÊN KẾT API & DỮ LIỆU
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

export default function Reports() {
  const [reportFilter, setReportFilter] = useState({
    scope: "all",
    station: "all",
    viewType: "area-comparison",
  });

  const [rawData, setRawData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // =========================================================
  // GỌI API LẤY DỮ LIỆU
  // =========================================================
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchReportData({
          startDate: reportFilter.startDate,
          endDate: reportFilter.endDate,
          stationId: reportFilter.station !== "all" ? reportFilter.station : "",
        });
        if (isMounted) setRawData(data);
        console.log("📥 Dữ liệu thô:", data);
      } catch (error) {
        console.error("❌ Lỗi tải dữ liệu báo cáo:", error);
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

    console.log("🟢 Đang xử lý dữ liệu...");

    const kpi = calculateKpiOverview(rawData);
    const serviceStructure = processServiceStructure(rawData);
    const regionalComparison = processRegionalComparison(rawData);
    const timeChart = processTimeChartData(rawData);
    const timeChartHourly = processTimeChartHourly(rawData);
    const warnings = processWarnings(rawData);

    return {
      kpi,
      warnings,
      stationTable: regionalComparison?.detailedStationTable || [],
      areaComparison: regionalComparison?.regionalSummary || {},
      timeChart: { ...timeChart, hourly: timeChartHourly },
      serviceStructure: {
        monthlyRevenue: serviceStructure.monthlyRevenue || [],
        pieData: serviceStructure.pieData || [],
      },
    };
  }, [rawData]);

  // =========================================================
  // GIAO DIỆN LOADING
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
  // GIAO DIỆN CHÍNH
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
            {/* 🔹 Gợi ý: bạn có thể map danh sách trạm từ rawData.stationsData */}
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

      {/* --- Nút chọn chế độ xem --- */}
      <div className="report-view-options">
        {[
          ["station-output", "Hiệu suất trạm"],
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

      {/* --- Nội dung chính & Sidebar --- */}
      <div className="report-main-container">
        <ReportContent data={dataToRender} reportFilter={reportFilter} />
        <OverviewKPIs data={dataToRender} />
      </div>
    </div>
  );
}
