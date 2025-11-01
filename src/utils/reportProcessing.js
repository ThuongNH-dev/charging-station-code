// ✅ src/utils/reportProcessing.js
// ƯU TIÊN sessionsData, KHÔNG phụ thuộc invoice.chargingSessions
import moment from "moment";

const DEBUG_MODE = true;

/* -------------------- Helpers chung -------------------- */
export const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(num);
};

// Lấy mảng từ nhiều shape API: Array | {items: []} | {data: []}
const toArray = (maybeArr) => {
  if (Array.isArray(maybeArr)) return maybeArr;
  if (Array.isArray(maybeArr?.items)) return maybeArr.items;
  if (Array.isArray(maybeArr?.data)) return maybeArr.data;
  return [];
};

const normalize = (s = "") =>
  s
    .toString()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** 🔑 CHỈ 6 GÓI HỢP LỆ (đúng như dữ liệu bạn cung cấp) */
const OFFICIAL_PLANS = [
  "Tiêu chuẩn",
  "Cao cấp",
  "Bạc",
  "Doanh nghiệp",
  "Vàng",
  "Kim cương",
];
const OFFICIAL_NORM = OFFICIAL_PLANS.map(normalize);

/** Chuẩn hóa tên gói → 1 trong 6 gói trên; nếu không khớp, trả về null (BỎ QUA) */
const toOfficialPlan = (name) => {
  const n = normalize(name || "");
  if (!n) return null;
  // khớp tuyệt đối
  const idx = OFFICIAL_NORM.indexOf(n);
  if (idx >= 0) return OFFICIAL_PLANS[idx];
  // khớp alias phổ biến không dấu
  if (n.includes("tieu chuan")) return "Tiêu chuẩn";
  if (n.includes("cao cap")) return "Cao cấp";
  if (n === "bac") return "Bạc";
  if (n.includes("doanh nghiep")) return "Doanh nghiệp";
  if (n === "vang") return "Vàng";
  if (n.includes("kim cuong")) return "Kim cương";
  // ❌ không thuộc 6 gói ⇒ bỏ qua khi thống kê theo gói
  return null;
};

const weekdayVN = (m) => {
  const w = m.isoWeekday(); // 1..7
  const names = ["", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "CN"];
  return names[w];
};

// An toàn null: quy đổi city -> region
const cityToRegion = (cityInput) => {
  const c = (cityInput ?? "").toString().trim().toLowerCase();
  if (!c) return "Miền Nam";
  const north = [
    "hà nội",
    "ha noi",
    "hải phòng",
    "hai phong",
    "quảng ninh",
    "quang ninh",
    "bắc ninh",
    "bac ninh",
    "bắc giang",
    "bac giang",
    "nam định",
    "ninh bình",
    "hưng yên",
    "hai duong",
    "hải dương",
    "thái nguyên",
    "thai nguyen",
  ];
  const central = [
    "đà nẵng",
    "da nang",
    "huế",
    "hue",
    "thừa thiên huế",
    "quảng nam",
    "quang nam",
    "quảng ngãi",
    "quang ngai",
    "nha trang",
    "khánh hòa",
    "khanh hoa",
    "đắk lắk",
    "dak lak",
    "thanh hóa",
    "thanh hoa",
    "nghệ an",
    "nghe an",
    "quy nhơn",
    "quy nhon",
  ];
  if (north.some((x) => c.includes(x))) return "Miền Bắc";
  if (central.some((x) => c.includes(x))) return "Miền Trung";
  return "Miền Nam";
};

const areaKey = (region) =>
  region === "Miền Bắc"
    ? "mienBac"
    : region === "Miền Trung"
    ? "mienTrung"
    : "mienNam";

// Lấy thời điểm kết thúc/bắt đầu từ session với nhiều kiểu field
const getSessionMoment = (s) => {
  const dt =
    s.endedAt ??
    s.EndedAt ??
    s.startedAt ??
    s.StartedAt ??
    s.startTime ??
    s.StartTime ??
    null;
  const m = moment(dt);
  return m.isValid() ? m : null;
};

