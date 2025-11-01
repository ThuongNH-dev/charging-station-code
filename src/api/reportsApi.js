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
export const fetchReportData = async (params = {}) => {
  const { startDate, endDate, stationId } = params;

  try {
    // 1) ChargingSessions (truyền query bằng params để tránh chuỗi rỗng)
    const sessionsPromise = api.get("/ChargingSessions", {
      params: {
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(stationId ? { stationId } : {}),
      },
    });

    // 2) Invoices
    const invoicesPromise = api.get("/Invoices");

    // 3) Stations paged
    const stationsPromise = api.get("/Stations/paged", {
      params: { page: 1, pageSize: 100 },
    });

    // 4) SubscriptionPlans
    const subscriptionPlansPromise = api.get("/SubscriptionPlans");

    // 5) Subscriptions
    const subscriptionsPromise = api.get("/Subscriptions");

    // Chạy song song
    const results = await Promise.allSettled([
      sessionsPromise,
      invoicesPromise,
      stationsPromise,
      subscriptionPlansPromise,
      subscriptionsPromise,
    ]);

    const [
      sessionsResult,
      invoicesResult,
      stationsResult,
      subscriptionPlansResult,
      subscriptionsResult,
    ] = results;

    // Log lỗi từng API nếu có
    if (sessionsResult.status === "rejected")
      console.error("❌ ChargingSessions API failed:", sessionsResult.reason);
    if (invoicesResult.status === "rejected")
      console.error("❌ Invoices API failed:", invoicesResult.reason);
    if (stationsResult.status === "rejected")
      console.error("❌ Stations API failed:", stationsResult.reason);
    if (subscriptionPlansResult.status === "rejected")
      console.error(
        "❌ SubscriptionPlans API failed:",
        subscriptionPlansResult.reason
      );
    if (subscriptionsResult.status === "rejected")
      console.error("❌ Subscriptions API failed:", subscriptionsResult.reason);

    // Chuẩn hóa payload trả về
    const payload = {
      sessionsData: settledData(sessionsResult, []),
      invoicesData: settledData(invoicesResult, []),
      stationsData: (() => {
        const data = settledData(stationsResult, []);
        // endpoint paged có thể trả { items, total } hoặc list trực tiếp
        return data?.items ?? data ?? [];
      })(),
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
