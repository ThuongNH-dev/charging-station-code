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
 * 🔹 Lấy tổng quan tháng cho Admin từ Analytics (Summary + RevenueSources)
 *  - /Analytics/summary
 *  - /Analytics/revenue-sources
 */
export const fetchAdminMonthlyOverview = async ({ month, year }) => {
  const baseParams = { month, year, adminView: true };

  const summaryReq = api.get("/Analytics/summary", { params: baseParams });
  const revenueReq = api.get("/Analytics/revenue-sources", {
    params: baseParams,
  });

  const [summaryRes, revenueRes] = await Promise.allSettled([
    summaryReq,
    revenueReq,
  ]);

  const safe = (res, fb = null) =>
    res?.status === "fulfilled" ? res.value?.data ?? fb : fb;

  return {
    summary: safe(summaryRes, null),
    revenueSources: safe(revenueRes, null),
  };
};