// Đọc năng lượng với nhiều key khác nhau
const pickEnergy = (s) =>
  Number(
    s.energyKwh ??
      s.energyKWh ??
      s.energyConsumed ??
      s.energy ??
      s.EnergyKwh ??
      s.EnergyKWh ??
      s.EnergyConsumed ??
      0
  );

/* =========================================================
 * 1) KPI TỔNG QUAN — sessions (Completed)
 * ========================================================= */
export const calculateKpiOverview = (rawData) => {
  const sessions = toArray(rawData?.sessionsData);

  let totalRevenue = 0;
  let totalEnergy = 0;
  let totalDurationMin = 0;
  let completedSessions = 0;

  sessions.forEach((s) => {
    if ((s.status ?? s.Status) === "Completed") {
      totalRevenue += Number(s.total ?? s.Total ?? 0);
      totalEnergy += pickEnergy(s);
      totalDurationMin += Number(s.durationMin ?? s.DurationMin ?? 0);
      completedSessions++;
    }
  });

  const prevRevenue = totalRevenue * 0.9;
  const prevEnergy = totalEnergy * 0.95;

  const revenuePercent =
    prevRevenue > 0
      ? (((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1)
      : 0;

  const energyPercent =
    prevEnergy > 0
      ? (((totalEnergy - prevEnergy) / prevEnergy) * 100).toFixed(1)
      : 0;

  const avgRevenuePerSession =
    completedSessions > 0
      ? formatCurrency(totalRevenue / completedSessions)
      : "0 ₫";

  const avgDurationSec =
    completedSessions > 0
      ? Math.round((totalDurationMin * 60) / completedSessions)
      : 0;
  const avgDurationPerSession = `${Math.floor(avgDurationSec / 60)}m ${
    avgDurationSec % 60
  }s`;

  if (DEBUG_MODE)
    console.log("[KPI] sessionsCompleted:", completedSessions, {
      totalRevenue,
      totalEnergy,
      totalDurationMin,
    });

  return {
    totalRevenue: formatCurrency(totalRevenue),
    totalEnergy: `${totalEnergy.toFixed(2)} kWh`,
    revenuePercent,
    energyPercent,
    avgRevenuePerSession,
    avgDurationPerSession,
  };
};

/* =========================================================
 * 2) CƠ CẤU DỊCH VỤ (Pie + Bar) — map theo Subscriptions/Plans
 *    CHỈ dùng 6 gói: Tiêu chuẩn, Cao cấp, Bạc, Doanh nghiệp, Vàng, Kim cương
 *    ❗️Phiên không xác định gói → BỎ QUA trong thống kê theo gói.
 * ========================================================= */
export const processServiceStructure = (rawData) => {
  const sessions = toArray(rawData?.sessionsData);
  const invoices = toArray(rawData?.invoicesData);
  const subscriptions = toArray(rawData?.subscriptionsData);
  const plans = toArray(rawData?.subscriptionPlansData);

  // --- Map helpers hiện có ---
  const invToSub = new Map();
  invoices.forEach((i) => {
    const invoiceId = i.invoiceId ?? i.InvoiceId;
    const subId = i.subscriptionId ?? i.SubscriptionId;
    if (invoiceId && subId) invToSub.set(invoiceId, subId);
  });

  const subToPlanName = new Map();
  subscriptions.forEach((s) => {
    const sid = s.subscriptionId ?? s.SubscriptionId;
    const name = s.planName ?? s.PlanName ?? "";
    if (sid) subToPlanName.set(sid, name);
  });

  const planIdToName = new Map();
  plans.forEach((p) => {
    const id = p.subscriptionPlanId ?? p.PlanId ?? p.id ?? p.Id;
    const name = p.planName ?? p.PlanName ?? p.name ?? "";
    if (id) planIdToName.set(id, name);
  });

  // --- NEW: index theo customer/company + hiệu lực thời gian ---
  // Tạo 2 map: customerId -> list subs, companyId -> list subs
  const byCustomer = new Map();
  const byCompany = new Map();
  subscriptions.forEach((s) => {
    const item = {
      planName: s.planName ?? s.PlanName ?? "",
      start: s.startDate ?? s.StartDate ?? null,
      end: s.endDate ?? s.EndDate ?? null,
      status: s.status ?? s.Status ?? "",
    };
    const cId = s.customerId ?? s.CustomerId ?? null;
    const coId = s.companyId ?? s.CompanyId ?? null;
    if (cId != null) {
      if (!byCustomer.has(cId)) byCustomer.set(cId, []);
      byCustomer.get(cId).push(item);
    }
    if (coId != null) {
      if (!byCompany.has(coId)) byCompany.set(coId, []);
      byCompany.get(coId).push(item);
    }
  });

  // Kiểm tra xem 1 subscription có "hiệu lực" tại thời điểm t không
  const isActiveAt = (sub, m) => {
    const startOk = sub.start ? moment(sub.start).isSameOrBefore(m) : true;
    const endOk = sub.end ? moment(sub.end).isSameOrAfter(m) : true;
    // chấp nhận cả Active/Inactive, nhưng ưu tiên Active
    return startOk && endOk;
  };

  // --- Cộng doanh thu theo 6 gói ---
  const revByPlan = Object.fromEntries(OFFICIAL_PLANS.map((n) => [n, 0]));
  let unresolved = 0;

  sessions.forEach((s) => {
    if ((s.status ?? s.Status) !== "Completed") return;
    const rev = Number(s.total ?? s.Total ?? 0);

    // 1) Ưu tiên: invoice -> subscription -> planName
    let rawName = null;
    const invoiceId = s.invoiceId ?? s.InvoiceId;
    const subId = invoiceId ? invToSub.get(invoiceId) : null;
    if (subId) rawName = subToPlanName.get(subId) || rawName;

    // 2) Dự phòng: session.subscriptionPlanId
    const spId = s.subscriptionPlanId ?? s.SubscriptionPlanId;
    if (!rawName && spId && planIdToName.has(spId))
      rawName = planIdToName.get(spId);

    // 3) NEW fallback: dò theo customer/company + thời điểm session
    if (!rawName) {
      const m = getSessionMoment(s) || moment(); // thời điểm phiên
      const customerId = s.customerId ?? s.CustomerId ?? null;
      const companyId = s.companyId ?? s.CompanyId ?? null;

      const pickFrom = [];
      if (customerId != null && byCustomer.has(customerId)) {
        pickFrom.push(...byCustomer.get(customerId));
      }
      if (!rawName && companyId != null && byCompany.has(companyId)) {
        pickFrom.push(...byCompany.get(companyId));
      }

      if (pickFrom.length) {
        // ưu tiên subscription Active tại thời điểm đó; nếu không có, lấy bất kỳ cái bao phủ thời gian
        const active = pickFrom.find(
          (x) => (x.status || "").toLowerCase() === "active" && isActiveAt(x, m)
        );
        const covering = pickFrom.find((x) => isActiveAt(x, m));
        rawName = (active?.planName || covering?.planName) ?? null;
      }
    }

    const official = toOfficialPlan(rawName);
    if (!official) {
      unresolved++;
      return;
    }

    revByPlan[official] += rev;
  });

  if (DEBUG_MODE) {
    console.log(
      "[ServiceStructure] unresolved sessions (no plan matched):",
      unresolved
    );
    console.log("[ServiceStructure] revByPlan:", revByPlan);
  }

  const pieData = OFFICIAL_PLANS.map((name) => ({
    name,
    value: revByPlan[name],
  }));

  // --- Bar theo tháng (chỉ các phiên map được gói) ---
  const monthly = {};
  sessions.forEach((s) => {
    if ((s.status ?? s.Status) !== "Completed") return;

    // Lặp lại cùng logic gán gói như trên (rút gọn dùng hàm con cũng được)
    let rawName = null;
    const invoiceId = s.invoiceId ?? s.InvoiceId;
    const subId = invoiceId ? invToSub.get(invoiceId) : null;
    if (subId) rawName = subToPlanName.get(subId) || rawName;
    const spId = s.subscriptionPlanId ?? s.SubscriptionPlanId;
    if (!rawName && spId && planIdToName.has(spId))
      rawName = planIdToName.get(spId);
    if (!rawName) {
      const m = getSessionMoment(s) || moment();
      const customerId = s.customerId ?? s.CustomerId ?? null;
      const companyId = s.companyId ?? s.CompanyId ?? null;
      const pickFrom = [];
      if (customerId != null && byCustomer.has(customerId))
        pickFrom.push(...byCustomer.get(customerId));
      if (companyId != null && byCompany.has(companyId))
        pickFrom.push(...byCompany.get(companyId));
      const active = pickFrom.find(
        (x) => (x.status || "").toLowerCase() === "active" && isActiveAt(x, m)
      );
      const covering = pickFrom.find((x) => isActiveAt(x, m));
      rawName = (active?.planName || covering?.planName) ?? null;
    }

    const official = toOfficialPlan(rawName);
    if (!official) return;

    const m = getSessionMoment(s) || moment();
    const key = m.format("MM/YYYY");
    if (!monthly[key]) {
      monthly[key] = { month: key, total: 0 };
      OFFICIAL_PLANS.forEach((n) => (monthly[key][n] = 0));
    }
    const rev = Number(s.total ?? s.Total ?? 0);
    monthly[key][official] += rev;
    monthly[key].total += rev;
  });

  const monthlyRevenue = Object.values(monthly).sort((a, b) =>
    moment(a.month, "MM/YYYY").diff(moment(b.month, "MM/YYYY"))
  );

  return { pieData, monthlyRevenue };
};

/* =========================================================
 * 3) SO SÁNH KHU VỰC & BẢNG TRẠM — tính từ sessions
 * ========================================================= */
export const processRegionalComparison = (rawData) => {
  const stations = toArray(rawData?.stationsData);
  const sessions = toArray(rawData?.sessionsData);

  // Index trạm
  const stationMap = {};
  stations.forEach((s) => {
    const stationId = s.stationId ?? s.StationId ?? s.id ?? s.Id;
    if (stationId == null) return;
    const region = cityToRegion(s.city ?? s.City);

    stationMap[stationId] = {
      stationId,
      stationName: s.stationName ?? s.name ?? "Không xác định",
      city: s.city ?? s.City ?? "",
      region,
      openStatus: (s.status ?? s.Status) === "Open" ? "Online" : "Offline",
      totalSessions: 0,
      totalEnergy: 0,
      totalRevenue: 0,
    };
  });

  // Cộng dồn từ sessions
  sessions.forEach((ss) => {
    const sid = ss.stationId ?? ss.StationId;
    const target = stationMap[sid];
    if (!target) return;
    if ((ss.status ?? ss.Status) === "Completed") {
      target.totalSessions += 1;
      target.totalEnergy += pickEnergy(ss);
      target.totalRevenue += Number(ss.total ?? ss.Total ?? 0);
    }
  });

  // Heuristic usage%
  const maxSessions = Math.max(
    1,
    ...Object.values(stationMap).map((s) => s.totalSessions)
  );
  Object.values(stationMap).forEach((s) => {
    const ratio = s.totalSessions / maxSessions;
    s.usageNum = Math.min(100, Math.round(ratio * 100));
    s.usage = `${s.usageNum}%`;
    s.status = s.openStatus;
  });

  const regionalSummary = {
    mienBac: { revenue: 0, sessions: 0, usagePercent: 0, stationCount: 0 },
    mienTrung: { revenue: 0, sessions: 0, usagePercent: 0, stationCount: 0 },
    mienNam: { revenue: 0, sessions: 0, usagePercent: 0, stationCount: 0 },
  };

  Object.values(stationMap).forEach((s) => {
    const key = areaKey(s.region);
    regionalSummary[key].revenue += s.totalRevenue;
    regionalSummary[key].sessions += s.totalSessions;
    regionalSummary[key].usagePercent += Number.isFinite(s.usageNum)
      ? s.usageNum
      : 0;
    regionalSummary[key].stationCount += 1;
  });

  Object.values(regionalSummary).forEach((r) => {
    r.usagePercent = r.stationCount
      ? +(r.usagePercent / r.stationCount).toFixed(1)
      : 0;
  });

  const detailedStationTable = Object.values(stationMap).map((s) => ({
    stationName: s.stationName,
    region: s.region,
    totalSessions: s.totalSessions,
    totalEnergy: `${s.totalEnergy.toFixed(2)} kWh`,
    usage: s.usage,
    status: s.status,
    revenue: s.totalRevenue,
  }));

  if (DEBUG_MODE) {
    console.log("[Regional] summary:", regionalSummary);
    console.log("[Regional] table:", detailedStationTable);
  }

  return { regionalSummary, detailedStationTable };
};

/* =========================================================
 * 4) BIỂU ĐỒ THỜI GIAN 7 NGÀY — sessions + revenue theo ngày
 * ========================================================= */
export const processTimeChartData = (rawData) => {
  const sessions = toArray(rawData?.sessionsData);

  const today = moment();
  const days = {};
  for (let i = 6; i >= 0; i--) {
    const d = today.clone().subtract(i, "days");
    const key = d.format("YYYY-MM-DD");
    days[key] = { day: weekdayVN(d), sessions: 0, revenue: 0 };
  }

  sessions.forEach((s) => {
    if ((s.status ?? s.Status) !== "Completed") return;
    const m = getSessionMoment(s);
    if (!m) return;
    const key = m.format("YYYY-MM-DD");
    if (!days[key]) return;
    days[key].sessions += 1;
    days[key].revenue += Number(s.total ?? s.Total ?? 0);
  });

  const dailySessions = Object.values(days).map((d) => ({
    day: d.day,
    sessions: d.sessions,
  }));
  const dailyRevenue = Object.values(days).map((d) => ({
    day: d.day,
    revenue: Math.round(d.revenue / 1000),
  }));

  if (DEBUG_MODE)
    console.log(
      "[TimeChart] dailySessions:",
      dailySessions,
      "dailyRevenue:",
      dailyRevenue
    );

  return { dailySessions, dailyRevenue };
};

/* =========================================================
 * 5) HEATMAP THEO GIỜ — 7 ngày x 24h, theo số phiên
 * ========================================================= */
export const processTimeChartHourly = (rawData) => {
  const sessions = toArray(rawData?.sessionsData);

  const hourlyData = {};
  const today = moment();
  for (let i = 6; i >= 0; i--) {
    const d = today.clone().subtract(i, "days").format("YYYY-MM-DD");
    for (let h = 0; h < 24; h++) hourlyData[`${d}-${h}`] = 0;
  }

  sessions.forEach((s) => {
    if ((s.status ?? s.Status) !== "Completed") return;
    const m = getSessionMoment(s);
    if (!m) return;
    const key = `${m.format("YYYY-MM-DD")}-${m.hour()}`;
    if (hourlyData[key] !== undefined) hourlyData[key] += 1;
  });

  const result = Object.entries(hourlyData).map(([key, value]) => {
    const [date, hour] = key.split("-");
    return { date, hour: parseInt(hour, 10), value };
  });

  if (DEBUG_MODE) console.log("[Hourly Heatmap] points:", result.length);
  return result;
};

/* =========================================================
 * 6) CẢNH BÁO — dựa trên usage đã tính ở bảng trạm
 * ========================================================= */
export const processWarnings = (rawData) => {
  const { detailedStationTable } = processRegionalComparison(rawData);

  const warnings = detailedStationTable
    .filter((s) => {
      const u = parseFloat(s.usage);
      return u > 90 || u < 20;
    })
    .map((s) => ({
      name: s.stationName,
      usage: s.usage,
      status: parseFloat(s.usage) > 90 ? "Quá tải" : "Ít sử dụng",
      color: parseFloat(s.usage) > 90 ? "danger" : "warning",
    }));

  if (DEBUG_MODE) console.log("[Warnings]", warnings);
  return warnings;
};
