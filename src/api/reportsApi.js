// ✅ src/api/reportsApi.js
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

// Helper: đọc dữ liệu an toàn từ Promise.allSettled
const settledData = (res, fallback = []) =>
  res?.status === "fulfilled" ? res.value?.data ?? fallback : fallback;

/**
 * 🔹 Lấy tất cả dữ liệu thô cần thiết cho báo cáo
 * @param {{startDate?: string, endDate?: string, stationId?: string|number}} params
 * @returns {Promise<{
 *   sessionsData: any[],
 *   invoicesData: any[],
 *   stationsData: any[],
 *   subscriptionPlansData: any[],
 *   subscriptionsData: any[]
 * }>}
 */
// ... giữ nguyên phần đầu file
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
      params: { page: 1, pageSize: 200 },
    });

    // ✅ THÊM 2 API này
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
      portsPromise, // ✅
      chargersPromise, // ✅
      subscriptionPlansPromise,
      subscriptionsPromise,
    ]);

    const [
      sessionsResult,
      invoicesResult,
      stationsResult,
      portsResult, // ✅
      chargersResult, // ✅
      subscriptionPlansResult,
      subscriptionsResult,
    ] = results;

    const settledData = (res, fb = []) =>
      res?.status === "fulfilled" ? res.value?.data ?? fb : fb;

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

export default { fetchReportData };
