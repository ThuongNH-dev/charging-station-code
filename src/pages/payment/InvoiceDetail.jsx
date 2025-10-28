// src/pages/invoice/InvoiceDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
import { sortInvoicesDesc } from "../../utils/invoiceSort";
import "./style/InvoiceDetail.css";

const VND = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

function normalizeApiBase(s) {
  const raw = (s || "").trim();
  if (!raw) return "https://localhost:7268/api";
  return raw.replace(/\/+$/, "");
}
const API_ABS = normalizeApiBase(getApiBase()) || "https://localhost:7268/api";

function isPaidOrConfirmed(raw) {
  if (!raw || typeof raw !== "object") return false;
  const paid = raw.isPaid ?? raw.paid ?? raw.IsPaid;
  if (paid === true || paid === "true" || paid === 1) return true;
  const st = String(raw.status ?? raw.Status ?? "").toLowerCase();
  if (["paid", "completed", "confirmed", "success"].includes(st)) return true;
  const paymentStatus = String(raw.paymentStatus ?? raw.PaymentStatus ?? "").toLowerCase();
  if (["paid", "success", "completed"].includes(paymentStatus)) return true;
  return false;
}

async function fetchInvoiceById(id) {
  const res = await fetchAuthJSON(`${API_ABS}/Invoices/${id}`, { method: "GET" });
  return res?.data ?? res ?? null;
}

async function pollInvoicePaid(invoiceId, { timeoutMs = 300000, stepMs = 2500 } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const inv = await fetchInvoiceById(invoiceId);
      if (isPaidOrConfirmed(inv)) return { ok: true, data: inv };
    } catch { }
    await new Promise((r) => setTimeout(r, stepMs));
  }
  return { ok: false };
}

// ===== helpers =====
const pillClass = (status) => {
  const s = String(status || "").toLowerCase().trim();
  if (/(^|[^a-z])overdue([^a-z]|$)/.test(s)) return "pill danger";
  if (/(^|[^a-z])unpaid([^a-z]|$)/.test(s)) return "pill warn";
  if (/(^|[^a-z])paid([^a-z]|$)/.test(s)) return "pill ok";
  if (/(^|[^a-z])active([^a-z]|$)/.test(s)) return "pill ok";
  if (/(^|[^a-z])cancel(l)?ed?([^a-z]|$)/.test(s)) return "pill danger";
  return "pill";
};

// ---- Subscription normalize (format 199,000 đ nếu BE trả 199) ----
function normalizeSubscription(s) {
  if (!s) return null;
  const plan = s.subscriptionPlan || {};
  const rawPrice = Number(plan.priceMonthly ?? s.priceMonthly ?? 0) || 0;
  const priceMonthly = rawPrice >= 1000 ? rawPrice : rawPrice * 1000;

  return {
    subscriptionId: s.subscriptionId ?? s.id ?? null,
    planId: s.subscriptionPlanId ?? plan.subscriptionPlanId ?? null,
    planName: plan.planName ?? s.planName ?? null,
    planCategory: plan.category ?? null,
    priceMonthly,
    discountPercent: Number(plan.discountPercent ?? s.discountPercent ?? 0) || 0,
    freeIdleMinutes: Number(plan.freeIdleMinutes ?? s.freeIdleMinutes ?? 0) || 0,
    benefits: plan.benefits ?? null,
    isForCompany: !!plan.isForCompany,
    billingCycle: s.billingCycle ?? null,
    autoRenew: !!s.autoRenew,
    startDate: s.startDate ?? null,
    endDate: s.endDate ?? s.nextBillingDate ?? null,
    nextBillingDate: s.nextBillingDate ?? s.endDate ?? null,
    status: s.status ?? null,
  };
}

// >>> Quy tắc chọn loại invoice: ưu tiên Charging nếu có sessions
function pickInvoiceType(inv) {
  const hasSessions = Array.isArray(inv?.chargingSessions) && inv.chargingSessions.length > 0;
  if (hasSessions) return "charging";
  const sub = inv?.subscription;
  const hasSub =
    !!(inv?.subscriptionId || inv?.isMonthlyInvoice) ||
    !!(sub && (sub.subscriptionId || sub.subscriptionPlanId || sub.planName));
  return hasSub ? "subscription" : "charging";
}

