// src/utils/billingStats.js
import { fetchAuthJSON, getApiBase } from "./api";

function normalizeApiBase(s) {
  const raw = (s || "").trim();
  if (!raw) return "https://localhost:7268/api";
  return raw.replace(/\/+$/, "");
}
const API_ABS = normalizeApiBase(getApiBase()) || "https://localhost:7268/api";

// ===== pool limiter =====
async function runLimitedPool(items, limit, worker) {
  const out = new Array(items.length);
  let i = 0, running = 0;
  return await new Promise((resolve) => {
    const next = () => {
      if (i >= items.length && running === 0) return resolve(out);
      while (running < limit && i < items.length) {
        const idx = i++;
        running++;
        Promise.resolve(worker(items[idx], idx))
          .then((res) => { out[idx] = res; })
          .catch(() => { out[idx] = null; })
          .finally(() => { running--; next(); });
      }
    };
    next();
  });
}

// ===== sessions =====
function normalizeSession(s) {
  if (!s) return null;
  return {
    chargingSessionId: s.chargingSessionId ?? s.id ?? s.sessionId ?? null,
    energyKwh: Number(s.energyKwh ?? s.energyKWh ?? s.energy ?? 0) || 0,
    subtotal: Number(s.subtotal ?? s.sub_total ?? s.amountBeforeTax ?? 0) || 0,
    tax: Number(s.tax ?? s.vat ?? 0) || 0,
    total: Number(s.total ?? s.amount ?? 0) || 0,
    startedAt: s.startedAt ?? s.startTime ?? null,
    endedAt: s.endedAt ?? s.endTime ?? null,
    status: s.status ?? null,
    invoiceId: s.invoiceId ?? null,
  };
}

async function fetchSessionDetail(sessionId) {
  try {
    const r = await fetchAuthJSON(`${API_ABS}/ChargingSessions/${sessionId}`, { method: "GET" });
    return r?.data ?? r ?? null;
  } catch { return null; }
}

async function hydrateSessionsDetails(baseSessions) {
  const base = Array.isArray(baseSessions) ? baseSessions : [];
  const ids = base.map(s => s?.chargingSessionId).filter(Boolean);
  if (ids.length === 0) return base;
  const details = await runLimitedPool(ids, 6, (sid) => fetchSessionDetail(sid));
  const byId = new Map();
  details.forEach((d) => {
    if (!d) return;
    const norm = normalizeSession(d);
    if (norm?.chargingSessionId) byId.set(norm.chargingSessionId, norm);
  });
  return base.map((s) => byId.get(s.chargingSessionId) || s);
}

async function fetchAllPagesJson(urlBase, { startPage = 1, pageSize = 50, maxPages = 50 } = {}) {
  let page = startPage;
  const all = [];
  for (let i = 0; i < maxPages; i++) {
    const url = `${urlBase}${urlBase.includes("?") ? "&" : "?"}page=${page}&pageSize=${pageSize}`;
    const r = await fetchAuthJSON(url, { method: "GET" });
    const arr = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : (Array.isArray(r?.items) ? r.items : []));
    all.push(...arr);
    const total = Number(r?.total ?? r?.totalItems ?? 0);
    const size = Number(r?.pageSize ?? pageSize);
    const current = Number(r?.page ?? page);
    if (!total || !size) {
      if (arr.length < pageSize) break;
    } else {
      const maxPage = Math.max(1, Math.ceil(total / size));
      if (current >= maxPage) break;
    }
    page++;
  }
  return all;
}

export async function fetchInvoicesByCompany(companyId) {
  const res = await fetchAuthJSON(`${API_ABS}/Invoices/by-company/${companyId}`, { method: "GET" });
  return Array.isArray(res?.data) ? res.data : [];
}

export async function fetchSessionsForInvoice(invoiceId, context) {
  // 1) ưu tiên lấy từ /Invoices/{id}
  try {
    const r = await fetchAuthJSON(`${API_ABS}/Invoices/${invoiceId}`, { method: "GET" });
    const inv = r?.data ?? r ?? null;
    const sessions = Array.isArray(inv?.chargingSessions)
      ? inv.chargingSessions
      : Array.isArray(inv?.items) ? inv.items : null;
    if (sessions?.length) {
      const base = sessions.map(normalizeSession).filter(Boolean);
      return await hydrateSessionsDetails(base);
    }
  } catch {}

  // 2) /ChargingSessions/by-invoice/{id}
  try {
    const baseUrl = `${API_ABS}/ChargingSessions/by-invoice/${invoiceId}`;
    const all = await fetchAllPagesJson(baseUrl, { pageSize: 100 });
    if (all.length) {
      const base = all.map(normalizeSession).filter(Boolean);
      return await hydrateSessionsDetails(base);
    }
  } catch {}

  // 3) fallback theo customer + year/month
  const { customerId, billingYear, billingMonth } = context || {};
  if (customerId && billingYear && billingMonth) {
    try {
      const r3 = await fetchAuthJSON(
        `${API_ABS}/ChargingSessions/by-customer/${customerId}?year=${billingYear}&month=${billingMonth}`,
        { method: "GET" }
      );
      let arr = Array.isArray(r3?.data) ? r3.data : Array.isArray(r3) ? r3 : [];
      arr = arr.map(normalizeSession).filter(Boolean);
      if (arr.some((s) => s.invoiceId != null)) {
        arr = arr.filter((s) => String(s.invoiceId) === String(invoiceId));
      }
      return await hydrateSessionsDetails(arr);
    } catch {}
  }
  return [];
}

// ===== tính toán số liệu theo tháng
/**
 * Trả về:
 * - spendByMonth: [12] tổng tiền mỗi tháng (VND)
 * - kwhByMonth:   [12] tổng kWh mỗi tháng
 */
export async function buildMonthlyStats(companyId) {
  const invoices = await fetchInvoicesByCompany(companyId);
  const spendByMonth = Array(12).fill(0);
  const kwhByMonth = Array(12).fill(0);

  // cộng tiền theo tháng luôn (không cần gọi thêm)
  for (const inv of invoices) {
    const m = Number(inv?.billingMonth) || 0;
    const y = Number(inv?.billingYear) || 0;
    const total = Number(inv?.total) || 0;
    if (m >= 1 && m <= 12) spendByMonth[m - 1] += total;

    // gom kWh: cần phiên sạc
    // để nhẹ server: chỉ gọi sessions cho hóa đơn có tổng > 0 (tuỳ bạn, có thể bỏ điều kiện)
  }

  // gọi song song có giới hạn để lấy kWh
  const withIndex = invoices.map((x, i) => ({ i, x }));
  await runLimitedPool(withIndex, 5, async ({ x }) => {
    const m = Number(x?.billingMonth) || 0;
    if (!(m >= 1 && m <= 12)) return;
    const ctx = { customerId: x?.customerId, billingYear: x?.billingYear, billingMonth: x?.billingMonth };
    const sessions = await fetchSessionsForInvoice(x?.invoiceId ?? x?.id, ctx);
    const kwh = sessions.reduce((a, s) => a + (Number(s.energyKwh) || 0), 0);
    kwhByMonth[m - 1] += kwh;
  });

  return { invoices, spendByMonth, kwhByMonth };
}
