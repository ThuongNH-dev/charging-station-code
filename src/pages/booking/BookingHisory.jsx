import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import "./BookingHistory.css";

// ===== API base: KHÔNG hard-code localhost =====
function normalizeApiBase(s) {
  const raw = (s || "").trim();
  if (!raw) return "/api"; // fallback relative
  return raw.replace(/\/+$/, "");
}
const API_ABS = normalizeApiBase(getApiBase());
const PAYMENT_CREATE_URL = `${API_ABS}/Payment/create`;

const HOLD_MINUTES_DEFAULT = 15;
const vndNumber = (n) => (Number(n) || 0).toLocaleString("vi-VN");

// === URL normalizer: string | {result|url|href|paymentUrl} | relative -> absolute string
function toUrlString(val) {
  if (!val) return "";
  if (typeof val === "object") {
    const cand =
      val.result ?? val.url ?? val.href ?? val.paymentUrl ?? val.paymentURL ??
      (val.data && (val.data.result ?? val.data.url ?? val.data.href)) ?? "";
    return toUrlString(cand);
  }
  const s = String(val).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  try {
    return new URL(s, window.location.origin).toString();
  } catch {
    return "";
  }
}

// === Storage helpers ===
function dualRead(key) {
  let s = null;
  try { s = sessionStorage.getItem(key); } catch {}
  if (!s) try { s = localStorage.getItem(key); } catch {}
  return s;
}
function dualWrite(key, val) {
  try { sessionStorage.setItem(key, val); } catch {}
  try { localStorage.setItem(key, val); } catch {}
}

// === Payment storage helpers ===
function wasFinalized(orderId) { return dualRead(`pay:${orderId}:finalized`) === "1"; }
function findPaymentStubByBookingId(bookingId) {
  const collect = (store) => {
    const keys = [];
    try {
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (k && k.startsWith("pay:") && !k.endsWith(":pending") && !k.endsWith(":finalized")) keys.push(k);
      }
    } catch {}
    return keys;
  };
  const keys = Array.from(new Set([...collect(localStorage), ...collect(sessionStorage)]));
  for (const k of keys) {
    try {
      const s = dualRead(k); if (!s) continue; const obj = JSON.parse(s);
      if (String(obj?.bookingId) === String(bookingId)) {
        const orderId = obj?.orderId || obj?.paymentRef || k.replace(/^pay:/, "");
        return {
          orderId,
          paidAt: obj?.paidAt ? new Date(obj.paidAt).getTime() : Date.now(),
          totalMinutes: obj?.totalMinutes > 0 ? obj.totalMinutes : HOLD_MINUTES_DEFAULT
        };
      }
    } catch {}
  }
  return null;
}

function useTick(ms = 1000) {
  const [, setN] = useState(0); const ref = useRef(null);
  useEffect(() => {
    ref.current = setInterval(() => setN(n => (n + 1) % 1_000_000), ms);
    return () => clearInterval(ref.current);
  }, [ms]);
}

function StatusPill({ status }) {
  const raw = String(status || "");
  const key = raw.toLowerCase().replace(/[\s_]+/g, "");
  const clsMap = { pending: "pill pending", confirmed: "pill ok", completed: "pill done", cancelled: "pill cancel", failed: "pill fail" };
  const className = clsMap[key] || (key.includes("cancel") ? "pill cancel" : "pill");
  const label = raw.replace(/_/g, " ").trim();
  return <span className={className}>{label}</span>;
}

// ---- API: đổi trạng thái booking ----
async function updateBookingStatus(bookingId, status) {
  return await fetchAuthJSON(`${API_ABS}/Booking/${bookingId}/status`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status })
  });
}

// === Date helpers ===
function parseDateSafe(v) {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}
function endOfDay(date) { const d = new Date(date); d.setHours(23, 59, 59, 999); return d; }
function pickDateField(row, fieldKey) {
  const map = { createdAt: row.createdAt, startTime: row.startTime, endTime: row.endTime };
  const v = map[fieldKey];
  return v ? new Date(v) : null;
}

// ===== Toast & Confirm (không dùng alert/confirm) =====
function useToast() {
  const [toast, setToast] = useState({ open: false, type: "info", text: "" });
  const show = (text, type = "info", timeout = 3500) => {
    setToast({ open: true, type, text });
    if (timeout > 0) {
      setTimeout(() => setToast(t => ({ ...t, open: false })), timeout);
    }
  };
  const hide = () => setToast(t => ({ ...t, open: false }));
  return { toast, show, hide };
}

