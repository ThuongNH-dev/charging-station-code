import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import { fetchAuthJSON } from "../../utils/api";
import "./BookingHistory.css";

// ---- DÙNG URL TUYỆT ĐỐI THEO BE CỦA BẠN ----
const API_ABS = "https://localhost:7268/api";
const PAYMENT_CREATE_URL = `${API_ABS}/Payment/create`;

const HOLD_MINUTES_DEFAULT = 15;
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

// === Storage helpers ===
function dualRead(key) {
  let s = null;
  try { s = sessionStorage.getItem(key); } catch { }
  if (!s) try { s = localStorage.getItem(key); } catch { }
  return s;
}
function dualWrite(key, val) {
  try { sessionStorage.setItem(key, val); } catch { }
  try { localStorage.setItem(key, val); } catch { }
}

// === Payment storage helpers (đồng bộ với PaymentSuccess) ===
function wasFinalized(orderId) {
  return dualRead(`pay:${orderId}:finalized`) === "1";
}

// Quét storage để map bookingId -> { orderId, paidAt, totalMinutes }
function findPaymentStubByBookingId(bookingId) {
  const collect = (store) => {
    const keys = [];
    try {
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (k && k.startsWith("pay:") && !k.endsWith(":pending") && !k.endsWith(":finalized")) {
          keys.push(k);
        }
      }
    } catch { }
    return keys;
  };
  const keys = Array.from(new Set([...collect(localStorage), ...collect(sessionStorage)]));
  for (const k of keys) {
    try {
      const s = dualRead(k);
      if (!s) continue;
      const obj = JSON.parse(s);
      if (String(obj?.bookingId) === String(bookingId)) {
        const orderId = obj?.orderId || obj?.paymentRef || k.replace(/^pay:/, "");
        return {
          orderId,
          paidAt: obj?.paidAt ? new Date(obj.paidAt).getTime() : Date.now(),
          totalMinutes:
            obj?.totalMinutes && obj.totalMinutes > 0 ? obj.totalMinutes : HOLD_MINUTES_DEFAULT,
        };
      }
    } catch { /* ignore */ }
  }
  return null;
}

function useTick(ms = 1000) {
  const [, setN] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    ref.current = setInterval(() => setN((n) => (n + 1) % 1_000_000), ms);
    return () => clearInterval(ref.current);
  }, [ms]);
}

function fmtSeconds(total) {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec
    .toString()
    .padStart(2, "0")}`;
}

function StatusPill({ status }) {
  const map = {
    Pending: "pill pending",
    Confirmed: "pill ok",
    Completed: "pill done",
    Cancelled: "pill cancel",
    Failed: "pill fail",
  };
  return <span className={map[status] || "pill"}>{status}</span>;
}

// ---- API: đổi trạng thái booking qua /Booking/{id}/status ----
async function updateBookingStatus(bookingId, status) {
  return await fetchAuthJSON(`https://localhost:7268/api/Booking/${bookingId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}


