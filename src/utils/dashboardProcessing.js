import moment from "moment";

export const formatCurrency = (v) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(Number(v) || 0);

// Hỗ trợ nhiều shape: Array | {items: []} | {data: []}
const toArr = (x) =>
  Array.isArray(x)
    ? x
    : Array.isArray(x?.items)
    ? x.items
    : Array.isArray(x?.data)
    ? x.data
    : [];

export function buildDashboardData(raw) {
  // raw = { sessions, stations } từ API
  const sessions = toArr(raw?.sessions);
  const stations = toArr(raw?.stations);

  const todayStr = moment().format("YYYY-MM-DD");

  // --- KPI hôm nay ---
  let sessionsToday = 0;
  let revenueToday = 0;

  sessions.forEach((s) => {
    const status = s.status ?? s.Status;
    const end =
      s.endedAt ??
      s.EndedAt ??
      s.startedAt ??
      s.StartedAt ??
      s.startTime ??
      s.StartTime;

    const m = moment(end);
    if (
      status === "Completed" &&
      m.isValid() &&
      m.format("YYYY-MM-DD") === todayStr
    ) {
      sessionsToday += 1;
      revenueToday += Number(s.total ?? s.Total ?? 0);
    }
  });

  const totalStations = stations.length;
  const stationsOnline = stations.filter(
    (x) => (x.status ?? x.Status) === "Open"
  ).length;
  const usagePercent = totalStations
    ? Math.round((stationsOnline / totalStations) * 100)
    : 0;

  // --- Chuỗi theo giờ (đếm phiên) ---
  const hours = [6, 9, 12, 15, 18, 21]; // hoặc làm đủ 24h nếu muốn
  const hourlyMap = Object.fromEntries(hours.map((h) => [h, 0]));

  sessions.forEach((s) => {
    const status = s.status ?? s.Status;
    const end =
      s.endedAt ??
      s.EndedAt ??
      s.startedAt ??
      s.StartedAt ??
      s.startTime ??
      s.StartTime;

    const m = moment(end);
    if (
      status === "Completed" &&
      m.isValid() &&
      m.format("YYYY-MM-DD") === todayStr
    ) {
      const h = m.hour();
      // Gán về mốc gần nhất trong mảng hours
      let nearest = hours[0];
      let minDiff = Math.abs(h - nearest);
      for (const hh of hours) {
        const d = Math.abs(h - hh);
        if (d < minDiff) {
          minDiff = d;
          nearest = hh;
        }
      }
      hourlyMap[nearest] += 1; // đếm số phiên (không có kWh trong sample)
    }
  });

  const powerSeries = hours.map((h) => ({
    hour: `${h}h`,
    value: hourlyMap[h],
  }));

  return {
    kpis: {
      sessionsToday,
      revenueToday,
      stationsOnline,
      usagePercent, // <- tên field thống nhất
    },
    powerSeries, // <- tên field thống nhất
  };
}
