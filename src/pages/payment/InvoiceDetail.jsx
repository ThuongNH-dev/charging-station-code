// src/pages/invoice/InvoiceDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
import "./style/InvoiceDetail.css";


const VND = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

function normalizeApiBase(s) {
  const raw = (s || "").trim();
  if (!raw) return "https://localhost:7268/api";
  return raw.replace(/\/+$/, "");
}
const API_ABS = normalizeApiBase(getApiBase()) || "https://localhost:7268/api";

function toUrlString(val) {
  if (!val) return "";
  const s = typeof val === "string" ? val : (val.result ?? val.url ?? val.href ?? "");
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  try { return new URL(s, window.location.origin).toString(); } catch { return ""; }
}

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
    await new Promise(r => setTimeout(r, stepMs));
  }
  return { ok: false };
}


// ===== helpers =====
const pillClass = (status) => {
  const s = String(status || "").toLowerCase().trim();
  if (/(^|[^a-z])overdue([^a-z]|$)/.test(s)) return "pill danger";
  if (/(^|[^a-z])unpaid([^a-z]|$)/.test(s)) return "pill warn";
  if (/(^|[^a-z])paid([^a-z]|$)/.test(s)) return "pill ok";
  return "pill";
};

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

async function fetchSessionsForInvoice(invoiceId, context) {
  try {
    const r = await fetchAuthJSON(`${API_ABS}/Invoices/${invoiceId}`, { method: "GET" });
    const inv = r?.data ?? r ?? null;
    const sessions = Array.isArray(inv?.chargingSessions) ? inv.chargingSessions
      : Array.isArray(inv?.items) ? inv.items : null;
    if (sessions?.length) return sessions.map(normalizeSession).filter(Boolean);
  } catch { }

  try {
    const r2 = await fetchAuthJSON(`${API_ABS}/ChargingSessions/by-invoice/${invoiceId}`, { method: "GET" });
    const arr = Array.isArray(r2?.data) ? r2.data : Array.isArray(r2) ? r2 : [];
    if (arr.length) return arr.map(normalizeSession).filter(Boolean);
  } catch { }

  const { customerId, billingYear, billingMonth } = context || {};
  if (customerId && billingYear && billingMonth) {
    try {
      const r3 = await fetchAuthJSON(
        `${API_ABS}/ChargingSessions/by-customer/${customerId}?year=${billingYear}&month=${billingMonth}`,
        { method: "GET" }
      );
      let arr = Array.isArray(r3?.data) ? r3.data : Array.isArray(r3) ? r3 : [];
      arr = arr.map(normalizeSession).filter(Boolean);
      if (arr.some(s => s.invoiceId != null)) {
        arr = arr.filter(s => String(s.invoiceId) === String(invoiceId));
      }
      return arr;
    } catch { }
  }
  return [];
}

// small utils
const inventorySafe = (arr) => (Array.isArray(arr) ? arr : []);
const parseDate = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const buildPages = (total, current, window = 2) => {
  if (total <= 1) return [1];
  const set = new Set([1, total]);
  for (let i = current - window; i <= current + window; i++) { if (i >= 1 && i <= total) set.add(i); }
  const arr = [...set].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < arr.length; i++) { out.push(arr[i]); if (i < arr.length - 1 && arr[i + 1] - arr[i] > 1) out.push("..."); }
  return out;
};