export default function HistoryPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filter, setFilter] = useState("all"); // all | active | past

  useTick(1000);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        // Lấy danh sách booking (dùng URL tuyệt đối để tránh rơi vào 5173)
        const res = await fetchAuthJSON(
          `${API_ABS}/Booking?page=${page}&pageSize=${pageSize}`,
          { method: "GET" }
        );
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

          const stub = findPaymentStubByBookingId(bookingId);

          let timeLeft = 0;
          if (stub) {
            const totalSeconds = Math.max(
              0,
              Math.floor((stub.totalMinutes || HOLD_MINUTES_DEFAULT) * 60)
            );
            const paidAtMs = Number.isFinite(stub.paidAt) ? stub.paidAt : Date.now();
            const elapsed = Math.floor((Date.now() - paidAtMs) / 1000);
            timeLeft = Math.max(0, totalSeconds - elapsed);
          }

          const orderId = stub?.orderId || null;
          const paid = status !== "Pending" || (orderId && wasFinalized(orderId));

          return {
            bookingId,
            price,
            status,
            startTime,
            endTime,
            createdAt,
            _orderId: orderId,
            _timeLeft: timeLeft,
            _hasCountdown: status === "Pending" && timeLeft > 0,
            _paid: paid,
          };
        });

        setItems(normalized);
      } catch (e) {
        setErr(e.message || "Lỗi tải lịch sử.");
      } finally {
        setLoading(false);
      }
    })();
  }, [page, pageSize]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "active":
        return items.filter((x) => x.status === "Pending" || x.status === "Confirmed");
      case "past":
        return items.filter((x) =>
          ["Completed", "Cancelled", "Failed"].includes(x.status)
        );
      default:
        return items;
    }
  }, [items, filter]);

  // === Hành động
  const goDetail = (row) => {
    // Luôn truyền bookingId để PaymentSuccess lấy đúng đơn vừa chọn
    const qs = new URLSearchParams();
    if (row.bookingId) qs.set("bookingId", String(row.bookingId));
    if (row._orderId) qs.set("order", String(row._orderId));
    navigate(`/payment/success?${qs.toString()}`);
  };

  const onPay = async (row) => {
    try {
      const payload = {
        bookingId: row.bookingId,
        returnUrl: window.location.origin + "/payment/success",
        cancelUrl: window.location.origin + "/user/history",
      };

      // Dùng fetch nguyên thuỷ để đọc header Location khi cần
      const res = await fetch(PAYMENT_CREATE_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // 2. Lấy URL từ nhiều nguồn: JSON body / text / Location header
      let paymentUrl = res.headers.get("Location") || "";
      let orderId = "";

      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const data = await res.json().catch(() => ({}));
        paymentUrl =
          paymentUrl ||
          data.paymentUrl ||
          data.paymentURL ||
          data.url ||
          data.redirectUrl ||
          data.data?.paymentUrl ||
          data.data?.url ||
          data.data?.redirectUrl ||
          "";
        orderId =
          data.orderId || data.id || data.txnRef || data.data?.orderId || data.data?.id || "";
      } else {
        const text = await res.text().catch(() => "");
        // nếu BE trả plain text là URL
        if (!paymentUrl && /^https?:\/\//i.test(text.trim())) paymentUrl = text.trim();
      }

      if (!res.ok) {
        throw new Error(`Create payment failed ${res.status} ${res.statusText}`);
      }
      if (!paymentUrl) {
        throw new Error("BE không trả paymentUrl / Location header.");
      }

      // Nếu chưa có orderId thì cố lấy từ query (VNPAY/MOMO thường có txnRef/orderId)
      if (!orderId) {
        try {
          const u = new URL(paymentUrl);
          orderId =
            u.searchParams.get("orderId") ||
            u.searchParams.get("txnRef") ||
            u.searchParams.get("vnp_TxnRef") ||
            "";
        } catch { }

      }

      // Lưu stub cho PaymentSuccess
      if (orderId) {
        const stub = {
          orderId,
          bookingId: row.bookingId,
          bookingFee: row.price,
          paidAt: Date.now(),
          totalMinutes: HOLD_MINUTES_DEFAULT,
        };
        dualWrite(`pay:${orderId}`, JSON.stringify(stub));
        dualWrite("pay:lastOrderId", String(orderId));
        dualWrite(`pay:${orderId}:pending`, "1");
      }

      // Redirect sang cổng thanh toán
      window.location.href = paymentUrl;
    } catch (e) {
      alert(e.message || "Không thể khởi tạo thanh toán.");
    }
  };


  const onCancel = async (row) => {
    if (!confirm(`Huỷ booking #${row.bookingId}?`)) return;
    try {
      const res = await updateBookingStatus(row.bookingId, "Cancelled");
      // BE có thể trả {status:"Cancelled"} hoặc {message:"..."}
      if (res?.status && res.status !== "Cancelled") {
        throw new Error("Đổi trạng thái không thành 'Cancelled'.");
      }
      setItems((arr) =>
        arr.map((x) => (x.bookingId === row.bookingId ? { ...x, status: "Cancelled" } : x))
      );
    } catch (e) {
      alert(e.message || "Không thể huỷ booking.");
    }
  };


  return (
    <MainLayout>
      <div className="hist-root">
        <div className="hist-topbar">
          <h2>Lịch sử giao dịch / hoạt động</h2>
          <div className="hist-actions">
            <label className="hist-filter">
              Lọc:&nbsp;
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">Tất cả</option>
                <option value="active">Đang hiệu lực</option>
                <option value="past">Đã kết thúc / hủy</option>
              </select>
            </label>
          </div>
        </div>

        {loading && <div className="hist-empty">Đang tải dữ liệu...</div>}
        {!!err && !loading && <div className="hist-error">{err}</div>}

        {!loading && !err && filtered.length === 0 && (
          <div className="hist-empty">Chưa có giao dịch nào.</div>
        )}

        {!loading && !err && filtered.length > 0 && (
          <div className="hist-list">
            {filtered.map((row) => {
              const showCountdown = row.status === "Pending" && row._timeLeft > 0 && !row._paid;
              const showPayBtn = row.status === "Pending" && !row._paid;
              const showCancelBtn = row.status === "Pending" && !row._paid;
              const showDetailBtn = row._paid || ["Confirmed", "Completed"].includes(row.status);
              const noActions = ["Cancelled", "Failed"].includes(row.status);

              return (
                <div key={row.bookingId} className="hist-card">
                  <div className="hist-row">
                    <div className="hist-col grow">
                      <div className="hist-line">
                        <b>Mã booking:</b>&nbsp;#{row.bookingId} &nbsp;
                        <StatusPill status={row.status} />
                      </div>
                      <div className="hist-line">
                        <span>
                          <b>Bắt đầu:</b>{" "}
                          {row.startTime ? new Date(row.startTime).toLocaleString("vi-VN") : "—"}
                        </span>
                        <span className="sep">•</span>
                        <span>
                          <b>Kết thúc:</b>{" "}
                          {row.endTime ? new Date(row.endTime).toLocaleString("vi-VN") : "—"}
                        </span>
                      </div>
                      <div className="hist-line">
                        <b>Tạo lúc:</b>{" "}
                        {row.createdAt ? new Date(row.createdAt).toLocaleString("vi-VN") : "—"}
                      </div>
                    </div>

                    <div className="hist-col right">
                      <div className="hist-price">{vnd(row.price)}</div>

                      {showCountdown ? (
                        <div className="hist-count">
                          <span className="count-label">Giữ chỗ còn:</span>
                          <span className="count-val">{fmtSeconds(row._timeLeft)}</span>
                        </div>
                      ) : (
                        <div className="hist-count ghost">—</div>
                      )}

                      <div className="hist-actions" style={{ gap: 8 }}>
                        {showPayBtn && (
                          <button className="hist-btn" onClick={() => onPay(row)} title="Thanh toán">
                            Thanh toán
                          </button>
                        )}
                        {showCancelBtn && (
                          <button
                            className="hist-btn danger"
                            onClick={() => onCancel(row)}
                            title="Huỷ booking"
                          >
                            Huỷ
                          </button>
                        )}
                        {showDetailBtn && (
                          <button className="hist-btn ghost" onClick={() => goDetail(row)}>
                            Xem chi tiết
                          </button>
                        )}
                        {noActions && <span className="hist-note">—</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="hist-paging">
              <button
                className="hist-btn ghost"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ← Trước
              </button>
              <span>
                Trang {page}/{totalPages} · Tổng {totalItems}
              </span>
              <button
                className="hist-btn ghost"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
