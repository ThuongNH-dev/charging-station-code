import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import { fetchAuthJSON, getApiBase, getToken } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import "./style/InvoiceSummary.css";

// ===== Helpers =====
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";
const fmt = (d) => (d ? new Date(d).toLocaleString("vi-VN") : "—");

function normalizeApiBase(s) {
  const raw = (s || "").trim();
  if (!raw) return "https://localhost:7268/api";
  return raw.replace(/\/+$/, "");
}
const API_ABS = normalizeApiBase(getApiBase()) || "https://localhost:7268/api";

function decodeJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
    );
    return JSON.parse(jsonPayload || "{}");
  } catch { return {}; }
}

async function resolveCustomerIdSmart(authUser) {
  if (authUser?.customerId != null) return Number(authUser.customerId);
  try {
    const meRes = await fetchAuthJSON("/Auth", { method: "GET" });
    let cid = meRes?.customerId ?? meRes?.id ?? meRes?.userId ?? meRes?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
    if (!cid) {
      const t = getToken?.() || "";
      const p = t ? decodeJwtPayload(t) : {};
      cid = p?.customerId ?? p?.sub ?? p?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
    }
    if (cid != null) return Number(cid);
  } catch { }
  const token = getToken?.() || localStorage.getItem("token") || localStorage.getItem("access_token") || "";
  if (token) {
    const p = decodeJwtPayload(token);
    const claimCust =
      p.customerId ?? p.CustomerId ?? p.custId ?? p.custID ??
      p["customer_id"] ?? p["cust_id"] ?? p.sub ??
      p["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
    if (claimCust != null && !Number.isNaN(Number(claimCust))) return Number(claimCust);

    try {
      const me = await fetchAuthJSON(`${API_ABS}/Customers/me`, { method: "GET" });
      const id1 = me?.data?.customerId ?? me?.customerId ?? null;
      if (id1 != null) return Number(id1);
    } catch { }
  }
  const stored = sessionStorage.getItem("customerId") || localStorage.getItem("customerId");
  if (stored) return Number(stored);
  return null;
}

// date helpers
const parseDate = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

// build pagination window with ellipses
function buildPages(total, current, window = 2) {
  if (total <= 1) return [1];
  const pages = new Set([1, total]);
  // neighbors
  for (let i = current - window; i <= current + window; i++) {
    if (i >= 1 && i <= total) pages.add(i);
  }
  const arr = Array.from(pages).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    out.push(arr[i]);
    if (i < arr.length - 1 && arr[i + 1] - arr[i] > 1) out.push("...");
  }
  return out;
}