export default function InvoiceDetail() {
  const { state } = useLocation();
  const { invoiceId: invoiceIdParam } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [invoice, setInvoice] = useState(null);

  // ===== filters for sessions =====
  const [sessStatus, setSessStatus] = useState("all");     // all | completed | charging | failed | canceled
  const [timeField, setTimeField] = useState("startedAt"); // startedAt | endedAt
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

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
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
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
    return () => { mounted = false; };
  }, [state?.invoice, targetId]);

  // lấy dữ liệu mới nhất + sessions
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!targetId) return;
      setLoading(true); setErr("");
      try {
        let latest = null;
        const resInv = await fetchAuthJSON(`${API_ABS}/Invoices/${targetId}`, { method: "GET" });
        latest = resInv?.data ?? resInv ?? (invoice ?? state?.invoice ?? null);
        if (!latest) throw new Error("Không tải được chi tiết hóa đơn.");

        const sessions = await fetchSessionsForInvoice(
          latest?.invoiceId ?? latest?.id ?? targetId,
          {
            customerId: latest?.customerId ?? invoice?.customerId ?? null,
            billingMonth: latest?.billingMonth ?? invoice?.billingMonth ?? null,
            billingYear: latest?.billingYear ?? invoice?.billingYear ?? null,
          }
        );

        const safeId = latest?.invoiceId?.toString?.() || latest?.id || targetId;
        if (mounted) {
          setInvoice({
            id: safeId,
            invoiceId: latest?.invoiceId ?? safeId,
            billingMonth: latest?.billingMonth,
            billingYear: latest?.billingYear,
            total: Number(latest?.total) || 0,
            status: latest?.status,
            createdAt: latest?.createdAt,
            updatedAt: latest?.updatedAt,
            customerId: latest?.customerId ?? null,
            customer: latest?.customer ?? null,
            chargingSessions: sessions,
          });
        }
      } catch (e) {
        if (mounted) setErr(e?.message || "Không tải được chi tiết hóa đơn.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, state?.invoice]);

  // ===== compute like old page =====
  const sessions = inventorySafe(invoice?.chargingSessions);
  const subtotal = sessions.reduce((a, s) => a + (Number(s.subtotal) || 0), 0);
  const tax = sessions.reduce((a, s) => a + (Number(s.tax) || 0), 0);
  const total = sessions.reduce((a, s) => a + (Number(s.total) || 0), 0);
  const mismatch = Math.abs(total - (Number(invoice?.total) || 0)) > 1;
  const customer = invoice?.customer || null;

  // ===== filter + pagination for sessions =====
  const filteredSessions = useMemo(() => {
    let arr = sessions.slice();

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

    const dFrom = parseDate(from);
    const dTo = to ? endOfDay(parseDate(to)) : null;

    if (dFrom || dTo) {
      arr = arr.filter((s) => {
        const t = s[timeField];
        if (!t) return false;
        const d = new Date(t);
        if (dFrom && d < dFrom) return false;
        if (dTo && d > dTo) return false;
        return true;
      });
    }

    return arr;
  }, [sessions, sessStatus, timeField, from, to]);

  useEffect(() => { setPage(1); }, [sessStatus, timeField, from, to]);

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
          <div style={{ marginTop: 12 }}><Link to="/invoice">Quay lại danh sách</Link></div>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return <MainLayout><div style={{ padding: 24 }}>Đang tải chi tiết hóa đơn…</div></MainLayout>;
  }

  if (err || !invoice) {
    return (
      <MainLayout>
        <div style={{ padding: 24 }}>
          <div className="warn">{err || "Không tìm thấy hóa đơn."}</div>
          <div style={{ marginTop: 12 }}><Link to="/invoice">Quay lại danh sách</Link></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="ivd-root">
        {/* ===== Breadcrumb ===== */}
        <nav className="crumbs" aria-label="breadcrumb">
          <Link to="/invoiceSummary" className="crumb">Hóa đơn</Link>
          <span className="sep">/</span>
          <span className="crumb current">Kỳ {invoice.billingMonth}/{invoice.billingYear}</span>
        </nav>

        {/* Header actions */}
        <div className="ivp-topbar">
          <h2>Chi tiết hóa đơn {invoice.billingMonth}/{invoice.billingYear}</h2>
          <div className="actions">
            <button
              onClick={() => navigate("/payment", {
                state: {
                  from: "invoice-detail",
                  invoiceId: Number(invoice.invoiceId ?? invoice.id),
                  companyId: invoice.companyId ?? state?.companyId ?? null,
                  // để PaymentPage hiển thị tức thời, BE vẫn là source of truth:
                  presetAmount: Number(invoice.total) || undefined,
                },
              })}
              className="btn primary"
            >
              Thanh toán
            </button>
            <button onClick={() => window.print()} className="btn ghost">In hóa đơn</button>
          </div>
        </div>

        {/* Customer box */}
        <div className="ivp-card ivp-customer">
          <div className="ivp-head">
            <h3>Khách hàng: {customer?.fullName || `#${invoice.customerId || "—"}`}</h3>
            <span className={pillClass(invoice.status)}>{invoice.status || "—"}</span>
          </div>
          <div className="ivp-meta">
            {customer?.phone && <div>Điện thoại: <b>{customer.phone}</b></div>}
            <div>Kỳ: <b>{invoice.billingMonth}/{invoice.billingYear}</b></div>
            <div>Tạo lúc: <b>{invoice.createdAt ? new Date(invoice.createdAt).toLocaleString("vi-VN") : "—"}</b></div>
            <div>Cập nhật: <b>{invoice.updatedAt ? new Date(invoice.updatedAt).toLocaleString("vi-VN") : "—"}</b></div>
          </div>
          <div className="invoice-sum">Tổng hóa đơn: <b>{VND(invoice.total)}</b></div>
        </div>

        {/* ===== Filters for sessions ===== */}
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
            <input className="df-date" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            {(from || to) && (
              <button className="df-clear" title="Xóa lọc ngày" onClick={() => { setFrom(""); setTo(""); }}>✕</button>
            )}
          </div>
        </div>

        {/* Bảng phiên sạc */}
        <section className="ivp-card print-page">
          <table className="ivp-table">
            <thead>
              <tr>
                <th>Mã HĐ</th><th>Xe</th><th>Cổng</th><th>Thời gian</th><th>SoC</th>
                <th className="right">Năng lượng</th><th className="right">Phí trước thuế</th><th className="right">Thuế</th><th className="right">Tổng</th><th className="right">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 && (
                <tr><td colSpan={10} className="center">Không có phiên nào khớp bộ lọc.</td></tr>
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
                  <td>{s.startSoc ?? "—"}% → {s.endSoc ?? "—"}%</td>
                  <td className="right">{(Number(s.energyKwh) || 0).toLocaleString("vi-VN")} kWh</td>
                  <td className="right">{VND(s.subtotal)}</td>
                  <td className="right">{VND(s.tax)}</td>
                  <td className="right"><b>{VND(s.total)}</b></td>
                  <td className="right"><span className={pillClass(s.status)}>{s.status || "—"}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6}><b>Tổng Cộng</b></td>
                <td className="right">{VND(subtotal)}</td>
                <td className="right">{VND(tax)}</td>
                <td className="right"><b>{VND(total)}</b></td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          {mismatch && (
            <div className="ivp-note">
              Tổng các phiên ({VND(total)}) khác tổng BE ({VND(invoice.total)}).
            </div>
          )}
        </section>

        {/* ===== Breadcrumb-style pagination ===== */}
        {filteredSessions.length > 0 && (
          <>
            <div className="bp-hint">
              Đang hiển thị {Math.min(filteredSessions.length, start + 1)}–{Math.min(filteredSessions.length, start + pageItems.length)} / {filteredSessions.length} phiên
            </div>
            <nav className="bp-breadcrumbs" aria-label="Phân trang">
              <button
                className="bp-breadcrumb nav"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                ← Trước
              </button>

              {pageList.map((p, i) =>
                p === "..." ? (
                  <span key={`e${i}`} className="bp-ellipsis">…</span>
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
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Sau →
              </button>
            </nav>
          </>
        )}
      </div>
    </MainLayout>
  );
}