function normalizeSession(s) {
  if (!s) return null;
  return {
    chargingSessionId: s.chargingSessionId ?? s.id ?? s.sessionId ?? null,
    vehicleId: s.vehicleId ?? null,
    portId: s.portId ?? s.connectorId ?? null,
    startedAt: s.startedAt ?? s.startTime ?? null,
    endedAt: s.endedAt ?? s.endTime ?? null,
    durationMin: Number(s.durationMin ?? s.duration ?? s.durationMinutes ?? 0) || 0,
    idleMin: Number(s.idleMin ?? s.idleMinutes ?? 0) || 0,
    startSoc: s.startSoc ?? s.startSoC ?? s.socStart ?? null,
    endSoc: s.endSoc ?? s.endSoC ?? s.socEnd ?? null,
    energyKwh: Number(s.energyKwh ?? s.energyKWh ?? s.energy ?? 0) || 0,
    subtotal: Number(s.subtotal ?? s.sub_total ?? s.amountBeforeTax ?? 0) || 0,
    tax: Number(s.tax ?? s.vat ?? 0) || 0,
    total: Number(s.total ?? s.amount ?? 0) || 0,
    status: s.status ?? null,
    invoiceId: s.invoiceId ?? null,
  };
}

// ==== NEW: helper gọi chi tiết phiên & pool giới hạn song song ====
async function fetchSessionDetail(sessionId) {
  try {
    const r = await fetchAuthJSON(`${API_ABS}/ChargingSessions/${sessionId}`, { method: "GET" });
    // BE có thể bọc trong { data: {...} } hoặc trả trực tiếp object
    return r?.data ?? r ?? null;
  } catch {
    return null;
  }
}

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

/**
 * Hydrate danh sách sessions bằng /ChargingSessions/{id}
 * - Giữ lại các field đã có, điền/chèn các field thiếu từ detail.
 * - Ưu tiên dữ liệu từ detail (vì là nguồn “đủ” nhất).
 */
async function hydrateSessionsDetails(baseSessions) {
  const base = Array.isArray(baseSessions) ? baseSessions : [];
  const ids = base.map(s => s?.chargingSessionId).filter(Boolean);
  if (ids.length === 0) return base;

  // gọi chi tiết theo pool để tránh dội server
  const details = await runLimitedPool(ids, 6, (sid) => fetchSessionDetail(sid));

  const byId = new Map();
  details.forEach((d) => {
    if (!d) return;
    const norm = normalizeSession(d); // tận dụng mapper đã có
    if (norm?.chargingSessionId) byId.set(norm.chargingSessionId, norm);
  });

  // merge: detail > base
  return base.map((s) => {
    const d = byId.get(s.chargingSessionId);
    if (!d) return s; // không có detail thì giữ nguyên
    return {
      ...s,
      // time
      startedAt: d.startedAt ?? s.startedAt ?? null,
      endedAt: d.endedAt ?? s.endedAt ?? null,
      durationMin: (d.durationMin ?? s.durationMin) ?? 0,
      idleMin: (d.idleMin ?? s.idleMin) ?? 0,
      // energy & SoC
      energyKwh: (d.energyKwh ?? s.energyKwh) ?? 0,
      startSoc: d.startSoc ?? s.startSoc ?? null,
      endSoc: d.endSoc ?? s.endSoc ?? null,
      // money
      subtotal: (d.subtotal ?? s.subtotal) ?? 0,
      tax: (d.tax ?? s.tax) ?? 0,
      total: (d.total ?? s.total) ?? 0,
      // others
      status: d.status ?? s.status ?? null,
      vehicleId: d.vehicleId ?? s.vehicleId ?? null,
      portId: d.portId ?? s.portId ?? null,
    };
  });
}

