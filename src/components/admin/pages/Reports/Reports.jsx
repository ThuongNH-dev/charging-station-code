// =========================================================
// Reports.jsx - PHIÊN BẢN HOÀN CHỈNH + LIÊN KẾT API & DỮ LIỆU
// (Chỉ cập nhật FILTER: Từ ngày – Đến ngày – Trạm)
// =========================================================

import React, { useState, useEffect, useMemo } from "react";
import { DownloadOutlined } from "@ant-design/icons";
import "./Reports.css";

// --- Thành phần con ---

import ReportContent from "./ReportContent";

// --- API ---
import { fetchReportData } from "../../../../api/reportsApi";

// --- Xử lý dữ liệu ---
import {
  processServiceStructure,
  processTimeChartData,
  processTimeChartHourly,
} from "../../../../utils/reportProcessing";

// ⏱️ Mặc định 7 ngày gần nhất
const todayISO = new Date().toISOString().slice(0, 10);
const sevenDaysAgoISO = new Date(Date.now() - 6 * 24 * 3600 * 1000)
  .toISOString()
  .slice(0, 10);

export default function Reports() {
  const [reportFilter, setReportFilter] = useState({
    startDate: sevenDaysAgoISO,
    endDate: todayISO,
    station: "all",
    viewType: "time-chart", // mặc định
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
        });
        if (isMounted) setRawData(data);
        console.log("📥 Dữ liệu thô:", data);
        // ép Recharts re-calc khi dữ liệu/filter đổi
        setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
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
  }, [reportFilter.startDate, reportFilter.endDate, reportFilter.station]);

  // Danh sách trạm cho dropdown
  const stationsList = useMemo(() => {
    if (!rawData) return [];
    const d = rawData.stationsData;
    if (Array.isArray(d?.items)) return d.items;
    if (Array.isArray(d)) return d;
    return [];
  }, [rawData]);

  // =========================================================
  // TIỀN XỬ LÝ DỮ LIỆU
  // =========================================================
  const dataToRender = useMemo(() => {
    if (!rawData) return null;

    const serviceStructure = processServiceStructure(rawData);

    const timeChart = processTimeChartData(rawData, {
      startDate: reportFilter.startDate,
      endDate: reportFilter.endDate,
    });

    const timeChartHourly = processTimeChartHourly(rawData, {
      startDate: reportFilter.startDate,
      endDate: reportFilter.endDate,
    });

    return {
      timeChart: { ...timeChart, hourly: timeChartHourly },
      serviceStructure: {
        monthlyRevenue: serviceStructure.monthlyRevenue || [],
        pieData: serviceStructure.pieData || [],
      },
    };
  }, [rawData, reportFilter.startDate, reportFilter.endDate]);

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
          <span className="filter-label">Từ ngày:</span>
          <input
            type="date"
            className="filter-dropdown"
            value={reportFilter.startDate}
            max={reportFilter.endDate}
            onChange={(e) =>
              setReportFilter({ ...reportFilter, startDate: e.target.value })
            }
          />

          <span className="filter-label">Đến ngày:</span>
          <input
            type="date"
            className="filter-dropdown"
            value={reportFilter.endDate}
            min={reportFilter.startDate}
            onChange={(e) =>
              setReportFilter({ ...reportFilter, endDate: e.target.value })
            }
          />

          <button
            className="btn"
            onClick={() => {
              setReportFilter({
                ...reportFilter,
                startDate: sevenDaysAgoISO,
                endDate: todayISO,
              });
              setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
            }}
          >
            ĐẶT LẠI
          </button>
        </div>

        <div className="export-buttons">
          <button className="btn secondary">
            <DownloadOutlined /> XUẤT CSV
          </button>
          <button className="btn secondary">
            <DownloadOutlined /> XUẤT PDF
          </button>
        </div>
      </div>

      {/* --- Nút chọn chế độ xem --- */}
      <div className="report-view-options">
        {[
          ["time-chart", "Biểu đồ thời gian"],
          ["service-structure", "Cơ cấu dịch vụ"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`view-btn ${
              reportFilter.viewType === key ? "active" : ""
            }`}
            onClick={() => {
              setReportFilter({ ...reportFilter, viewType: key });
              setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* --- Nội dung chính & Sidebar --- */}
      <div className="report-main-container">
        <ReportContent data={dataToRender} reportFilter={reportFilter} />
      </div>
    </div>
  );
}
