// ✅ src/api/dashboardApi.js
import axios from "axios";

// Tự đổi theo môi trường dev/prod như các file trước
const BASE_URL = import.meta.env.DEV ? "/api" : "https://localhost:7268/api";

/**
 * Lấy dữ liệu Dashboard trong ngày (sessions, invoices, stations)
 * @returns {Promise<{sessions:any[], stations:any[]}>}
 */
export const fetchDashboardToday = async () => {
  // Lấy mốc ngày hôm nay [00:00, 23:59:59]
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const startDate = start.toISOString();
  const endDate = end.toISOString();

  // API sessions của bạn đã có filter startDate/endDate & stationId
  const sessionsReq = axios.get(
    `${BASE_URL}/ChargingSessions?startDate=${encodeURIComponent(
      startDate
    )}&endDate=${encodeURIComponent(endDate)}`
  );

  // Stations để tính % sử dụng và số trạm online
  const stationsReq = axios.get(
    `${BASE_URL}/Stations/paged?page=1&pageSize=200`
  );

  const [sessionsRes, stationsRes] = await Promise.allSettled([
    sessionsReq,
    stationsReq,
  ]);

  if (sessionsRes.status === "rejected") {
    console.error("❌ Dashboard sessions API failed:", sessionsRes.reason);
  }
  if (stationsRes.status === "rejected") {
    console.error("❌ Dashboard stations API failed:", stationsRes.reason);
  }

  // Chuẩn hoá mảng
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
