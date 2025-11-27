// ✅ src/utils/reportProcessing.js
// ƯU TIÊN sessionsData, KHÔNG phụ thuộc invoice.chargingSessions
import moment from "moment";

const DEBUG_MODE = true;

// =========================================
// 🔧 Fallback mapping FE: port → charger → station
// =========================================
export function buildPortStationMap(portsData = [], chargersData = []) {
  const chargerToStation = new Map();
  (chargersData || []).forEach((c) => {
    if (c.chargerId && (c.stationId || c.StationId)) {
      chargerToStation.set(c.chargerId, c.stationId || c.StationId);
    }
  });

  const portToStation = new Map();
  (portsData || []).forEach((p) => {
    if (!p.portId) return;
    const sid =
      p.stationId ||
      p.StationId ||
      (p.chargerId && chargerToStation.get(p.chargerId));
    if (sid) portToStation.set(p.portId, sid);
  });

  // Debug (có thể xóa sau)
  console.log("🧩 portToStation map", Object.fromEntries(portToStation));

  return portToStation;
}

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

/** 🔑 CHỈ 6 GÓI HỢP LỆ */
const OFFICIAL_PLANS = [
  "Tiêu chuẩn",
  "Cao cấp",
  "Bạc",
  "Doanh nghiệp",
  "Vàng",
  "Kim cương",
];
const OFFICIAL_NORM = OFFICIAL_PLANS.map(normalize);

/** Chuẩn hóa tên gói → 1 trong 6 gói trên */
const toOfficialPlan = (name) => {
  const n = normalize(name || "");
  if (!n) return null;
  const idx = OFFICIAL_NORM.indexOf(n);
  if (idx >= 0) return OFFICIAL_PLANS[idx];
  if (n.includes("tieu chuan")) return "Tiêu chuẩn";
  if (n.includes("cao cap")) return "Cao cấp";
  if (n === "bac") return "Bạc";
  if (n.includes("doanh nghiep")) return "Doanh nghiệp";
  if (n === "vang") return "Vàng";
  if (n.includes("kim cuong")) return "Kim cương";
  return null;
};

const weekdayVN = (m) => {
  const w = m.isoWeekday();
  const names = ["", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "CN"];
  return names[w];
};

/* =========================================================
 * 🔹 PHÂN LOẠI KHU VỰC THEO THÀNH PHỐ (DÙNG TRONG FE)
 * ========================================================= */
export function classifyRegion(city = "") {
  const c = (city || "").toString().trim().toLowerCase();
  if (!c) return "Miền Nam";

  const north = [
    "hà nội",
    "ha noi",
    "hải phòng",
    "hai phong",
    "bắc ninh",
    "bac ninh",
    "bắc giang",
    "bac giang",
    "quảng ninh",
    "quang ninh",
    "nam định",
    "ninh bình",
    "hai duong",
    "thái nguyên",
    "thai nguyen",
  ];
  const central = [
    "đà nẵng",
    "da nang",
    "huế",
    "hue",
    "thanh hóa",
    "thanh hoa",
    "nghệ an",
    "nghe an",
    "quảng nam",
    "quang nam",
    "quảng ngãi",
    "quang ngai",
    "nha trang",
    "khánh hòa",
    "khanh hoa",
  ];

  if (north.some((x) => c.includes(x))) return "Miền Bắc";
  if (central.some((x) => c.includes(x))) return "Miền Trung";
  return "Miền Nam";
}

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

// Lấy thời điểm kết thúc/bắt đầu từ session
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

// ✅ Đọc năng lượng với nhiều key khác nhau (đầy đủ alias)
// ✅ Đọc năng lượng robust: hỗ trợ alias, string có dấu phẩy, field lồng
const pickEnergy = (s) => {
  const raw =
    s?.energyKwh ??
    s?.energyKWh ??
    s?.energyConsumed ??
    s?.energy ??
    s?.kwh ??
    s?.Kwh ??
    s?.KWh ??
    s?.Energy ??
    s?.EnergyKwh ??
    s?.EnergyKWh ??
    s?.EnergyConsumed ??
    s?.meter?.energyKwh ??
    s?.meter?.energyKWh ??
    s?.meter?.kwh ??
    0;

  const n =
    typeof raw === "string"
      ? Number(raw.replace(",", ".")) // "22,5" -> 22.5
      : Number(raw);

  return Number.isFinite(n) ? n : 0;
};

/* =========================================================
 * 2) CƠ CẤU DỊCH VỤ (Pie + Bar)
 * ========================================================= */
