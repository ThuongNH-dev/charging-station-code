// ✅ src/api/dashboardApi.js
import axios from "axios";

const BASE_URL = import.meta.env.DEV ? "/api" : "https://localhost:7268/api";

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

  const sessionsReq = axios.get(
    `${BASE_URL}/ChargingSessions${qs.toString() ? `?${qs}` : ""}`
  );

  // Lấy list trạm để đổ dropdown + tính % sử dụng
  const stationsReq = axios.get(
    `${BASE_URL}/Stations/paged?page=1&pageSize=200`
  );

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
