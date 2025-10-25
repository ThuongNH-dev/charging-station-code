// ✅ src/api/reportsApi.js
import axios from "axios";

// BASE_URL tự động đổi theo môi trường dev/prod
const BASE_URL = import.meta.env.DEV ? "/api" : "https://localhost:7268/api";

/**
 * 🔹 Lấy tất cả dữ liệu thô cần thiết cho báo cáo
 * @param {object} params - { startDate, endDate, stationId }
 * @returns {Promise<object>} Dữ liệu thô từ các nguồn: Sessions, Invoices, Stations, SubscriptionPlans, Subscriptions
 */
export const fetchReportData = async (params = {}) => {
  const { startDate = "", endDate = "", stationId = "" } = params;

  try {
    // 1️⃣ Lấy dữ liệu phiên sạc
    const sessionsPromise = axios.get(
      `${BASE_URL}/ChargingSessions?startDate=${startDate}&endDate=${endDate}&stationId=${stationId}`
    );

    // 2️⃣ Lấy dữ liệu hóa đơn
    const invoicesPromise = axios.get(`${BASE_URL}/Invoices`);

    // 3️⃣ Lấy dữ liệu trạm sạc
    const stationsPromise = axios.get(
      `${BASE_URL}/Stations/paged?page=1&pageSize=100`
    );

    // 4️⃣ Lấy dữ liệu Gói Dịch vụ
    const subscriptionPlansPromise = axios.get(`${BASE_URL}/SubscriptionPlans`);

    // 5️⃣ Lấy dữ liệu Đăng ký Gói (Subscriptions)
    const subscriptionsPromise = axios.get(`${BASE_URL}/Subscriptions`);

    // 🔸 Chạy song song tất cả request với Promise.allSettled để debug
    const results = await Promise.allSettled([
      sessionsPromise,
      invoicesPromise,
      stationsPromise,
      subscriptionPlansPromise,
      subscriptionsPromise,
    ]);

    // Kiểm tra từng API
    const [
      sessionsResult,
      invoicesResult,
      stationsResult,
      subscriptionPlansResult,
      subscriptionsResult,
    ] = results;

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

    // 🔹 Log dữ liệu thô để debug
    console.log("📥 Raw report data fetched:", {
      sessionsData:
        sessionsResult.status === "fulfilled" ? sessionsResult.value.data : [],
      invoicesData:
        invoicesResult.status === "fulfilled" ? invoicesResult.value.data : [],
      stationsData:
        stationsResult.status === "fulfilled"
          ? stationsResult.value.data?.items || stationsResult.value.data || []
          : [],
      subscriptionPlansData:
        subscriptionPlansResult.status === "fulfilled"
          ? subscriptionPlansResult.value.data
          : [],
      subscriptionsData:
        subscriptionsResult.status === "fulfilled"
          ? subscriptionsResult.value.data
          : [],
    });

    // ✅ Trả dữ liệu thô đã gom nhóm
    return {
      sessionsData:
        sessionsResult.status === "fulfilled" ? sessionsResult.value.data : [],
      invoicesData:
        invoicesResult.status === "fulfilled" ? invoicesResult.value.data : [],
      stationsData:
        stationsResult.status === "fulfilled"
          ? stationsResult.value.data?.items || stationsResult.value.data || []
          : [],
      subscriptionPlansData:
        subscriptionPlansResult.status === "fulfilled"
          ? subscriptionPlansResult.value.data
          : [],
      subscriptionsData:
        subscriptionsResult.status === "fulfilled"
          ? subscriptionsResult.value.data
          : [],
    };
  } catch (error) {
    console.error("❌ Lỗi khi tải dữ liệu báo cáo:", error);
    throw error;
  }
};
