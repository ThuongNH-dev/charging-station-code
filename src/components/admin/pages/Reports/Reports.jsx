import React, { useState, useEffect, useMemo } from "react";
import { DownloadOutlined } from "@ant-design/icons";
import "./Reports.css";
import ReportContent from "./ReportContent";
import {
  fetchReportData,
  fetchAdminAnalytics,
} from "../../../../api/reportsApi";
import {
  processServiceStructure,
  processTimeChartData,
  processTimeChartHourly,
} from "../../../../utils/reportProcessing";

// Mặc định 7 ngày gần nhất
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
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Gọi API Analytics cho Admin (theo tháng)
  useEffect(() => {
    const adminViews = [
      "admin-company",
      "admin-utilization",
      "admin-top-under",

      "admin-vehicle-type",
    ];

    if (!adminViews.includes(reportFilter.viewType)) return;

    let isMounted = true;

    const loadAnalytics = async () => {
      try {
        const dateStr = reportFilter.endDate || todayISO;
        const d = new Date(dateStr);
        const month = d.getMonth() + 1;
        const year = d.getFullYear();

        const analytics = await fetchAdminAnalytics({ month, year });
        if (isMounted) setAnalyticsData(analytics);
      } catch (err) {
        console.error("❌ Lỗi load Analytics admin:", err);
      }
    };

    loadAnalytics();
    return () => {
      isMounted = false;
    };
  }, [reportFilter.viewType, reportFilter.endDate]);

  // Gọi API lấy dữ liệu
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

  // Tiền xử lý dữ liệu
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
      analytics: analyticsData,
      allStations: rawData.stationsData || [], // Để vẽ bảng "trạm chết"
      portsData: rawData.portsData || [],
    };
  }, [rawData, reportFilter.startDate, reportFilter.endDate, analyticsData]);

  // Giao diện loading
  if (isLoading || !dataToRender) {
    return (
      <div className="reports-page loading-screen">
        <div className="spinner"></div>
        <p>Đang tải dữ liệu báo cáo...</p>
      </div>
    );
  }

  // Danh sách các báo cáo cần xem theo THÁNG (logic Admin)
  const ADMIN_MONTHLY_VIEWS = [
    "admin-company", // Báo cáo theo công ty
    "admin-utilization", // Hiệu suất trạm
    "admin-top-under", // Top/Under/Zero
    "admin-vehicle", // 👈 THÊM DÒNG NÀY (Doanh thu xe)
    "admin-vehicle-type",
  ];

  // Biến kiểm tra: True nếu đang ở tab báo cáo tháng, False nếu ở tab thường
  const isMonthlyView = ADMIN_MONTHLY_VIEWS.includes(reportFilter.viewType);
  // Giao diện chính
  return (
    <div className="reports-page">
      <h2 className="admin-title">Báo cáo & Thống kê</h2>

      {/* Bộ lọc */}
      <div className="report-header-controls">
        {/* 👇 2. THAY THẾ TOÀN BỘ DIV filter-group CŨ BẰNG ĐOẠN NÀY */}
        <div className="filter-group">
          {isMonthlyView ? (
            /* --- GIAO DIỆN 1: CHỌN THÁNG (Cho các tab Admin) --- */
            <>
              <span className="filter-label" style={{ fontWeight: 600 }}>
                Chọn tháng báo cáo:
              </span>
              <input
                type="month"
                className="filter-dropdown"
                // Lấy YYYY-MM từ endDate hiện tại
                value={reportFilter.endDate.slice(0, 7)}
                onChange={(e) => {
                  const val = e.target.value; // Kết quả dạng: "2025-10"
                  if (!val) return;

                  // Tính ngày cuối cùng của tháng được chọn
                  const [y, m] = val.split("-");
                  const lastDay = new Date(y, m, 0).getDate();

                  // Cập nhật cả startDate và endDate cho chuẩn logic
                  setReportFilter({
                    ...reportFilter,
                    startDate: `${val}-01`,
                    endDate: `${val}-${lastDay}`, // Ví dụ: 2025-10-31
                  });

                  // Trigger resize màn hình để biểu đồ vẽ lại (nếu cần)
                  setTimeout(
                    () => window.dispatchEvent(new Event("resize")),
                    0
                  );
                }}
              />
            </>
          ) : (
            /* --- GIAO DIỆN 2: CHỌN TỪ NGÀY - ĐẾN NGÀY (Cho biểu đồ thời gian) --- */
            <>
              <span className="filter-label">Từ ngày:</span>
              <input
                type="date"
                className="filter-dropdown"
                value={reportFilter.startDate}
                max={reportFilter.endDate}
                onChange={(e) =>
                  setReportFilter({
                    ...reportFilter,
                    startDate: e.target.value,
                  })
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
                  setTimeout(
                    () => window.dispatchEvent(new Event("resize")),
                    0
                  );
                }}
              >
                ĐẶT LẠI
              </button>
            </>
          )}
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

      {/* Nút chọn chế độ xem */}
      <div className="report-view-options">
        {[
          // --- NHÓM 1: TỔNG QUAN ---
          ["time-chart", "Tổng quan thời gian"],

          // --- NHÓM 2: PHÂN TÍCH DOANH THU ---
          ["service-structure", "Doanh thu theo Gói"],
          ["admin-vehicle-type", "Doanh thu theo Xe"], // Đổi tên từ "Phân loại xe" cho sang
          ["admin-company", "Doanh thu Công ty"],

          // --- NHÓM 3: HIỆU SUẤT HẠ TẦNG ---
          ["admin-utilization", "Hiệu suất Trạm sạc"],
          ["admin-top-under", "Xếp hạng & Cảnh báo"],
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

      {/* Nội dung chính & Sidebar */}
      <div className="report-main-container">
        <ReportContent
          data={dataToRender}
          reportFilter={reportFilter}
          portsData={dataToRender?.portsData || []}
        />
      </div>
    </div>
  );
}
