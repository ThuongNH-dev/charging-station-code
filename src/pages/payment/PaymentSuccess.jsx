import React, { useMemo, useEffect, useState } from "react";
import { useLocation, useNavigate, Link, useSearchParams } from "react-router-dom";
import { CheckCircleFilled, ArrowLeftOutlined } from "@ant-design/icons";
import MainLayout from "../../layouts/MainLayout";
import "./PaymentSuccess.css";

const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";
const HOLD_MINUTES_DEFAULT = 15; // ⬅️ fallback nếu totalMinutes không có/<=0

export default function PaymentSuccess() {
  const { state } = useLocation();
  const [search] = useSearchParams();
  const navigate = useNavigate();

  const data = useMemo(() => {
    if (state) return state;
    const order = search.get("order");
    if (!order) return null;
    const cached = sessionStorage.getItem(`pay:${order}`);
    return cached ? JSON.parse(cached) : null;
  }, [state, search]);

  // 🚫 Cấm quay lại trang này khi đã start/done
  useEffect(() => {
    if (!data) return;
    const { orderId } = data;
    // ghi nhớ booking hiện tại (để PaymentPage có thể chặn)
    sessionStorage.setItem("currentBookingOrderId", orderId);

    const lock = sessionStorage.getItem(`bookingLocked:${orderId}`);
    if (lock === "started") {
      navigate("/charging", { state: data, replace: true });
    } else if (lock === "done") {
      const last = sessionStorage.getItem("lastChargePayOrderId");
      if (last) {
        const cached = sessionStorage.getItem(`chargepay:${last}`);
        const toState = cached ? JSON.parse(cached) : undefined;
        navigate(`/payment/charging?order=${last}`, { state: toState, replace: true });
      } else {
        navigate("/stations", { replace: true });
      }
    }
  }, [data, navigate]);

  if (!data) {
    return (
      <MainLayout>
        <div className="ps-root">
          <div className="ps-empty">
            <h2>Đơn đặt trước</h2>
            <p>Không tìm thấy thông tin đơn — có thể bạn đã tải lại trang.</p>
            <Link className="ps-link is-back" to="/stations">
              <ArrowLeftOutlined /> Về danh sách trạm
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const { orderId, station, charger, gun, bookingFee, paidAt, totalMinutes: totalMinutesRaw = 0 } = data;

  // 🕒 Đếm ngược (mặc định 15' nếu không có totalMinutes)
  const holdMinutes = totalMinutesRaw > 0 ? totalMinutesRaw : HOLD_MINUTES_DEFAULT;
  const totalSeconds = Math.max(0, Math.floor(holdMinutes * 60));
  const calcRemaining = () => {
    const elapsed = Math.floor((Date.now() - (paidAt || Date.now())) / 1000);
    return Math.max(0, totalSeconds - elapsed);
  };
  const [timeLeft, setTimeLeft] = useState(calcRemaining());
  useEffect(() => {
    const t = setInterval(() => {
      const left = calcRemaining();
      setTimeLeft(left);
      if (left <= 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [paidAt, totalSeconds]);

  const fmt = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // ===== VERIFY ID (hỗ trợ chargerId, gunId, và chuỗi ghép chargerId-gunId) =====
  const [idInput, setIdInput] = useState("");
  const [idError, setIdError] = useState("");

  const norm = (s) =>
    (s || "").toString().trim().toLowerCase().replace(/\s+/g, "");

  const allowedIds = useMemo(() => {
    const raw = [];
    if (gun?.id) raw.push(String(gun.id));
    if (gun?.name) raw.push(String(gun.name));
    if (charger?.id) raw.push(String(charger.id));
    if (charger?.title) raw.push(String(charger.title));
    if (charger?.id && gun?.id) raw.push(`${charger.id}-${gun.id}`);
    if (charger?.id && gun?.name) raw.push(`${charger.id}-${gun.name}`);
    return Array.from(new Set(raw.filter(Boolean).map(norm)));
  }, [gun, charger]);

  const displayHints = useMemo(() => {
    const hints = [];
    if (gun?.id) hints.push(String(gun.id));
    if (gun?.name) hints.push(String(gun.name));
    if (charger?.id) hints.push(String(charger.id));
    if (charger?.title) hints.push(String(charger.title));
    if (charger?.id && gun?.id) hints.push(`${charger.id}-${gun.id}`);
    if (charger?.id && gun?.name) hints.push(`${charger.id}-${gun.name}`);
    return Array.from(new Set(hints));
  }, [gun, charger]);

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

    // 🔒 Khoá PaymentSuccess cho order này & ghi nhớ booking hiện tại
    sessionStorage.setItem(`bookingLocked:${orderId}`, "started");
    sessionStorage.setItem("currentBookingOrderId", orderId);

    setIdError("");
    navigate("/charging", {
      state: { orderId, station, charger, gun, bookingFee, paidAt, totalMinutes: holdMinutes, fromPayment: true },
      replace: true,
    });
  };

  const onEnter = (e) => e.key === "Enter" && handleStart();

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
              <div className="ps-success-icon"><CheckCircleFilled /></div>
              <h2 className="ps-success-title">Đơn đặt trước đã được xác nhận</h2>
              <p className="ps-success-time">
                {new Date(paidAt).toLocaleTimeString("vi-VN")} {new Date(paidAt).toLocaleDateString("vi-VN")}
              </p>
            </div>

            <div className="ps-timer">{fmt(timeLeft)}</div>

            <div className="ps-form">
              <label className="ps-label">Nhập ID trụ hoặc súng để bắt đầu phiên sạc</label>
              <div className="ps-row">
                <input
                  className="ps-input"
                  placeholder={
                    charger?.id && gun?.id
                      ? `VD: ${charger.id}-${gun.id}`
                      : gun?.id
                      ? `VD: ${gun.id}`
                      : "VD: EVS-12A-PORT1"
                  }
                  value={idInput}
                  onChange={(e) => setIdInput(e.target.value)}
                  onKeyDown={onEnter}
                />
                <button className="ps-btn" onClick={handleStart} disabled={timeLeft <= 0}>
                  Bắt đầu sạc
                </button>
              </div>

              {!!displayHints.length && (
                <p className="ps-hint" style={{ marginTop: 8 }}>
                  Gợi ý hợp lệ: {displayHints.join(" hoặc ")}
                </p>
              )}
              {!!idError && <p className="ps-error">{idError}</p>}
              {timeLeft === 0 && (
                <p className="ps-error" style={{ marginTop: 8 }}>
                  Hết thời gian giữ chỗ. Vui lòng đặt lại.
                </p>
              )}
            </div>
          </section>

          <aside className="ps-panel ps-pane-right">
            <h3 className="ps-pane-title">Thông tin đặt chỗ</h3>
            <div className="ps-block">
              <div className="ps-block-head">Trụ sạc</div>
              <div className="ps-kv"><span className="ps-k">Trạm</span><span className="ps-v">{station?.name ?? "—"}</span></div>
              <div className="ps-kv"><span className="ps-k">Công suất</span><span className="ps-v">{charger?.power ?? "—"}</span></div>
              <div className="ps-kv"><span className="ps-k">Đầu nối</span><span className="ps-v">{charger?.connector ?? "—"}</span></div>
              <div className="ps-kv">
                <span className="ps-k">Súng/Cổng đã đặt</span>
                <span className="ps-v">{[gun?.name, gun?.id].filter(Boolean).join(" — ") || "—"}</span>
              </div>
            </div>

            <div className="ps-block">
              <div className="ps-block-head">Chi phí</div>
              <div className="ps-kv"><span className="ps-k">Phí đặt chỗ</span><span className="ps-v">{vnd(bookingFee)}</span></div>
              <div className="ps-sep" />
              <div className="ps-kv ps-total"><span className="ps-k"><b>Tổng</b></span><span className="ps-v"><b>{vnd(bookingFee)}</b></span></div>
            </div>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}
