import React, { useMemo, useEffect, useState } from "react";
import { useLocation, useNavigate, Link, useSearchParams } from "react-router-dom";
import { CheckCircleFilled, ArrowLeftOutlined } from "@ant-design/icons";
import MainLayout from "../../layouts/MainLayout";
import "./style/PaymentSuccess.css";

const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";
const HOLD_MINUTES_DEFAULT = 15;

// Dual read/write helpers
function dualRead(key) {
  let s = null;
  try { s = sessionStorage.getItem(key); } catch { }
  if (!s) { try { s = localStorage.getItem(key); } catch { } }
  return s;
}
function dualWrite(key, val) {
  try { sessionStorage.setItem(key, val); } catch { }
  try { localStorage.setItem(key, val); } catch { }
}
function dualRemove(key) {
  try { sessionStorage.removeItem(key); } catch { }
  try { localStorage.removeItem(key); } catch { }
}

// Parse VNPay datetime (yyyyMMddHHmmss) safely
function parseVnpPayDate(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${se}`; // no +07:00 to avoid double offset
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

export default function PaymentSuccess() {
  const { state } = useLocation();
  const [search] = useSearchParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [timeLeft, setTimeLeft] = useState(0);
  const [idInput, setIdInput] = useState("");
  const [idError, setIdError] = useState("");

  // ✅ NEW: Simplified logic (no backend fetch, no CORS)
  useEffect(() => {
    // Nếu BE redirect thì VNPay đã xong — chỉ đọc query
    const order = search.get("order");
    const txnRef = search.get("txnRef");
    const success = search.get("success") === "true";
    const amount = Number(search.get("vnp_Amount") || 0) / 100;
    const payDate = parseVnpPayDate(search.get("vnp_PayDate"));

    // Lấy local stub nếu có
    const localStr = dualRead(`pay:${order}`);
    let stub = {};
    if (localStr) {
      try { stub = JSON.parse(localStr); } catch { }
    }

    // Gộp dữ liệu
    const merged = {
      ...stub,
      orderId: order,
      txnRef,
      success,
      bookingFee: stub.bookingFee ?? amount,
      paidAt: payDate ?? Date.now(),
    };

    if (!order && !stub) {
      setFetchError("Không tìm thấy thông tin thanh toán.");
    }

    setData(merged);
    setLoading(false);

    // cleanup pending flag
    if (order) dualRemove(`pay:${order}:pending`);
  }, [search]);

  // ===== 2) Điều hướng nếu phiên đã start/done =====
  useEffect(() => {
    if (!data) return;
    const { orderId } = data;
    dualWrite("currentBookingOrderId", orderId);
const lock = dualRead(`bookingLocked:${orderId}`);
    if (lock === "started") {
      navigate("/charging", { state: data, replace: true });
    } else if (lock === "done") {
      const last = dualRead("lastChargePayOrderId");
      if (last) {
        const cached = dualRead(`chargepay:${last}`);
        const toState = cached ? JSON.parse(cached) : undefined;
        navigate(`/payment/charging?order=${last}`, { state: toState, replace: true });
      } else {
        navigate("/stations", { replace: true });
      }
    }
  }, [data, navigate]);

  // ===== 3) Count down =====
  const holdMinutes =
    data?.totalMinutes && data.totalMinutes > 0 ? data.totalMinutes : HOLD_MINUTES_DEFAULT;
  const totalSeconds = Math.max(0, Math.floor(holdMinutes * 60));

  const calcRemaining = () => {
    const elapsed = Math.floor((Date.now() - (data?.paidAt || Date.now())) / 1000);
    return Math.max(0, totalSeconds - elapsed);
  };

  useEffect(() => {
    if (!data) return;
    setTimeLeft(calcRemaining());
    const timer = setInterval(() => setTimeLeft(calcRemaining()), 1000);
    return () => clearInterval(timer);
  }, [data, totalSeconds]);

  const fmt = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec
      .toString()
      .padStart(2, "0")}`;
  };

  // ===== 4) Xác thực ID trụ/súng =====
  const norm = (s) => (s || "").toString().trim().toLowerCase().replace(/\s+/g, "");

  const allowedIds = useMemo(() => {
    if (!data) return [];
    const raw = [];
    if (data.gun?.id) raw.push(String(data.gun.id));
    if (data.gun?.name) raw.push(String(data.gun.name));
    if (data.charger?.id) raw.push(String(data.charger.id));
    if (data.charger?.title) raw.push(String(data.charger.title));
    if (data.charger?.id && data.gun?.id) raw.push(`${data.charger.id}-${data.gun.id}`);
    if (data.charger?.id && data.gun?.name) raw.push(`${data.charger.id}-${data.gun.name}`);
    return Array.from(new Set(raw.filter(Boolean).map(norm)));
  }, [data]);

  const displayHints = useMemo(() => {
    if (!data) return [];
    const hints = [];
    if (data.gun?.id) hints.push(String(data.gun.id));
    if (data.gun?.name) hints.push(String(data.gun.name));
    if (data.charger?.id) hints.push(String(data.charger.id));
    if (data.charger?.title) hints.push(String(data.charger.title));
    if (data.charger?.id && data.gun?.id) hints.push(`${data.charger.id}-${data.gun.id}`);
    if (data.charger?.id && data.gun?.name) hints.push(`${data.charger.id}-${data.gun.name}`);
    return Array.from(new Set(hints));
  }, [data]);

  const handleStart = () => {
    if (timeLeft <= 0) {
      setIdError("Hết thời gian giữ chỗ. Vui lòng đặt lại.");
      return;
    }
    const candidate = norm(idInput);
    if (!candidate) {
setIdError("Vui lòng nhập ID trụ hoặc súng.");
      return;
    }
    if (!allowedIds.includes(candidate)) {
      setIdError("ID trụ/súng không đúng. Vui lòng kiểm tra lại.");
      return;
    }

    dualWrite(`bookingLocked:${data.orderId}`, "started");
    dualWrite("currentBookingOrderId", data.orderId);
    setIdError("");
    navigate("/charging", {
      state: { ...data, fromPayment: true, totalMinutes: holdMinutes },
      replace: true,
    });
  };

  const onEnter = (e) => e.key === "Enter" && handleStart();

  // ===== 5) Loading / lỗi =====
  if (loading && !data) {
    return (
      <MainLayout>
        <div style={{ padding: 24 }}>Đang tải dữ liệu...</div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout>
        <div className="ps-root">
          <div className="ps-empty">
            <h2>Đơn đặt trước</h2>
            <p>{fetchError || "Không tìm thấy thông tin đơn."}</p>
            <Link className="ps-link is-back" to="/stations">
              <ArrowLeftOutlined /> Về danh sách trạm
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  // ===== 6) JSX UI =====
  return (
    <MainLayout>
      <div className="ps-root">
        <div className="ps-topbar">
          <Link className="ps-link is-back" to="/stations">
            <ArrowLeftOutlined /> Về danh sách trạm
          </Link>
        </div>

        <div className="ps-grid">
          <section className="ps-panel ps-pane-left">
            <div className="ps-success-block">
              <div className="ps-success-icon">
                <CheckCircleFilled />
              </div>
              <h2 className="ps-success-title">
                {data.success ? "Đơn đặt trước đã được xác nhận" : "Thanh toán thất bại"}
              </h2>
              <p className="ps-success-time">
                {new Date(data.paidAt).toLocaleTimeString("vi-VN")}{" "}
                {new Date(data.paidAt).toLocaleDateString("vi-VN")}
              </p>
            </div>

            <div className="ps-timer">{fmt(timeLeft)}</div>

            <div className="ps-form">
              <label className="ps-label">Nhập ID trụ hoặc súng để bắt đầu phiên sạc</label>
              <div className="ps-row">
                <input
                  className="ps-input"
                  placeholder="VD: EVS-12A-PORT1"
                  value={idInput}
                  onChange={(e) => setIdInput(e.target.value)}
                  onKeyDown={onEnter}
                />
                <button className="ps-btn" onClick={handleStart} disabled={timeLeft <= 0}>
                  Bắt đầu sạc
                </button>
              </div>

              {!!displayHints.length && (
                <p className="ps-hint">Gợi ý hợp lệ: {displayHints.join(" hoặc ")}</p>
              )}
              {!!idError && <p className="ps-error">{idError}</p>}
{timeLeft === 0 && <p className="ps-error">Hết thời gian giữ chỗ. Vui lòng đặt lại.</p>}
            </div>
          </section>

          <aside className="ps-panel ps-pane-right">
            <h3 className="ps-pane-title">Thông tin đặt chỗ</h3>
            <div className="ps-block">
              <div className="ps-block-head">Trụ sạc</div>
              <div className="ps-kv">
                <span className="ps-k">Trạm</span>
                <span className="ps-v">{data.station?.name ?? "—"}</span>
              </div>
              <div className="ps-kv">
                <span className="ps-k">Công suất</span>
                <span className="ps-v">{data.charger?.power ?? "—"}</span>
              </div>
              <div className="ps-kv">
                <span className="ps-k">Đầu nối</span>
                <span className="ps-v">{data.charger?.connector ?? "—"}</span>
              </div>
              <div className="ps-kv">
                <span className="ps-k">Súng/Cổng đã đặt</span>
                <span className="ps-v">
                  {[data.gun?.name, data.gun?.id].filter(Boolean).join(" — ") || "—"}
                </span>
              </div>
            </div>

            <div className="ps-block">
              <div className="ps-block-head">Chi phí</div>
              <div className="ps-kv">
                <span className="ps-k">Phí đặt chỗ</span>
                <span className="ps-v">{vnd(data.bookingFee)}</span>
              </div>
              <div className="ps-sep" />
              <div className="ps-kv ps-total">
                <span className="ps-k">
                  <b>Tổng</b>
                </span>
                <span className="ps-v">
                  <b>{vnd(data.bookingFee)}</b>
                </span>
              </div>
            </div>

            {(data?.contact?.fullName || data?.vehiclePlate) && (
              <div className="ps-block">
                <div className="ps-block-head">Khách hàng</div>
                {data?.contact?.fullName && (
                  <div className="ps-kv">
                    <span className="ps-k">Họ tên</span>
                    <span className="ps-v">{data.contact.fullName}</span>
                  </div>
                )}
                {data?.contact?.phone && (
                  <div className="ps-kv">
                    <span className="ps-k">SĐT</span>
                    <span className="ps-v">{data.contact.phone}</span>
                  </div>
                )}
                {data?.vehiclePlate && (
                  <div className="ps-kv">
                    <span className="ps-k">Biển số</span>
                    <span className="ps-v">{data.vehiclePlate}</span>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}