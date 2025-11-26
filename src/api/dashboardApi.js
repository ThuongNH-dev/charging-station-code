// ✅ src/api/dashboardApi.js
import axios from "axios";

const BASE_URL = import.meta.env.DEV ? "/api" : "https://localhost:7268/api";

// Tạo axios instance (sau này có thể gắn interceptor token nếu cần)
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  // withCredentials: true, // nếu backend dùng cookie auth
});

// ✅ GẮN INTERCEPTOR TOKEN
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // hoặc từ AuthContext
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Lấy dữ liệu Dashboard theo khoảng ngày (mặc định: hôm nay)
 * @param {{startDate?: string, endDate?: string, stationId?: string|number}} params
 * @returns {Promise<{sessions:any[], stations:any[]}>}
 */
export const fetchDashboard = async (params = {}) => {
  const { startDate, endDate, stationId } = params;

  const qs = new URLSearchParams();
  if (startDate) qs.set("startDate", startDate);
  if (endDate) qs.set("endDate", endDate);
  if (stationId && stationId !== "all") qs.set("stationId", stationId);

  const sessionsReq = api.get(
    `/ChargingSessions${qs.toString() ? `?${qs}` : ""}`
  );

  // Lấy list trạm để đổ dropdown + tính % sử dụng
  const stationsReq = api.get(`/Stations/paged?page=1&pageSize=200`);

  const [sessionsRes, stationsRes] = await Promise.allSettled([
    sessionsReq,
    stationsReq,
  ]);

  const toArr = (d) =>
    Array.isArray(d)
      ? d
      : Array.isArray(d?.items)
      ? d.items
      : Array.isArray(d?.data)
      ? d.data
      : [];

  return {
    sessions: toArr(
      sessionsRes.status === "fulfilled" ? sessionsRes.value.data : []
    ),
    stations:
      toArr(stationsRes.status === "fulfilled" ? stationsRes.value.data : []) ||
      toArr(
        stationsRes.status === "fulfilled" ? stationsRes.value.data?.items : []
      ),
  };
};

/**
 * 🔹 Lấy doanh thu từ Subscription Plans (Invoice có invoiceType = "subscription")
 */
export const fetchSubscriptionRevenue = async ({ month, year }) => {
  try {
    // Lấy tất cả invoices trong tháng
    const invoicesRes = await api.get("/Invoices", {
      params: {
        month,
        year,
        invoiceType: "subscription", // Lọc chỉ lấy subscription invoices
      },
    });

    const invoices = Array.isArray(invoicesRes.data?.items) 
      ? invoicesRes.data.items 
      : Array.isArray(invoicesRes.data) 
      ? invoicesRes.data 
      : [];

    // Tính tổng doanh thu từ subscription plans
    const subscriptionRevenue = invoices
      .filter(inv => 
        inv.billingMonth === month && 
        inv.billingYear === year &&
        String(inv.invoiceType || "").toLowerCase() === "subscription"
      )
      .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

    return subscriptionRevenue;
  } catch (error) {
    console.error("Error fetching subscription revenue:", error);
    return 0;
  }
};

/**
 * 🔹 Lấy tổng quan tháng cho Admin từ Analytics (Summary + RevenueSources + Subscription Revenue)
 *  - /Analytics/summary (charging revenue)
 *  - /Analytics/revenue-sources
 *  - Subscription revenue từ invoices
 */
export const fetchAdminMonthlyOverview = async ({ month, year }) => {
  const baseParams = { month, year, adminView: true };

  const summaryReq = api.get("/Analytics/summary", { params: baseParams });
  const revenueReq = api.get("/Analytics/revenue-sources", {
    params: baseParams,
  });
  
  // Thêm lấy doanh thu subscription
  const subscriptionRevenueReq = fetchSubscriptionRevenue({ month, year });

  const [summaryRes, revenueRes, subscriptionRevenue] = await Promise.allSettled([
    summaryReq,
    revenueReq,
    subscriptionRevenueReq,
  ]);

  const safe = (res, fb = null) =>
    res?.status === "fulfilled" ? res.value?.data ?? fb : fb;

  const summary = safe(summaryRes, null);
  const revenueSources = safe(revenueRes, null);
  const subRevenue = subscriptionRevenue?.status === "fulfilled" ? subscriptionRevenue.value : 0;

  // Cộng doanh thu subscription vào tổng doanh thu
  if (summary && subRevenue > 0) {
    summary.total = (Number(summary.total) || 0) + subRevenue;
    summary.subtotal = (Number(summary.subtotal) || 0) + subRevenue;
  }

  return {
    summary,
    revenueSources,
    subscriptionRevenue: subRevenue,
  };
};