function ConfirmModal({ open, title, message, onOk, onCancel }) {
  if (!open) return null;
  return (
    <div className="bh-modal-backdrop">
      <div className="bh-modal">
        <div className="bh-modal-title">{title || "Xác nhận"}</div>
        <div className="bh-modal-body">{message}</div>
        <div className="bh-modal-actions">
          <button className="hist-btn danger" onClick={onOk}>Đồng ý</button>
          <button className="hist-btn ghost" onClick={onCancel}>Huỷ</button>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast, show, hide } = useToast();
  const [confirmState, setConfirmState] = useState({ open: false, resolver: null, title: "", message: "" });

  const confirmAsync = (title, message) => new Promise((resolve) => {
    setConfirmState({ open: true, resolver: resolve, title, message });
  });
  const onConfirmOk = () => { confirmState.resolver?.(true); setConfirmState(s => ({ ...s, open: false })); };
  const onConfirmCancel = () => { confirmState.resolver?.(false); setConfirmState(s => ({ ...s, open: false })); };

  const myCustomerId = React.useMemo(() => {
    const cid =
      user?.customerId ??
      Number(localStorage.getItem("customerId")) ??
      Number(sessionStorage.getItem("customerId"));
    return Number.isFinite(cid) ? String(cid) : "";
  }, [user]);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [filter, setFilter] = useState("all"); // all | active | past

  // 🔎 Lọc theo ngày
  const [dateField, setDateField] = useState("createdAt"); // createdAt | startTime | endTime
  const [dateFrom, setDateFrom] = useState("");            // "YYYY-MM-DD"
  const [dateTo, setDateTo] = useState("");

  useTick(1000);

  useEffect(() => { setPage(1); }, [dateField, dateFrom, dateTo, filter]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        if (!myCustomerId) {
          setErr("Không xác định được customerId. Vui lòng đăng nhập lại.");
          setItems([]);
          setLoading(false);
          return;
        }
        const url = new URL(`${API_ABS}/Booking`, window.location.origin);
        url.searchParams.set("page", page);
        url.searchParams.set("pageSize", pageSize);
        url.searchParams.set("customerId", myCustomerId);
        if (dateFrom) url.searchParams.set("from", dateFrom);
        if (dateTo) url.searchParams.set("to", dateTo);
        if (dateField) url.searchParams.set("dateField", dateField);

        const res = await fetchAuthJSON(url.toString(), { method: "GET" });
        if (!res) throw new Error("Không nhận được dữ liệu.");
        setPage(Number(res.page || 1));
        setTotalPages(Number(res.totalPages || 1));
        setTotalItems(Number(res.totalItems || 0));

        const list = Array.isArray(res.items) ? res.items : [];
        const normalized = list.map((b) => {
          const bookingId = b.bookingId ?? b.id ?? b.BookingId;
          const price = Number(b.price ?? b.Price ?? 0);
          const status = String(b.status ?? b.Status ?? "Pending");
          const startTime = b.startTime ?? b.StartTime;
          const endTime = b.endTime ?? b.EndTime;
          const createdAt = b.createdAt ?? b.CreatedAt;
          const customerId = b.customerId ?? b.CustomerId;

          const stub = findPaymentStubByBookingId(bookingId);

          let timeLeft = 0;
          if (stub) {
            const totalSeconds = Math.max(0, Math.floor((stub.totalMinutes || HOLD_MINUTES_DEFAULT) * 60));
            const paidAtMs = Number.isFinite(stub.paidAt) ? stub.paidAt : Date.now();
            const elapsed = Math.floor((Date.now() - paidAtMs) / 1000);
            timeLeft = Math.max(0, totalSeconds - elapsed);
          }

          const orderId = stub?.orderId || null;
          const paid = status !== "Pending" || (orderId && wasFinalized(orderId));

          return {
            bookingId, price, status, startTime, endTime, createdAt, customerId,
            _orderId: orderId, _timeLeft: timeLeft,
            _hasCountdown: status === "Pending" && timeLeft > 0,
            _paid: paid,
          };
        });

        const mineOnly = normalized.filter(x => String(x.customerId) === myCustomerId);
        setItems(mineOnly);
      } catch (e) {
        const msg = e?.message || "Lỗi tải lịch sử.";
        setErr(msg);
        // show toast thay vì alert
        show(msg, "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [page, pageSize, dateField, dateFrom, dateTo]); // filter được xử lý phía client

  const filtered = useMemo(() => {
    let arr = items;
    switch (filter) {
      case "active":
        arr = arr.filter((x) => x.status === "Pending" || x.status === "Confirmed");
        break;
      case "past":
        arr = arr.filter((x) => ["Completed", "Cancelled", "Failed"].includes(x.status));
        break;
      default: break;
    }
    const fromDate = parseDateSafe(dateFrom);
    const toDate = parseDateSafe(dateTo) ? endOfDay(parseDateSafe(dateTo)) : null;

    if (fromDate || toDate) {
      arr = arr.filter((row) => {
        const d = pickDateField(row, dateField);
        if (!d) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }
    return arr;
  }, [items, filter, dateField, dateFrom, dateTo]);

  // === Hành động ===
  const goDetail = (row) => {
    const qs = new URLSearchParams();
    if (row.bookingId) qs.set("bookingId", String(row.bookingId));
    navigate(`/payment/success?${qs.toString()}`);
  };

  const goInvoice = (row) => {
    const qs = new URLSearchParams();
    if (row.bookingId) qs.set("bookingId", String(row.bookingId));
    navigate(`/invoiceSummary?${qs.toString()}`);
  };

  const onPay = async (row) => {
    try {
      const payload = {
        bookingId: row.bookingId,
        returnUrl: window.location.origin + "/payment/success",
        cancelUrl: window.location.origin + "/user/history",
      };
      const res = await fetch(PAYMENT_CREATE_URL, {
        method: "POST", credentials: "include",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let paymentUrl = res.headers.get("Location") || "";
      let orderId = "";

      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const data = await res.json().catch(() => ({}));
        const cand =
          paymentUrl ||
          data.paymentUrl || data.paymentURL || data.url || data.redirectUrl ||
          data.data?.paymentUrl || data.data?.url || data.data?.redirectUrl || "";
        paymentUrl = toUrlString(cand);
        orderId = data.orderId || data.id || data.txnRef || data.data?.orderId || data.data?.id || "";
      } else {
        const text = await res.text().catch(() => "");
        if (!paymentUrl && text) paymentUrl = toUrlString(text.trim());
      }

      if (!res.ok) throw new Error(`Tạo thanh toán thất bại: ${res.status} ${res.statusText}`);
      if (!paymentUrl) throw new Error("BE không trả paymentUrl / Location header hợp lệ.");

      if (!orderId) {
        try {
          const u = new URL(toUrlString(paymentUrl));
          orderId = u.searchParams.get("orderId")
            || u.searchParams.get("txnRef")
            || u.searchParams.get("vnp_TxnRef")
            || "";
        } catch {}
      }

      if (orderId) {
        const stub = { orderId, bookingId: row.bookingId, bookingFee: row.price, paidAt: Date.now(), totalMinutes: HOLD_MINUTES_DEFAULT };
        dualWrite(`pay:${orderId}`, JSON.stringify(stub));
        dualWrite("pay:lastOrderId", String(orderId));
        dualWrite(`pay:${orderId}:pending`, "1");
      }

      window.location.href = toUrlString(paymentUrl);
    } catch (e) {
      show(e.message || "Không thể khởi tạo thanh toán.", "error");
    }
  };

  const onCancel = async (row) => {
    const ok = await confirmAsync("Xác nhận huỷ booking", `Bạn có chắc muốn huỷ booking #${row.bookingId}?`);
    if (!ok) return;
    try {
      const res = await updateBookingStatus(row.bookingId, "Cancelled");
      if (res?.status && res.status !== "Cancelled") throw new Error("Đổi trạng thái không thành 'Cancelled'.");
      setItems((arr) => arr.map((x) => (x.bookingId === row.bookingId ? { ...x, status: "Cancelled" } : x)));
      show(`Đã huỷ booking #${row.bookingId}`, "success");
    } catch (e) {
      show(e.message || "Không thể huỷ booking.", "error");
    }
  };

  const clearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
  };

  return (
    <MainLayout>
      {/* Toast gọn nhẹ */}
      <div
        className={`bh-toast ${toast.open ? "open" : ""} ${toast.type}`}
        onClick={hide}
        role="status"
        aria-live="polite"
      >
        {toast.text}
      </div>

      {/* Modal confirm custom */}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onOk={onConfirmOk}
        onCancel={onConfirmCancel}
      />

      <div className="hist-root">
        <div className="hist-topbar">
          <h2>Lịch sử giao dịch / hoạt động</h2>

          <div className="hist-actions">
            <label className="hist-filter">
              Lọc trạng thái:&nbsp;
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">Tất cả</option>
                <option value="active">Đang hiệu lực</option>
                <option value="past">Đã kết thúc / hủy</option>
              </select>
            </label>

            {/* 🔎 Bộ lọc theo ngày */}
            <div className="hist-datefilter">
              <select
                className="df-field"
                title="Trường thời gian"
                value={dateField}
                onChange={(e) => setDateField(e.target.value)}
              >
                <option value="createdAt">Tạo lúc</option>
                <option value="startTime">Bắt đầu</option>
                <option value="endTime">Kết thúc</option>
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
          </div>
        </div>

        {loading && <div className="hist-empty">Đang tải dữ liệu...</div>}
        {!!err && !loading && <div className="hist-error">{err}</div>}
        {!loading && !err && filtered.length === 0 && (
          <div className="hist-empty">Không có bản ghi phù hợp bộ lọc.</div>
        )}

        {!loading && !err && filtered.length > 0 && (
          <div className="hist-wrap">
            <div className="hist-head">
              <div>Mã</div>
              <div>Trạng thái</div>
              <div>Bắt đầu</div>
              <div>Kết thúc</div>
              <div>Tạo lúc</div>
              <div>Giá</div>
              <div>Hành động</div>
            </div>

            <div className="hist-list">
              {filtered.map((row) => {
                const showPayBtn = row.status === "Pending" && !row._paid;
                const showCancelBtn = row.status === "Pending" && !row._paid;
                const isCancelledOrFailed = ["Cancelled", "Failed"].includes(row.status);
                const isCompleted = row.status === "Completed";
                const showDetailBtn = !isCancelledOrFailed && !isCompleted && (row._paid || row.status === "Confirmed");
                const showInvoiceBtn = !isCancelledOrFailed && isCompleted;
                const noActions = isCancelledOrFailed;

                return (
                  <div key={row.bookingId} className="hist-card">
                    <div className="cell id">#{row.bookingId}</div>
                    <div className="cell status"><StatusPill status={row.status} /></div>

                    <div className="cell time start">
                      <span className="label">Bắt đầu:&nbsp;</span>
                      {row.startTime ? new Date(row.startTime).toLocaleString("vi-VN") : "—"}
                    </div>

                    <div className="cell time end">
                      <span className="label">Kết thúc:&nbsp;</span>
                      {row.endTime ? new Date(row.endTime).toLocaleString("vi-VN") : "—"}
                    </div>

                    <div className="cell time created">
                      <span className="label">Tạo lúc:&nbsp;</span>
                      {row.createdAt ? new Date(row.createdAt).toLocaleString("vi-VN") : "—"}
                    </div>

                    <div className="cell price">
                      <span className="num">{vndNumber(row.price)}</span>
                      <span className="cur">đ</span>
                    </div>

                    <div className="cell actions">
                      {showPayBtn && (
                        <button className="hist-btn" onClick={() => onPay(row)} title="Thanh toán">Thanh toán</button>
                      )}
                      {showCancelBtn && (
                        <button className="hist-btn danger" onClick={() => onCancel(row)} title="Huỷ booking">Huỷ</button>
                      )}
                      {showDetailBtn && (
                        <button className="hist-btn ghost" onClick={() => goDetail(row)} title="Xem chi tiết">Xem chi tiết</button>
                      )}
                      {showInvoiceBtn && (
                        <button className="hist-btn ghost" onClick={() => goInvoice(row)} title="Xem hoá đơn">Xem hoá đơn</button>
                      )}
                      {noActions && <span className="hist-note" style={{ color: '#9aa3b2' }}>—</span>}
                    </div>
                  </div>
                );
              })}
            </div>

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
          </div>
        )}
      </div>
    </MainLayout>
  );
}
