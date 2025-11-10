// ✅ src/utils/dashboardProcessing.js
import moment from "moment";

export const formatCurrency = (v) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(Number(v) || 0);

const toArr = (x) =>
  Array.isArray(x)
    ? x
    : Array.isArray(x?.items)
    ? x.items
    : Array.isArray(x?.data)
    ? x.data
    : [];

const getSafe = (obj, keys, fallback = undefined) => {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  }
  return fallback;
};

/**
 * Xây dữ liệu cho Dashboard theo THÁNG
 * @param {{sessions:any[], stations:any[]}} raw
 * @param {string} startISO - startDate ISO (inclusive)
 * @param {string} endISO   - endDate ISO (inclusive)
 * @returns {{kpis:{sessionsMonth:number,revenueMonth:number,stationsOnline:number,usagePercent:number}, series:Array<{day:string,value:number}> , stations:Array}}
 */
export function buildDashboardDataMonthly(raw, startISO, endISO) {
  const sessions = toArr(raw?.sessions);
  const stations = toArr(raw?.stations);

  const start = moment(startISO);
  const end = moment(endISO);
  const daysInRange = end.diff(start, "days") + 1;

  // Khởi tạo map ngày -> số phiên
  const daily = Array.from({ length: daysInRange }, (_, i) => {
    const d = moment(start).add(i, "days");
    return { key: d.format("YYYY-MM-DD"), count: 0 };
  });

  let sessionsMonth = 0;
  let revenueMonth = 0;

  sessions.forEach((s) => {
    const status = getSafe(s, ["status", "Status"], "");
    const endTime = getSafe(s, [
      "endedAt",
      "EndedAt",
      "endTime",
      "EndTime",
      "startedAt",
      "StartedAt",
      "startTime",
      "StartTime",
    ]);
    const total = Number(getSafe(s, ["total", "Total"], 0));
    const m = moment(endTime);
    if (!m.isValid()) return;
    if (status !== "Completed") return;
    if (m.isBefore(start, "day") || m.isAfter(end, "day")) return;

    // gộp theo ngày
    const idx = m.startOf("day").diff(start.startOf("day"), "days");
    if (idx >= 0 && idx < daily.length) {
      daily[idx].count += 1;
    }
    sessionsMonth += 1;
    revenueMonth += total || 0;
  });

  const totalStations = stations.length;
  const stationsOnline = stations.filter(
    (x) => getSafe(x, ["status", "Status"], "") === "Open"
  ).length;
  const usagePercent = totalStations
    ? Math.round((stationsOnline / totalStations) * 100)
    : 0;

  const series = daily.map((d) => ({
    day: moment(d.key).format("DD"),
    value: d.count,
  }));

  return {
    kpis: {
      sessionsMonth,
      revenueMonth,
      stationsOnline,
      usagePercent,
    },
    series,
    stations,
  };
}
