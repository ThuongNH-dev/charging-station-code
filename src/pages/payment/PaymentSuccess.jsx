import React, { useMemo, useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
  Link,
  useSearchParams,
} from "react-router-dom";
import { CheckCircleFilled, ArrowLeftOutlined } from "@ant-design/icons";
import MainLayout from "../../layouts/MainLayout";
import "./style/PaymentSuccess.css";

// ---------------- Constants ----------------
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";
const HOLD_MINUTES_DEFAULT = 15;
const VERIFY_URL = "https://localhost:7268/api/payment/vnpay-callback"; // Thay URL BE

export default function PaymentSuccess() {
  const { state } = useLocation();
  const [search] = useSearchParams();
  const navigate = useNavigate();

  // ---------------- State ----------------
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [timeLeft, setTimeLeft] = useState(0);
  const [idInput, setIdInput] = useState("");
  const [idError, setIdError] = useState("");

  // ---------------- 1. Lấy dữ liệu từ state hoặc API BE ----------------
  // ---------------- 1. Lấy dữ liệu từ state hoặc API BE ----------------
  useEffect(() => {
    // Trường hợp đi từ ví/card: có state => hiển thị luôn
    if (state) {
      setData(state);
      setLoading(false);
      return;
    }

    // Trường hợp quay về từ VNPAY: không có state => đọc query
    const order = search.get("order");
    if (!order) {
      setLoading(false);
      return;
    }

    // Gửi nguyên query (chứa vnp_*) lên BE để verify
    const qs = window.location.search; // ?vnp_Amount=...&...&order=...

    fetch(`${VERIFY_URL}${qs}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Không thể xác minh thanh toán");
        // BE của bạn có thể trả JSON hoặc text "OK"
        return res
          .json()
          .catch(() => ({})); // nếu không parse JSON được, coi như {}
      })
      .then((json) => {
        // Nếu BE trả success=false -> điều hướng sang Failure
        if (json?.success === false) {
          navigate(`/payment/failure?order=${order}`, {
            state: { message: json?.message || "Thanh toán thất bại hoặc bị hủy." },
            replace: true,
          });
          return;
        }

        // Nếu BE không trả JSON chi tiết (hoặc là {}), fallback session/local
        if (!json || Object.keys(json).length === 0) {
          const local = sessionStorage.getItem(`pay:${order}`);
          if (local) {
            try {
              const parsed = JSON.parse(local);
              setData(parsed);
              setFetchError("Đang hiển thị dữ liệu tạm (BE không trả chi tiết).");
              return;
            } catch { }
          }
          // Tối thiểu dựng data cơ bản từ query để hiển thị
          setData({
            orderId: order,
            bookingFee: Number(search.get("vnp_Amount") || 0) / 100, // VNPay trả số tiền * 100
            paidAt: Date.now(),
            station: {},
            charger: {},
            gun: {},
            paymentMethod: "vnpay",
          });
          return;
        }

        // Có JSON chi tiết từ BE
        setData(json);
        sessionStorage.setItem(`pay:${order}`, JSON.stringify(json));
      })
      .catch((err) => {
        console.error(err);
        // Fallback session nếu có
        const local = sessionStorage.getItem(`pay:${order}`);
        if (local) {
          setData(JSON.parse(local));
          setFetchError("Đang hiển thị dữ liệu tạm. Không xác minh được từ máy chủ.");
        } else {
          setFetchError(err?.message || "Không lấy được thông tin đơn. Vui lòng thử lại.");
        }
      })
      .finally(() => {
        setLoading(false);
        sessionStorage.removeItem(`pay:${order}:pending`); // xoá cờ pending nếu có
      });
  }, [state, search, navigate]);


  // ---------------- 2. Điều hướng nếu đã start/done ----------------
  useEffect(() => {
    if (!data) return;
    const { orderId } = data;
    sessionStorage.setItem("currentBookingOrderId", orderId);

    const lock = sessionStorage.getItem(`bookingLocked:${orderId}`);
    if (lock === "started") {
      navigate("/charging", { state: data, replace: true });
    } else if (lock === "done") {
      const last = sessionStorage.getItem("lastChargePayOrderId");
      if (last) {
        const cached = sessionStorage.getItem(`chargepay:${last}`);
        const toState = cached ? JSON.parse(cached) : undefined;
        navigate(`/payment/charging?order=${last}`, {
          state: toState,
          replace: true,
        });
      } else {
        navigate("/stations", { replace: true });
      }
    }
  }, [data, navigate]);

  // ---------------- 3. Countdown thời gian giữ chỗ ----------------
  const holdMinutes =
    data?.totalMinutes && data.totalMinutes > 0
      ? data.totalMinutes
      : HOLD_MINUTES_DEFAULT;
  const totalSeconds = Math.max(0, Math.floor(holdMinutes * 60));

  const calcRemaining = () => {
    const elapsed = Math.floor(
      (Date.now() - (data?.paidAt || Date.now())) / 1000
    );
    return Math.max(0, totalSeconds - elapsed);
  };

  useEffect(() => {
    if (!data) return;
    setTimeLeft(calcRemaining());
    const timer = setInterval(() => {
      setTimeLeft(calcRemaining());
    }, 1000);
    return () => clearInterval(timer);
  }, [data, totalSeconds]);

  const fmt = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // ---------------- 4. Verify ID trụ / súng ----------------
  const norm = (s) =>
    (s || "").toString().trim().toLowerCase().replace(/\s+/g, "");

  const allowedIds = useMemo(() => {
    if (!data) return [];
    const raw = [];
    if (data.gun?.id) raw.push(String(data.gun.id));
    if (data.gun?.name) raw.push(String(data.gun.name));
    if (data.charger?.id) raw.push(String(data.charger.id));
    if (data.charger?.title) raw.push(String(data.charger.title));
    if (data.charger?.id && data.gun?.id)
      raw.push(`${data.charger.id}-${data.gun.id}`);
    if (data.charger?.id && data.gun?.name)
      raw.push(`${data.charger.id}-${data.gun.name}`);
    return Array.from(new Set(raw.filter(Boolean).map(norm)));
  }, [data]);

  const displayHints = useMemo(() => {
    if (!data) return [];
    const hints = [];
    if (data.gun?.id) hints.push(String(data.gun.id));
    if (data.gun?.name) hints.push(String(data.gun.name));
    if (data.charger?.id) hints.push(String(data.charger.id));
    if (data.charger?.title) hints.push(String(data.charger.title));
    if (data.charger?.id && data.gun?.id)
      hints.push(`${data.charger.id}-${data.gun.id}`);
    if (data.charger?.id && data.gun?.name)
      hints.push(`${data.charger.id}-${data.gun.name}`);
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

    sessionStorage.setItem(`bookingLocked:${data.orderId}`, "started");
    sessionStorage.setItem("currentBookingOrderId", data.orderId);
    setIdError("");
    navigate("/charging", {
      state: { ...data, fromPayment: true, totalMinutes: holdMinutes },
      replace: true,
    });
  };

  const onEnter = (e) => e.key === "Enter" && handleStart();

  // ---------------- 5. Hiển thị loading / lỗi ----------------
  if (loading) {
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

  // ---------------- 6. JSX hiển thị ----------------
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
                Đơn đặt trước đã được xác nhận
              </h2>
              <p className="ps-success-time">
                {new Date(data.paidAt).toLocaleTimeString("vi-VN")}{" "}
                {new Date(data.paidAt).toLocaleDateString("vi-VN")}
              </p>
            </div>

            <div className="ps-timer">{fmt(timeLeft)}</div>

            <div className="ps-form">
              <label className="ps-label">
                Nhập ID trụ hoặc súng để bắt đầu phiên sạc
              </label>
              <div className="ps-row">
                <input
                  className="ps-input"
                  placeholder={
                    data.charger?.id && data.gun?.id
                      ? `VD: ${data.charger.id}-${data.gun.id}`
                      : data.gun?.id
                        ? `VD: ${data.gun.id}`
                        : "VD: EVS-12A-PORT1"
                  }
                  value={idInput}
                  onChange={(e) => setIdInput(e.target.value)}
                  onKeyDown={onEnter}
                />
                <button
                  className="ps-btn"
                  onClick={handleStart}
                  disabled={timeLeft <= 0}
                >
                  Bắt đầu sạc
                </button>
              </div>

              {!!displayHints.length && (
                <p className="ps-hint">
                  Gợi ý hợp lệ: {displayHints.join(" hoặc ")}
                </p>
              )}
              {!!idError && <p className="ps-error">{idError}</p>}
              {timeLeft === 0 && (
                <p className="ps-error">
                  Hết thời gian giữ chỗ. Vui lòng đặt lại.
                </p>
              )}
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
                  {[data.gun?.name, data.gun?.id].filter(Boolean).join(" — ") ||
                    "—"}
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
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}