async function fetchSessionsForInvoice(invoiceId, context) {
  // 1) Thử lấy sessions từ /Invoices/{id}
  try {
    const r = await fetchAuthJSON(`${API_ABS}/Invoices/${invoiceId}`, { method: "GET" });
    const inv = r?.data ?? r ?? null;
    const sessions = Array.isArray(inv?.chargingSessions)
      ? inv.chargingSessions
      : Array.isArray(inv?.items)
        ? inv.items
        : null;

    if (sessions?.length) {
      const base = sessions.map(normalizeSession).filter(Boolean);
      const hydrated = await hydrateSessionsDetails(base);     // <--- NEW
      return hydrated;
    }
  } catch { }

  // 2) Thử /ChargingSessions/by-invoice/{id} (LẤY HẾT TRANG)
  try {
    const baseUrl = `${API_ABS}/ChargingSessions/by-invoice/${invoiceId}`;
    const all = await fetchAllPagesJson(baseUrl, { pageSize: 100 });
    if (all.length) {
      const base = all.map(normalizeSession).filter(Boolean);
      const hydrated = await hydrateSessionsDetails(base); // giữ như bạn đã thêm
      return hydrated;
    }
  } catch { }


  // 3) Fall back theo customer + month/year (nếu có)
  const { customerId, billingYear, billingMonth } = context || {};
  if (customerId && billingYear && billingMonth) {
    try {
      const r3 = await fetchAuthJSON(
        `${API_ABS}/ChargingSessions/by-customer/${customerId}?year=${billingYear}&month=${billingMonth}`,
        { method: "GET" }
      );
      let arr = Array.isArray(r3?.data) ? r3.data : Array.isArray(r3) ? r3 : [];
      arr = arr.map(normalizeSession).filter(Boolean);

      // Nếu có trường invoiceId thì lọc đúng hóa đơn
      if (arr.some((s) => s.invoiceId != null)) {
        arr = arr.filter((s) => String(s.invoiceId) === String(invoiceId));
      }

      const hydrated = await hydrateSessionsDetails(arr);      // <--- NEW
      return hydrated;
    } catch { }
  }

  // 4) Không có gì
  return [];
}

// đặt gần các API helpers khác
async function fetchAllPagesJson(urlBase, { startPage = 1, pageSize = 50, maxPages = 100 } = {}) {
  let page = startPage;
  const all = [];
  for (let i = 0; i < maxPages; i++) {
    const url = `${urlBase}${urlBase.includes('?') ? '&' : '?'}page=${page}&pageSize=${pageSize}`;
    const r = await fetchAuthJSON(url, { method: "GET" });

    // Chuẩn hóa mảng items
    const arr = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : (Array.isArray(r?.items) ? r.items : []));
    all.push(...arr);

    // Thoát vòng nếu không rõ total, hoặc đã hết
    const total = Number(r?.total ?? r?.totalItems ?? 0);
    const size = Number(r?.pageSize ?? pageSize);
    const current = Number(r?.page ?? page);
    if (!total || !size) {
      if (arr.length < pageSize) break; // không phải API chuẩn → dừng khi thiếu trang
    } else {
      const maxPage = Math.max(1, Math.ceil(total / size));
      if (current >= maxPage) break;
    }
    page++;
  }
  return all;
}



// small utils
const inventorySafe = (arr) => (Array.isArray(arr) ? arr : []);
const parseDate = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};
const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const buildPages = (total, current, window = 2) => {
  if (total <= 1) return [1];
  const set = new Set([1, total]);
  for (let i = current - window; i <= current + window; i++) {
    if (i >= 1 && i <= total) set.add(i);
  }
  const arr = [...set].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    out.push(arr[i]);
    if (i < arr.length - 1 && arr[i + 1] - arr[i] > 1) out.push("...");
  }
  return out;
};

// ==== Sub date helpers ====
const toDateOrNull = (v) => {
  try {
    return v ? new Date(v) : null;
  } catch {
    return null;
  }
};

const addBillingCycle = (d, cycle = "Monthly") => {
  if (!d) return null;
  const x = new Date(d);
  const c = String(cycle || "").toLowerCase();
  if (c === "weekly") {
    x.setDate(x.getDate() + 7);
    return x;
  }
  if (c === "yearly" || c === "annually") {
    x.setFullYear(x.getFullYear() + 1);
    return x;
  }
  x.setMonth(x.getMonth() + 1);
  return x;
};

const guessStartFromInvoice = (inv) => {
  const y = Number(inv?.billingYear),
    m = Number(inv?.billingMonth);
  if (y && m) return new Date(y, m - 1, 1, 0, 0, 0, 0);
  return inv?.createdAt ? new Date(inv.createdAt) : null;
};