export default function InvoiceSummary() {
  const { user: authUser } = useAuth();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [customerId, setCustomerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rawInvoices, setRawInvoices] = useState([]);

  // filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateField, setDateField] = useState("updatedAt");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // paging
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // get customerId
  useEffect(() => {
    let m = true;
    (async () => {
      const id = await resolveCustomerIdSmart(authUser);
      if (m) setCustomerId(id);
    })();
    return () => { m = false; };
  }, [authUser]);

  // fetch from API
  useEffect(() => {
    let m = true;
    (async () => {
      if (customerId == null) { setLoading(false); setErr("Không xác định được khách hàng."); return; }
      try {
        setLoading(true); setErr("");
        const res = await fetchAuthJSON(`${API_ABS}/Invoices/by-customer/${customerId}`, { method: "GET" });
        const list = Array.isArray(res?.data) ? res.data : [];
        if (!m) return;
        setRawInvoices(list);
      } catch (e) {
        if (m) setErr(e?.message || "Không tải được danh sách hóa đơn.");
      } finally {
        if (m) setLoading(false);
      }
    })();
    return () => { m = false; };
  }, [customerId]);

  // normalize
  const normalized = useMemo(() => {
    return (rawInvoices || []).filter(Boolean).map((it, idx) => ({
      id: it.invoiceId?.toString?.() || `${it.billingYear}-${it.billingMonth}-${idx}`,
      keyForDedupe: it.invoiceId?.toString?.() || `${it.billingYear}-${it.billingMonth}`,
      invoiceId: it.invoiceId,
      billingMonth: it.billingMonth,
      billingYear: it.billingYear,
      total: it.total,
      status: it.status,
      createdAt: it.createdAt,
      updatedAt: it.updatedAt,
      chargingSessions: it.chargingSessions || [],
      customer: it.customer || null,
    }));
  }, [rawInvoices]);

  // dedupe by keyForDedupe (keep latest updatedAt)
  const unique = useMemo(() => {
    const map = new Map();
    for (const it of normalized) {
      const k = it.keyForDedupe;
      if (!map.has(k)) map.set(k, it);
      else {
        const cur = map.get(k);
        const a = new Date(cur.updatedAt || 0).getTime();
        const b = new Date(it.updatedAt || 0).getTime();
        if (b > a) map.set(k, it);
      }
    }
    return Array.from(map.values());
  }, [normalized]);
  
  // sau const unique = useMemo(...)

useEffect(() => {
  try {
    sessionStorage.setItem("charge:billing:list", JSON.stringify(unique));
  } catch {}
}, [unique]);


  // filter + sort
  const filtered = useMemo(() => {
    let arr = unique.slice();

    if (statusFilter !== "all") {
      const key = statusFilter.toLowerCase();
      arr = arr.filter(inv => {
        const s = String(inv.status || "").toLowerCase();
        if (key === "paid") return s.includes("paid");
        if (key === "unpaid") return s.includes("unpaid");
        if (key === "overdue") return s.includes("overdue");
        return true;
      });
    }

    const dFrom = parseDate(from);
    const dTo = to ? endOfDay(parseDate(to)) : null;
    if (dFrom || dTo) {
      arr = arr.filter(inv => {
        const v = inv[dateField];
        if (!v) return false;
        const d = new Date(v);
        if (dFrom && d < dFrom) return false;
        if (dTo && d > dTo) return false;
        return true;
      });
    }

    return arr.sort((a, b) => (new Date(b[dateField] || 0)) - (new Date(a[dateField] || 0)));
  }, [unique, statusFilter, dateField, from, to]);

  useEffect(() => { setPage(1); }, [statusFilter, dateField, from, to]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  const clearDate = () => { setFrom(""); setTo(""); };

  const pillClass = (status) => {
    const s = String(status || "").toLowerCase().trim();

    // so khớp theo thứ tự an toàn hoặc dùng regex biên từ
    if (/(^|[^a-z])overdue([^a-z]|$)/.test(s)) return "pill danger";
    if (/(^|[^a-z])unpaid([^a-z]|$)/.test(s)) return "pill warn";
    if (/(^|[^a-z])paid([^a-z]|$)/.test(s)) return "pill ok";

    return "pill neutral";
  };


  const pageList = buildPages(totalPages, page, 2);

  return (
    <MainLayout>
      <div className="sum-root">
        {/* Topbar + Filters */}
        <div className="sum-topbar">
          <h2>Hóa Đơn</h2>
          <div className="sum-actions">
            <select className="sum-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="paid">Đã thanh toán</option>
              <option value="unpaid">Chưa thanh toán</option>
              <option value="overdue">Quá hạn</option>
            </select>

            <div className="sum-datefilter">
              <select className="df-field" value={dateField} onChange={(e) => setDateField(e.target.value)}>
                <option value="createdAt">Tạo lúc</option>
                <option value="updatedAt">Cập nhật</option>
              </select>
              <input className="df-date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <span className="df-sep">—</span>
              <input className="df-date" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
              {(from || to) && <button className="df-clear" title="Xóa lọc ngày" onClick={clearDate}>✕</button>}
            </div>
          </div>
        </div>

        {loading && <div className="sum-empty">Đang tải…</div>}
        {!loading && err && <div className="sum-error">{err}</div>}
        {!loading && !err && filtered.length === 0 && <div className="sum-empty">Không có hóa đơn phù hợp.</div>}

        {!loading && !err && pageItems.length > 0 && (
          <div className="sum-list">
            {pageItems.map((inv, idx) => {
              const id = inv.id || `${inv.billingYear}-${inv.billingMonth}-${idx}`;
              return (
                <button
                  key={id}
                  className="sum-card"
                  onClick={() =>
                    navigate(`/invoiceDetail/${encodeURIComponent(id)}`, {
                      state: {
                        invoiceId: id,
                        invoice: inv, // gửi object để hiển thị tức thì
                      },
                    })
                  }>
                    {/* Top row: left title, right status */ }
                    <div className="sum-row top">
                      <div className="sum-title">Hóa đơn kỳ {inv.billingMonth}/{inv.billingYear}</div>
                      <span className={pillClass(inv.status)}>{inv.status || "—"}</span>
                    </div>

                  {/* Bottom row: meta left, total right */ }
              <div className="sum-row bottom">
                <div className="sum-meta">
                  <div className="kv"><span className="k">Tạo lúc:</span><span className="v light">{fmt(inv.createdAt)}</span></div>
                  <div className="kv"><span className="k">Cập nhật:</span><span className="v light">{fmt(inv.updatedAt)}</span></div>
                </div>
                <div className="sum-total">
                  <div className="label">Tổng hóa đơn</div>
                  <div className="num">{vnd(inv.total || 0)}</div>
                </div>
              </div>
                </button>
        );
            })}
      </div>
        )}

      {/* Breadcrumb pagination */}
      {!loading && !err && filtered.length > 0 && (
        <>
          <div className="bp-hint">
            Đang hiển thị {Math.min(filtered.length, start + 1)}–{Math.min(filtered.length, start + pageItems.length)} / {filtered.length} hóa đơn
          </div>
          <nav className="bp-nav" aria-label="Phân trang">
            <button className="bp-item nav" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>← Trước</button>
            {pageList.map((p, i) =>
              p === "..." ? (
                <span key={`e${i}`} className="bp-ellipsis">…</span>
              ) : (
                <button
                  key={p}
                  className={`bp-item ${p === page ? "active" : ""}`}
                  onClick={() => setPage(p)}
                  disabled={p === page}
                >
                  {p}
                </button>
              )
            )}
            <button className="bp-item nav" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Sau →</button>
          </nav>
        </>
      )}
    </div>
    </MainLayout >
  );
}