export const processServiceStructure = (rawData) => {
  const sessions = toArray(rawData?.sessionsData);
  const invoices = toArray(rawData?.invoicesData);
  const subscriptions = toArray(rawData?.subscriptionsData);
  const plans = toArray(rawData?.subscriptionPlansData);

  const invToSub = new Map();
  invoices.forEach((i) => {
    const invoiceId = i.invoiceId ?? i.InvoiceId;
    const subId =
      i.subscriptionId ??
      i.SubscriptionId ??
      i.subscription?.subscriptionId ??
      i.Subscription?.SubscriptionId ??
      null;
    if (invoiceId && subId) invToSub.set(invoiceId, subId);
  });

  const subToPlanName = new Map();
  subscriptions.forEach((s) => {
    const sid = s.subscriptionId ?? s.SubscriptionId;
    const name =
      s.planName ?? s.PlanName ?? s.plan?.planName ?? s.Plan?.PlanName ?? "";
    if (sid) subToPlanName.set(sid, name);
  });

  const planIdToName = new Map();
  plans.forEach((p) => {
    const id =
      p.subscriptionPlanId ??
      p.SubscriptionPlanId ??
      p.planId ??
      p.PlanId ??
      p.id ??
      p.Id;
    const name = p.planName ?? p.PlanName ?? p.name ?? "";
    if (id) planIdToName.set(id, name);
  });

  const byCustomer = new Map();
  const byCompany = new Map();
  subscriptions.forEach((s) => {
    const item = {
      planName:
        s.planName ?? s.PlanName ?? s.plan?.planName ?? s.Plan?.PlanName ?? "",
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

  const isActiveAt = (sub, m) => {
    const startOk = sub.start ? moment(sub.start).isSameOrBefore(m) : true;
    const endOk = sub.end ? moment(sub.end).isSameOrAfter(m) : true;
    return startOk && endOk;
  };

  const revByPlan = Object.fromEntries(OFFICIAL_PLANS.map((n) => [n, 0]));
  let unresolved = 0;

  sessions.forEach((s) => {
    if ((s.status ?? s.Status) !== "Completed") return;
    const rev = Number(s.total ?? s.Total ?? 0);
    let rawName = null;

    // invoice -> sub -> plan
    const invoiceId = s.invoiceId ?? s.InvoiceId;
    const subId = invoiceId ? invToSub.get(invoiceId) : null;
    if (subId) rawName = subToPlanName.get(subId) || rawName;

    // fallback: subscriptionPlanId
    const spId = s.subscriptionPlanId ?? s.SubscriptionPlanId;
    if (!rawName && spId && planIdToName.has(spId)) {
      rawName = planIdToName.get(spId);
    }

    // fallback: theo customer/company + thời điểm
    if (!rawName) {
      const m = getSessionMoment(s) || moment();
      const customerId = s.customerId ?? s.CustomerId ?? null;
      const companyId = s.companyId ?? s.CompanyId ?? null;
      const pickFrom = [];
      if (customerId != null && byCustomer.has(customerId))
        pickFrom.push(...byCustomer.get(customerId));
      if (!rawName && companyId != null && byCompany.has(companyId))
        pickFrom.push(...byCompany.get(companyId));
      if (pickFrom.length) {
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
    console.log("[ServiceStructure] unresolved:", unresolved);
    console.log("[ServiceStructure] revByPlan:", revByPlan);
  }

  const pieData = OFFICIAL_PLANS.map((name) => ({
    name,
    value: revByPlan[name],
  }));

  // --- Bar theo tháng
  const monthly = {};
  sessions.forEach((s) => {
    if ((s.status ?? s.Status) !== "Completed") return;

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
 * 4) BIỂU ĐỒ THỜI GIAN 7 NGÀY — sessions + revenue theo ngày
 * ========================================================= */
export const processTimeChartData = (rawData, filter = {}) => {
  const sessions = toArray(rawData?.sessionsData);
  const { startDate, endDate } = filter;

  // Lấy mốc cuối: ưu tiên endDate filter, fallback về hôm nay
  let end = endDate ? moment(endDate) : moment();
  if (!end.isValid()) end = moment();

  // Vẫn giữ 7 ngày, nhưng là 7 ngày kết thúc tại endDate
  const days = {};
  for (let i = 6; i >= 0; i--) {
    const d = end.clone().subtract(i, "days");
    const key = d.format("YYYY-MM-DD");
    days[key] = { day: weekdayVN(d), sessions: 0, revenue: 0 };
  }

  sessions.forEach((s) => {
    if ((s.status ?? s.Status) !== "Completed") return;
    const m = getSessionMoment(s);
    if (!m) return;
    const key = m.format("YYYY-MM-DD");
    if (!days[key]) return; // nằm ngoài 7 ngày thì bỏ
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
export const processTimeChartHourly = (rawData, filter = {}) => {
  const sessions = toArray(rawData?.sessionsData);
  const { endDate } = filter;

  let end = endDate ? moment(endDate) : moment();
  if (!end.isValid()) end = moment();

  const hourlyData = {};
  for (let i = 6; i >= 0; i--) {
    const d = end.clone().subtract(i, "days").format("YYYY-MM-DD");
    for (let h = 0; h < 24; h++) {
      hourlyData[`${d}-${h}`] = 0;
    }
  }

  sessions.forEach((s) => {
    if ((s.status ?? s.Status) !== "Completed") return;
    const m = getSessionMoment(s);
    if (!m) return;
    const key = `${m.format("YYYY-MM-DD")}-${m.hour()}`;
    if (hourlyData[key] !== undefined) hourlyData[key] += 1;
  });

  const result = Object.entries(hourlyData).map(([key, value]) => {
    const sep = key.lastIndexOf("-");
    const date = key.slice(0, sep); // "YYYY-MM-DD"
    const hour = parseInt(key.slice(sep + 1), 10); // 0..23
    return { date, hour, value };
  });

  if (DEBUG_MODE) console.log("[Hourly Heatmap] points:", result.length);
  return result;
};
