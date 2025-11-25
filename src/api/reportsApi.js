import axios from "axios";

/**
 * Base URL:
 * - Dev: dùng proxy /api
 * - Prod: ưu tiên VITE_API_BASE_URL; nếu không có, fallback /api
 */
const BASE_URL = import.meta.env.DEV
  ? "/api"
  : import.meta.env.VITE_API_BASE_URL ?? "/api";

const DEBUG = true;

// Tạo axios instance riêng cho báo cáo
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  // console.log("Token:", token); // Debug log
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.error("Không có token");
  }
  return config;
});

// Helper: đọc dữ liệu an toàn từ Promise.allSettled
const settledData = (res, fallback = []) =>
  res?.status === "fulfilled" ? res.value?.data ?? fallback : fallback;

/**
 * 🔹 Lấy tất cả dữ liệu thô cần thiết cho báo cáo
 * @param {{startDate?: string, endDate?: string, stationId?: string|number}} params
 */
export const fetchReportData = async (params = {}) => {
  const { startDate, endDate, stationId } = params;

  try {
    const sessionsPromise = api.get("/ChargingSessions", {
      params: {
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(stationId ? { stationId } : {}),
        status: "Completed",
      },
    });

    const invoicesPromise = api.get("/Invoices");
    const stationsPromise = api.get("/Stations/paged", {
      params: { page: 1, pageSize: 2000 },
    });

    // ✅ THÊM 2 API này để lấy danh sách gốc Port/Charger
    const portsPromise = api.get("/Ports", {
      params: { page: 1, pageSize: 1000 },
    });
    const chargersPromise = api.get("/Chargers");

    const subscriptionPlansPromise = api.get("/SubscriptionPlans");
    const subscriptionsPromise = api.get("/Subscriptions");

    const results = await Promise.allSettled([
      sessionsPromise,
      invoicesPromise,
      stationsPromise,
      portsPromise,
      chargersPromise,
      subscriptionPlansPromise,
      subscriptionsPromise,
    ]);

    const [
      sessionsResult,
      invoicesResult,
      stationsResult,
      portsResult,
      chargersResult,
      subscriptionPlansResult,
      subscriptionsResult,
    ] = results;

    const payload = {
      sessionsData: settledData(sessionsResult, []),
      invoicesData: settledData(invoicesResult, []),
      stationsData: (() => {
        const d = settledData(stationsResult, []);
        return d?.items ?? d ?? [];
      })(),
      // ✅ TRẢ RA ports & chargers để FE map
      portsData: (() => {
        const d = settledData(portsResult, []);
        return d?.items ?? d ?? [];
      })(),
      chargersData: settledData(chargersResult, []),
      subscriptionPlansData: settledData(subscriptionPlansResult, []),
      subscriptionsData: settledData(subscriptionsResult, []),
    };

    if (DEBUG) console.log("📥 Raw report data fetched:", payload);
    return payload;
  } catch (error) {
    console.error("❌ Lỗi khi tải dữ liệu báo cáo:", error);
    throw error;
  }
};

/**
 * 🔹 Lấy dữ liệu Analytics cho ADMIN (tổng hợp theo tháng)
 */
export const fetchAdminAnalytics = async ({ month, year }) => {
  try {
    const baseParams = {
      month,
      year,
      adminView: true,
    };

    const summaryPromise = api.get("/Analytics/summary", {
      params: baseParams,
    });

    const revenueSourcesPromise = api.get("/Analytics/revenue-sources", {
      params: baseParams,
    });

    const companyBreakdownPromise = api.get("/Analytics/breakdown/company", {
      params: baseParams,
    });

    const stationBreakdownPromise = api.get("/Analytics/breakdown/stations", {
      params: baseParams,
    });

    // 👇 ĐÃ SỬA: Thêm minUtilization=0 và minSessions=0 để lấy TẤT CẢ trạm
    const utilizationStationPromise = api.get("/Analytics/utilization", {
      params: {
        ...baseParams,
        scope: "Station",
        minUtilization: 0, // Quan trọng: Lấy cả trạm 0%
        minSessions: 0, // Quan trọng: Lấy cả trạm ít phiên
      },
    });

    // 👇 ĐÃ SỬA: Thêm tham số tương tự cho Top/Under để lấy danh sách đầy đủ
    const topUnderPromise = api.get("/Analytics/top-under", {
      params: {
        ...baseParams,
        minUtilization: 0.05,
        minSessions: 5,
      },
    });

    const vehicleBreakdownPromise = Promise.resolve({ data: [] });

    const vehicleTypeBreakdownPromise = api.get(
      "/Analytics/breakdown/vehicle-types",
      {
        params: baseParams,
      }
    );

    const results = await Promise.allSettled([
      summaryPromise,
      revenueSourcesPromise,
      companyBreakdownPromise,
      stationBreakdownPromise,
      utilizationStationPromise,
      topUnderPromise,
      vehicleBreakdownPromise,
      vehicleTypeBreakdownPromise,
    ]);

    const [
      summaryResult,
      revenueSourcesResult,
      companyBreakdownResult,
      stationBreakdownResult,
      utilizationStationResult,
      topUnderResult,
      vehicleBreakdownResult,
      vehicleTypeBreakdownResult,
    ] = results;

    const payload = {
      summary: settledData(summaryResult, null),
      revenueSources: settledData(revenueSourcesResult, null),
      companyBreakdown: settledData(companyBreakdownResult, []),
      stationBreakdown: settledData(stationBreakdownResult, []),
      utilizationStations: settledData(utilizationStationResult, []),
      topUnder: settledData(topUnderResult, null),
      vehicleBreakdown: settledData(vehicleBreakdownResult, []),
      vehicleTypeBreakdown: settledData(vehicleTypeBreakdownResult, []),
    };

    if (DEBUG) console.log("📊 Admin analytics:", payload);
    return payload;
  } catch (error) {
    console.error("❌ Lỗi khi tải Analytics admin:", error);
    throw error;
  }
};

/**
 * 🔹 Hàm xóa Port (Dùng cho mục Zero Activity)
 */
export const deletePort = async (portId) => {
  try {
    // Thay đổi đường dẫn '/Ports' tùy theo Controller của bạn
    await api.delete(`/Ports/${portId}`);
    return true;
  } catch (error) {
    console.error("Lỗi khi xóa Port:", error);
    // Kiểm tra lỗi chi tiết từ server trả về nếu có
    const serverMsg = error.response?.data?.message || error.message;
    alert(`Không thể xóa Port. Lỗi: ${serverMsg}`);
    return false;
  }
};

export default { fetchReportData, fetchAdminAnalytics, deletePort };