const computeSubscriptionDates = (sub, inv) => {
  const cycle = sub?.billingCycle || "Monthly";
  const start = toDateOrNull(sub?.startDate) || guessStartFromInvoice(inv);
  const beEnd = toDateOrNull(sub?.endDate);
  const beNext = toDateOrNull(sub?.nextBillingDate);

  let endDate = beEnd;
  let nextBillingDate = beNext;
  let isEndEstimated = false;

  if (!endDate) {
    const calc = addBillingCycle(start, cycle);
    if (calc) {
      endDate = calc;
      isEndEstimated = true;
    }
  }
  if (!nextBillingDate) {
    nextBillingDate = endDate ? new Date(endDate) : null;
  }
  return { endDate, nextBillingDate, isEndEstimated };
};

export default function InvoiceDetail() {
  const { state } = useLocation();
  const { invoiceId: invoiceIdParam } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [invoice, setInvoice] = useState(null);

  // id mục tiêu
  const targetId = useMemo(() => {
    return state?.invoiceId || invoiceIdParam || state?.invoice?.id || null;
  }, [state?.invoiceId, invoiceIdParam, state?.invoice?.id]);

  // load nhanh từ state/sessionStorage
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (state?.invoice && mounted) {
          setInvoice(state.invoice);
        } else {
          const raw = sessionStorage.getItem("charge:billing:list");
          if (raw) {
            let list = JSON.parse(raw);
            if (Array.isArray(list)) {
              // sort phòng trường hợp cache cũ chưa sắp xếp
              list = sortInvoicesDesc(list);
              const found = list.find((i, idx) => {
                const id = i?.id || `${i?.billingYear}-${i?.billingMonth}-${idx}`;
                return id?.toString() === targetId?.toString();
              });
              if (found && mounted) setInvoice(found);
            }
          }
        }
      } catch { }
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [state?.invoice, targetId]);

  // lấy dữ liệu mới nhất + sessions/subscription
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!targetId) return;
      setLoading(true);
      setErr("");
      try {
        const resInv = await fetchAuthJSON(`${API_ABS}/Invoices/${targetId}`, { method: "GET" });
        const latest = resInv?.data ?? resInv ?? (invoice ?? state?.invoice ?? null);
        if (!latest) throw new Error("Không tải được chi tiết hóa đơn.");

        const invoiceType = pickInvoiceType(latest);

        let sessions = [];
        let subscriptionNormalized = null;
        let subDateHints = { endDate: null, nextBillingDate: null, isEndEstimated: false };

        if (invoiceType === "subscription") {
          subscriptionNormalized = normalizeSubscription(
            latest.subscription || (latest.customer?.subscriptions?.[0]) || null
          );
          const dates = computeSubscriptionDates(subscriptionNormalized, latest);
          subDateHints = dates;
          if (!subscriptionNormalized.endDate && dates.endDate) {
            subscriptionNormalized.endDate = dates.endDate.toISOString();
          }
          if (!subscriptionNormalized.nextBillingDate && dates.nextBillingDate) {
            subscriptionNormalized.nextBillingDate = dates.nextBillingDate.toISOString();
          }
        } else {
          sessions = await fetchSessionsForInvoice(latest?.invoiceId ?? latest?.id ?? targetId, {
            customerId: latest?.customerId ?? invoice?.customerId ?? null,
            billingMonth: latest?.billingMonth ?? invoice?.billingMonth ?? null,
            billingYear: latest?.billingYear ?? invoice?.billingYear ?? null,
          });
        }

        const safeId = latest?.invoiceId?.toString?.() || latest?.id || targetId;

        if (mounted) {
          setInvoice((prev) => ({
            ...prev,
            ...latest,

            // normalize field dùng trong UI
            id: safeId,
            invoiceId: latest?.invoiceId ?? safeId,
            total: Number(latest?.total) || 0,
            subtotal: Number(latest?.subtotal) || 0,
            tax: Number(latest?.tax) || 0,
            subscriptionAdjustment: Number(latest?.subscriptionAdjustment ?? 0) || 0,
            isMonthlyInvoice: !!latest?.isMonthlyInvoice,

            // loại invoice + dữ liệu sub/sessions
            invoiceType,
            subscriptionId: latest?.subscriptionId ?? null,
            subscription: subscriptionNormalized,
            subscriptionDates: {
              endDateEstimated: subDateHints?.isEndEstimated || false,
            },
            chargingSessions: sessions,
          }));
        }
      } catch (e) {
        if (mounted) setErr(e?.message || "Không tải được chi tiết hóa đơn.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, state?.invoice]);

  // ===== compute =====
  const isSub = invoice?.invoiceType === "subscription";
  const sessions = inventorySafe(invoice?.chargingSessions);

  // Charging totals
  const subtotalCharging = sessions.reduce((a, s) => a + (Number(s.subtotal) || 0), 0);
  const taxCharging = sessions.reduce((a, s) => a + (Number(s.tax) || 0), 0);
  const totalCharging = sessions.reduce((a, s) => a + (Number(s.total) || 0), 0);
  const mismatchCharging = Math.abs(totalCharging - (Number(invoice?.total) || 0)) > 1;

  // Subscription totals
  const subtotalSub = Number(invoice?.subtotal) || 0;
  const taxSub = Number(invoice?.tax) || 0;
  const adjustSub = Number(invoice?.subscriptionAdjustment ?? 0) || 0;
  const totalSub = Number(invoice?.total) || (subtotalSub + taxSub + adjustSub);

  const customer = invoice?.customer || null;

  // ===== filter + pagination for sessions =====
  const [sessStatus, setSessStatus] = useState("all");
  const [timeField, setTimeField] = useState("endedAt");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredSessions = useMemo(() => {
    let arr = sessions.slice();

    // 1) Lọc theo trạng thái
    if (sessStatus !== "all") {
      arr = arr.filter((s) => {
        const v = String(s.status || "").toLowerCase();
        if (sessStatus === "completed") return v.includes("completed");
        if (sessStatus === "charging") return v.includes("charging");
        if (sessStatus === "failed") return v.includes("fail");
        if (sessStatus === "canceled") return v.includes("cancel");
        return true;
      });
    }

    // 2) Lọc theo khoảng ngày theo field đang chọn
    const dFrom = parseDate(from);
    const dTo = to ? endOfDay(parseDate(to)) : null;
    if (dFrom || dTo) {
      arr = arr.filter((s) => {
        // Ưu tiên field đang chọn; nếu null thì fallback qua field còn lại
        const primary = s?.[timeField];
        const fallbackField = timeField === "startedAt" ? "endedAt" : "startedAt";
        const t = primary ?? s?.[fallbackField];
        if (!t) return false;
        const d = new Date(t);
        if (dFrom && d < dFrom) return false;
        if (dTo && d > dTo) return false;
        return true;
      });
    }

    // 3) SẮP XẾP MỚI → CŨ
    arr.sort((a, b) => {
      // Lấy timestamp theo field đang chọn, nếu trống thì fallback
      const fallbackField = timeField === "startedAt" ? "endedAt" : "startedAt";
      const ta = a?.[timeField] ? new Date(a[timeField]).getTime()
        : a?.[fallbackField] ? new Date(a[fallbackField]).getTime()
          : 0;
      const tb = b?.[timeField] ? new Date(b[timeField]).getTime()
        : b?.[fallbackField] ? new Date(b[fallbackField]).getTime()
          : 0;

      if (tb !== ta) return tb - ta; // desc theo thời gian

      // Tie-breaker: ưu tiên phiên có id lớn hơn (có xu hướng mới hơn)
      const ida = Number(a.chargingSessionId ?? 0);
      const idb = Number(b.chargingSessionId ?? 0);
      return idb - ida;
    });

    return arr;
  }, [sessions, sessStatus, timeField, from, to]);


  useEffect(() => {
    setPage(1);
  }, [sessStatus, timeField, from, to]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = filteredSessions.slice(start, start + pageSize);
  const pageList = buildPages(totalPages, page, 2);

  // ===== render states =====
  if (!targetId && !loading) {
    return (
      <MainLayout>
        <div style={{ padding: 24 }}>
          <div className="warn">Không xác định được hóa đơn.</div>
          <div style={{ marginTop: 12 }}>
            <Link to="/invoice">Quay lại danh sách</Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <div style={{ padding: 24 }}>Đang tải chi tiết hóa đơn…</div>
      </MainLayout>
    );
  }

  if (err || !invoice) {
    return (
      <MainLayout>
        <div style={{ padding: 24 }}>
          <div className="warn">{err || "Không tìm thấy hóa đơn."}</div>
          <div style={{ marginTop: 12 }}>
            <Link to="/invoice">Quay lại danh sách</Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="ivd-root">
        {/* ===== Breadcrumb ===== */}
        <nav className="crumbs" aria-label="breadcrumb">
          <Link to="/invoiceSummary" className="crumb">
            Hóa đơn
          </Link>
          <span className="sep">/</span>
          <span className="crumb current">
            Kỳ {invoice.billingMonth}/{invoice.billingYear}
          </span>
        </nav>

        {/* Header actions */}
        <div className="ivp-topbar">
          <h2>
            Chi tiết hóa đơn {invoice.billingMonth}/{invoice.billingYear}
          </h2>
          <div className="actions">
            <button
              onClick={() =>
                navigate("/payment", {
                  state: {
                    from: "invoice-detail",
                    invoiceId: Number(invoice.invoiceId ?? invoice.id),
                    companyId: invoice.companyId ?? state?.companyId ?? null,
                    presetAmount: Number(invoice.total) || undefined,
                  },
                })
              }
              className="btn primary"
            >
              Thanh toán
            </button>
            <button onClick={() => window.print()} className="btn ghost">
              In hóa đơn
            </button>
          </div>
        </div>

        {/* Customer box */}
        <div className="ivp-card ivp-customer">
          <div className="ivp-head">
            <h3>Khách hàng: {customer?.fullName || `#${invoice.customerId || "—"}`}</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <span className={pillClass(invoice.status)}>{invoice.status || "—"}</span>
              <span className="pill">{isSub ? "Subscription" : "Charging"}</span>
            </div>
          </div>
          <div className="ivp-meta">
            {customer?.phone && (
              <div>
                Điện thoại: <b>{customer.phone}</b>
              </div>
            )}
            <div>
              Kỳ: <b>{invoice.billingMonth}/{invoice.billingYear}</b>
            </div>
            <div>
              Tạo lúc:{" "}
              <b>{invoice.createdAt ? new Date(invoice.createdAt).toLocaleString("vi-VN") : "—"}</b>
            </div>
            <div>
              Cập nhật:{" "}
              <b>{invoice.updatedAt ? new Date(invoice.updatedAt).toLocaleString("vi-VN") : "—"}</b>
            </div>
          </div>
          <div className="invoice-sum">
            Tổng hóa đơn: <b>{VND(invoice.total)}</b>
          </div>
        </div>

        {/* Subscription block */}
        {isSub && (
          <div className="ivp-card ivp-subscription">
            <div className="ivp-head">
              <h3>Thông tin gói Subscription</h3>
            </div>

            <div className="ivp-meta" style={{ display: "flex", flexWrap: "wrap", gap: "18px 28px" }}>
              <div>
                Gói: <b>{invoice?.subscription?.planName || "—"}</b>{" "}
                ({invoice?.subscription?.planCategory || "—"})
              </div>
              <div>
                Chu kỳ: <b>{invoice?.subscription?.billingCycle || "—"}</b>{" "}
                {invoice?.subscription?.autoRenew ? "(Tự gia hạn)" : ""}
              </div>
              <div>
                Giá tháng:{" "}
                <b>{invoice?.subscription?.priceMonthly ? VND(invoice.subscription.priceMonthly) : "—"}</b>
              </div>
              <div>
                Bắt đầu:{" "}
                <b>
                  {invoice?.subscription?.startDate
                    ? new Date(invoice.subscription.startDate).toLocaleString("vi-VN")
                    : "—"}
                </b>
              </div>
              <div>
                Hết hạn:{" "}
                <b>
                  {invoice?.subscription?.endDate
                    ? new Date(invoice.subscription.endDate).toLocaleString("vi-VN")
                    : "—"}
                </b>
                {!invoice?.subscription?.endDate && invoice?.subscriptionDates?.endDateEstimated
                  ? " (dự kiến)"
                  : ""}
              </div>
              {invoice?.subscription?.discountPercent ? (
                <div>
                  Ưu đãi: <b>{invoice.subscription.discountPercent}%</b>
                </div>
              ) : null}
              {invoice?.subscription?.freeIdleMinutes ? (
                <div>
                  Free idle: <b>{invoice.subscription.freeIdleMinutes} phút</b>
                </div>
              ) : null}
            </div>

            <div className="invoice-sum" style={{ marginTop: "10px" }}>
              Tổng hóa đơn: <b>{VND(totalSub)}</b>
            </div>
          </div>
        )}

        {/* Charging table */}
        {!isSub && (
          <>
            <div className="filters">
              <select value={sessStatus} onChange={(e) => setSessStatus(e.target.value)}>
                <option value="all">Tất cả phiên</option>
                <option value="completed">Hoàn tất</option>
                <option value="charging">Đang sạc</option>
                <option value="failed">Thất bại</option>
                <option value="canceled">Hủy</option>
              </select>

              <div className="datefilter">
                <select className="df-field" value={timeField} onChange={(e) => setTimeField(e.target.value)}>
                  <option value="startedAt">Bắt đầu</option>
                  <option value="endedAt">Kết thúc</option>
                </select>
                <input className="df-date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                <span className="df-sep">—</span>
                <input
                  className="df-date"
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                />
                {(from || to) && (
                  <button
                    className="df-clear"
                    title="Xóa lọc ngày"
                    onClick={() => {
                      setFrom("");
                      setTo("");
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <section className="ivp-card print-page">
              <table className="ivp-table">
                <thead>
                  <tr>
                    <th>Mã HĐ</th>
                    <th>Xe</th>
                    <th>Cổng</th>
                    <th>Thời gian</th>
                    <th>SoC</th>
                    <th className="right">Năng lượng</th>
                    <th className="right">Phí trước thuế</th>
                    <th className="right">Thuế</th>
                    <th className="right">Tổng</th>
                    <th className="right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 && (
                    <tr>
                      <td colSpan={10} className="center">
                        Không có phiên nào khớp bộ lọc.
                      </td>
                    </tr>
                  )}
                  {pageItems.map((s, i) => (
                    <tr key={s.chargingSessionId || i}>
                      <td>{s.chargingSessionId ?? "—"}</td>
                      <td>{s.vehicleId ?? "—"}</td>
                      <td>{s.portId ?? "—"}</td>
                      <td>
                        <div>Bắt đầu: {s.startedAt ? new Date(s.startedAt).toLocaleString("vi-VN") : "—"}</div>
                        <div>Kết thúc: {s.endedAt ? new Date(s.endedAt).toLocaleString("vi-VN") : "—"}</div>
                        <div>Thời lượng: {(Number(s.durationMin) || 0)} phút</div>
                        <div>Idle: {(Number(s.idleMin) || 0)} phút</div>
                      </td>
                      <td>
                        {s.startSoc ?? "—"}% → {s.endSoc ?? "—"}%
                      </td>
                      <td className="right">{(Number(s.energyKwh) || 0).toLocaleString("vi-VN")} kWh</td>
                      <td className="right">{VND(s.subtotal)}</td>
                      <td className="right">{VND(s.tax)}</td>
                      <td className="right">
                        <b>{VND(s.total)}</b>
                      </td>
                      <td className="right">
                        <span className={pillClass(s.status)}>{s.status || "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6}>
                      <b>Tổng Cộng</b>
                    </td>
                    <td className="right">{VND(subtotalCharging)}</td>
                    <td className="right">{VND(taxCharging)}</td>
                    <td className="right">
                      <b>{VND(totalCharging)}</b>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>

              {mismatchCharging && (
                <div className="ivp-note">
                  Tổng các phiên ({VND(totalCharging)}) khác tổng BE ({VND(invoice.total)}).
                </div>
              )}
            </section>

            {filteredSessions.length > 0 && (
              <>
                <div className="bp-hint">
                  Đang hiển thị {Math.min(filteredSessions.length, start + 1)}–
                  {Math.min(filteredSessions.length, start + pageItems.length)} / {filteredSessions.length} phiên
                </div>
                <nav className="bp-breadcrumbs" aria-label="Phân trang">
                  <button
                    className="bp-breadcrumb nav"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ← Trước
                  </button>

                  {pageList.map((p, i) =>
                    p === "..." ? (
                      <span key={`e${i}`} className="bp-ellipsis">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        className={`bp-breadcrumb ${p === page ? "active" : ""}`}
                        onClick={() => setPage(p)}
                        disabled={p === page}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    className="bp-breadcrumb nav"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Sau →
                  </button>
                </nav>
              </>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
