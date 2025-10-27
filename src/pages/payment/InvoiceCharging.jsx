import React, { useEffect, useMemo, useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import { fetchAuthJSON, getApiBase, getToken } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import "./style/InvoiceCharging.css";

// ================= Helpers =================
function normalizeApiBase(s) {
  const raw = (s || "").trim();
  if (!raw) return "https://localhost:7268/api";
  return raw.replace(/\/+$/, "");
}
const API_ABS = normalizeApiBase(getApiBase()) || "https://localhost:7268/api";
const VND = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

function decodeJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload || "{}");
  } catch {
    return {};
  }
}

async function resolveCustomerIdSmart(authUser) {
  if (authUser?.customerId != null) return Number(authUser.customerId);

  try {
    const meRes = await fetchAuthJSON("/Auth", { method: "GET" });
    let cid =
      meRes?.customerId ??
      meRes?.id ??
      meRes?.userId ??
      meRes?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
    if (!cid) {
      const t = getToken?.() || "";
      const p = t ? decodeJwtPayload(t) : {};
      cid =
        p?.customerId ??
        p?.sub ??
        p?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
    }
    if (cid != null) return Number(cid);
  } catch { }

  const token =
    getToken?.() ||
    (typeof localStorage !== "undefined" &&
      (localStorage.getItem("token") || localStorage.getItem("access_token"))) ||
    "";
  if (token) {
    const p = decodeJwtPayload(token);
    const claimCust =
      p.customerId ??
      p.CustomerId ??
      p.custId ??
      p.custID ??
      p["customer_id"] ??
      p["cust_id"] ??
      p.sub ??
      p["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ??
      null;
    if (claimCust != null && !Number.isNaN(Number(claimCust))) {
      return Number(claimCust);
    }

    const accountId =
      p.accountId ??
      p.AccountId ??
      p.sub ??
      p["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ??
      null;

    try {
      const me = await fetchAuthJSON(`${API_ABS}/Customers/me`, { method: "GET" });
      const id1 = me?.data?.customerId ?? me?.customerId ?? null;
      if (id1 != null) return Number(id1);
    } catch { }

    if (accountId != null) {
      try {
        const byAcc = await fetchAuthJSON(
          `${API_ABS}/Customers/by-account/${accountId}`,
          { method: "GET" }
        );
        const id2 = byAcc?.data?.customerId ?? byAcc?.customerId ?? null;
        if (id2 != null) return Number(id2);
      } catch { }
    }
  }

  try {
    const stored =
      sessionStorage.getItem("customerId") || localStorage.getItem("customerId");
    if (stored) return Number(stored);
  } catch { }

  return null;
}

function StatusPill({ status }) {
  const raw = String(status || "");
  const key = raw.toLowerCase();
  const cls =
    key.includes("paid") ? "pill ok" :
      key.includes("unpaid") ? "pill warn" :
        key.includes("overdue") ? "pill danger" :
          "pill";
  return <span className={cls}>{raw || "—"}</span>;
}

// ===== Date helpers for client-side filtering =====
function parseDateSafe(v) { // "YYYY-MM-DD" -> Date at local midnight
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}
function endOfDay(date) {
  const d = new Date(date); d.setHours(23, 59, 59, 999); return d;
}
function pickDateField(inv, fieldKey) {
  // Lọc theo createdAt / updatedAt để giống mẫu
  const map = {
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  };
  const v = map[fieldKey];
  return v ? new Date(v) : null;
}

export default function InvoiceChargingPrint() {
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [customerId, setCustomerId] = useState(null);

  // NEW: filter + pagination (giống History)
  const [dateField, setDateField] = useState("createdAt"); // createdAt | updatedAt
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | paid | unpaid | overdue
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const id = await resolveCustomerIdSmart(authUser);
      if (!mounted) return;
      setCustomerId(id);
    })();
    return () => { mounted = false; };
  }, [authUser]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (customerId == null) { setLoading(false); return; }
      setLoading(true); setErr("");
      try {
        const url = `${API_ABS}/Invoices/by-customer/${customerId}`;
        const res = await fetchAuthJSON(url, { method: "GET" });
        let list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : res?.data
              ? [res.data]
              : [];
        list = list.filter(Boolean);
        if (!mounted) return;
        setInvoices(list);
        const cust = list?.[0]?.customer || null;
        setCustomer(cust);
      } catch (e) {
        if (!mounted) return;
        setErr(e?.message || "Không tải được hóa đơn.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [customerId]);

  // Reset về trang 1 khi thay đổi bộ lọc
  useEffect(() => { setPage(1); }, [dateField, dateFrom, dateTo, statusFilter]);

  const filtered = useMemo(() => {
    let arr = invoices.slice();

    // 1) Lọc trạng thái
    if (statusFilter !== "all") {
      arr = arr.filter(inv => {
        const s = String(inv.status || "").toLowerCase();
        if (statusFilter === "paid") return s.includes("paid");
        if (statusFilter === "unpaid") return s.includes("unpaid");
        if (statusFilter === "overdue") return s.includes("overdue");
        return true;
      });
    }

    // 2) Lọc theo ngày (inclusive)
    const fromDate = parseDateSafe(dateFrom);
    const toDate = parseDateSafe(dateTo) ? endOfDay(parseDateSafe(dateTo)) : null;

    if (fromDate || toDate) {
      arr = arr.filter((inv) => {
        const d = pickDateField(inv, dateField);
        if (!d) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }

    return arr;
  }, [invoices, statusFilter, dateField, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const grand = useMemo(() => {
    const total = filtered.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
    const countSessions = filtered.reduce(
      (acc, it) => acc + (Array.isArray(it.chargingSessions) ? it.chargingSessions.length : 0),
      0
    );
    return { total, countSessions, countInvoices: filtered.length };
  }, [filtered]);

  const onPrint = () => window.print();
  const clearDateFilter = () => { setDateFrom(""); setDateTo(""); };

  return (
    <MainLayout>
      <div className="ivp-root">

        {/* ===== Topbar + BỘ LỌC + NÚT BẤM (đã gộp chung) ===== */}
        <div className="ivp-topbar">
          <h2>Hóa đơn sạc</h2>

          <div className="hist-actions">
            <label className="hist-filter">
              Trạng thái:&nbsp;
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Tất cả</option>
                <option value="paid">Đã thanh toán</option>
                <option value="unpaid">Chưa thanh toán</option>
                <option value="overdue">Quá hạn</option>
              </select>
            </label>

            <div className="hist-datefilter">
              <select
                className="df-field"
                title="Trường thời gian"
                value={dateField}
                onChange={(e) => setDateField(e.target.value)}
              >
                <option value="createdAt">Tạo lúc</option>
                <option value="updatedAt">Cập nhật</option>
              </select>

              <input
                className="df-date"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="Từ ngày"
              />
              <span className="df-sep">—</span>
              <input
                className="df-date"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="Đến ngày"
              />
              {(dateFrom || dateTo) && (
                <button className="df-clear" onClick={clearDateFilter} title="Xóa lọc ngày">✕</button>
              )}
            </div>

            {/* === NÚT BẤM đưa chung với bộ lọc === */}
            <div className="hist-buttons no-print">
              <button className="ivp-btn" onClick={() => window.location.reload()}>Tải lại</button>
              <button className="ivp-btn" onClick={onPrint}>In hóa đơn</button>
            </div>
          </div>
        </div>

        {loading && <div>Đang tải dữ liệu…</div>}
        {!loading && !err && customerId == null && (
          <div className="ivp-warn">Không lấy được <b>customerId</b>. Vui lòng đăng nhập lại.</div>
        )}
        {!!err && !loading && <div className="ivp-warn">{err}</div>}

        {!loading && !err && filtered.length === 0 && (
          <div className="ivp-card">Không có hóa đơn phù hợp bộ lọc.</div>
        )}

        {!loading && !err && filtered.length > 0 && (
          <div className="ivp-card ivp-customer">
            <div className="ivp-head">
              <h2>Khách hàng: {customer?.fullName || `#${filtered[0]?.customerId}`}</h2>
              {/* <div>Mã KH: <b>{filtered[0]?.customerId}</b></div> */}
            </div>
            <div className="ivp-meta">
              <div>Điện thoại: <b>{customer?.phone || "—"}</b></div>
            </div>
          </div>
        )}

        {/* Hiển thị hóa đơn theo trang */}
        {pageItems.map((inv) => {
          const sessions = Array.isArray(inv.chargingSessions) ? inv.chargingSessions : [];
          const subtotal = sessions.reduce((a, s) => a + (Number(s.subtotal) || 0), 0);
          const tax = sessions.reduce((a, s) => a + (Number(s.tax) || 0), 0);
          const total = sessions.reduce((a, s) => a + (Number(s.total) || 0), 0);
          const mismatch = Math.abs(total - (Number(inv.total) || 0)) > 1;

          return (
            <section key={inv.invoiceId} className="ivp-card print-page">
              <div className="ivp-head">
                <h3>Hóa Đơn</h3>
                <StatusPill status={inv.status} />
              </div>

              <div className="ivp-meta">
                <div>Kỳ: <b>{String(inv.billingMonth || "—")}/{String(inv.billingYear || "—")}</b></div>
                <div className="invoice-sum">Tổng hóa đơn: <b>{VND(inv.total)}</b></div>
                <div>Tạo lúc: <b>{inv.createdAt ? new Date(inv.createdAt).toLocaleString("vi-VN") : "—"}</b></div>
                
              </div>
              <div className="update-label">Cập nhật: <b>{inv.updatedAt ? new Date(inv.updatedAt).toLocaleString("vi-VN") : "—"}</b></div>


              <table className="ivp-table">
                <thead>
                  <tr>
                    <th>Mã HĐ</th><th>Xe</th><th>Cổng</th><th>Thời gian</th><th>SoC</th>
                    <th className="right">Năng lượng</th><th className="right">Phí trước thuế</th><th className="right">Thuế</th><th className="right">Tổng</th><th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 && (
                    <tr><td colSpan={10} className="center">Không có phiên sạc trong hóa đơn này.</td></tr>
                  )}
                  {sessions.map((s) => (
                    <tr key={s.chargingSessionId}>
                      <td>{s.chargingSessionId}</td>
                      <td>{s.vehicleId ?? "—"}</td>
                      <td>{s.portId ?? "—"}</td>
                      <td>
                        <div>Bắt đầu: {s.startedAt ? new Date(s.startedAt).toLocaleString("vi-VN") : "—"}</div>
                        <div>Kết thúc: {s.endedAt ? new Date(s.endedAt).toLocaleString("vi-VN") : "—"}</div>
                        <div>Thời lượng: {(Number(s.durationMin) || 0)} phút </div>
                        <div>Idle: {(Number(s.idleMin) || 0)} phút</div>
                      </td>
                      <td>{s.startSoc ?? "—"}% → {s.endSoc ?? "—"}%</td>
                      <td className="right">{(Number(s.energyKwh) || 0).toLocaleString("vi-VN")} kWh</td>
                      <td className="right">{VND(s.subtotal)}</td>
                      <td className="right">{VND(s.tax)}</td>
                      <td className="right"><b>{VND(s.total)}</b></td>
                      <td><StatusPill status={s.status} /></td>
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

              {mismatch && <div className="ivp-note">Tổng các phiên ({VND(total)}) khác tổng BE ({VND(inv.total)}).</div>}
            </section>
          );
        })}

        {/* ===== Breadcrumb phân trang ===== */}
        {!loading && !err && filtered.length > 0 && (
          <nav className="bp-breadcrumbs" aria-label="Phân trang">
            <button
              className="bp-breadcrumb nav"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Trước
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                className={`bp-breadcrumb ${num === page ? "active" : ""}`}
                onClick={() => setPage(num)}
                disabled={num === page}
              >
                {num}
              </button>
            ))}

            <button
              className="bp-breadcrumb nav"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Sau →
            </button>
          </nav>
        )}
      </div>
    </MainLayout>
  );
}
