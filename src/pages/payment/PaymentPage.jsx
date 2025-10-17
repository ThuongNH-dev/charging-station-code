// src/pages/payment/PaymentPage.jsx
import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PaymentForm from "../../components/paymentCard/PaymentForm";
import { QRCodeCanvas } from "qrcode.react";
import MainLayout from "../../layouts/MainLayout";
import { ArrowLeftOutlined } from "@ant-design/icons";
import "./style/PaymentPage.css";

import { getApiBase, fetchAuthJSON } from "../../utils/api";
const API_BASE = getApiBase();

const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

/** ===== Helpers: decode JWT & get current userId ===== */
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
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}
function getUserIdFromToken() {
  const t = localStorage.getItem("token") || "";
  const p = decodeJwtPayload(t);
  // token hiện tại dùng claim nameidentifier
  const k = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
  const raw = p?.[k] ?? p?.sub ?? p?.userid ?? null;
  return raw != null ? Number(raw) : null;
}

/** Chuẩn hoá object booking trả từ BE */
function normalizeBooking(b = {}) {
  const id = b.id ?? b.bookingId ?? b.BookingId ?? b.Id;
  const customerId = b.customerId ?? b.CustomerId ?? b.userId ?? b.UserId;
  const price = Number(b.price ?? b.Price ?? b.totalAmount ?? b.TotalAmount ?? 0);
  const status = (b.status ?? b.Status ?? "").toString().toLowerCase();
  const createdAt =
    b.createdAt ?? b.CreatedAt ?? b.createDate ?? b.CreateDate ?? b.createdTime ?? null;
  const start = b.startTime ?? b.StartTime ?? b.start ?? b.Start ?? null;
  const stationId = b.stationId ?? b.StationId ?? b.station?.id ?? b.station?.StationId;
  const chargerId = b.chargerId ?? b.ChargerId ?? b.charger?.id ?? b.charger?.ChargerId;
  const gunId = b.gunId ?? b.GunId ?? b.gun?.id ?? b.gun?.GunId ?? b.portId ?? b.PortId;
  return { id, customerId, price, status, createdAt, start, stationId, chargerId, gunId };
}

/** ===== Helper: làm tròn giờ từ phút (min 1h, luôn tròn lên) ===== */
function ceilHoursFromMinutes(mins) {
  const m = Number(mins) || 0;
  return Math.max(1, Math.ceil(m / 60));
}

export default function PaymentPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // ===== Local states
  const [loading, setLoading] = useState(false);
  const [creatingVnpay, setCreatingVnpay] = useState(false);
  const [vnpayUrl, setVnpayUrl] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [payError, setPayError] = useState("");

  // Demo ví
  const [walletBalance, setWalletBalance] = useState(0);
  useEffect(() => {
    const saved = Number(localStorage.getItem("demo:walletBalance"));
    if (Number.isFinite(saved) && saved >= 0) setWalletBalance(saved);
    else {
      localStorage.setItem("demo:walletBalance", "150000");
      setWalletBalance(150000);
    }
  }, []);

  // Demo contact
  const contact = useMemo(
    () => ({
      fullName: "Nguyễn Văn A",
      email: "A.nguyen@example.com",
      phone: "0905123456",
    }),
    []
  );

  const [selectedPayment, setSelectedPayment] = useState(""); // 'visa' | 'mastercard' | 'qr' | 'wallet'
  const [formData, setFormData] = useState({
    cardNumber: "",
    cardHolder: "",
    expiryDate: "",
    cvv: "",
  });

  if (!state) {
    return (
      <div className="page-fallback">
        <h2>Thiếu thông tin đơn hàng</h2>
        <p>Vui lòng đặt lại từ trang danh sách trạm.</p>
        <button className="secondary-btn" onClick={() => navigate("/stations")}>
          <ArrowLeftOutlined /> Về danh sách trạm
        </button>
      </div>
    );
  }

  // ===== Order display info (FE)
  const orderId = useMemo(() => state.orderId || "ORD" + Date.now(), [state.orderId]);

  // ---- Tham số đầu vào và cách tính phí đặt chỗ ----
  // - feePerHour: đơn giá đặt chỗ theo giờ (ưu tiên nhận từ state)
  // - totalMinutes: số phút đặt (được làm tròn lên theo giờ khi tính tiền)
  const { station, charger, gun, totalMinutes, perMinute, startTime, baseline } = state;

  // Đơn giá theo giờ: ưu tiên feePerHour/bookingFeePerHour; fallback từ perMinute*60 để tương thích cũ
  const feePerHour = useMemo(() => {
    const direct =
      state.feePerHour ??
      state.bookingFeePerHour ??
      null;
    if (direct != null) return Number(direct) || 0;
    const pm = Number(perMinute) || 0; // fallback cũ
    return pm * 60;
  }, [state.feePerHour, state.bookingFeePerHour, perMinute]);

  // Số giờ tính phí (làm tròn lên, min 1h)
  const roundedHours = useMemo(
    () => ceilHoursFromMinutes(totalMinutes || 0),
    [totalMinutes]
  );

  // Tổng phí đặt chỗ: đơn giá giờ × số giờ (KHÔNG phải tiền sạc)
  const amount = useMemo(() => {
    return Math.max(0, Math.round(feePerHour * roundedHours));
  }, [feePerHour, roundedHours]);

  const pricePerHour = feePerHour; // alias cho dễ đọc khi render

  const onInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };
  const handleSelectPayment = (method) => {
    setSelectedPayment(method);
    setPayError("");
    if (method !== "qr") {
      setVnpayUrl("");
      setPaymentRef("");
    }
  };

  const buildSuccessPayload = (extra = {}) => {
    const payload = {
      orderId,
      station,
      charger,
      gun,
      startTime: startTime || "",
      baseline: baseline || "",
      totalMinutes: totalMinutes || 0,
      // lưu lại thông tin phí đặt chỗ (không phải tiền sạc)
      bookingFee: amount,
      roundedHours,
      pricePerHour,
      paidAt: Date.now(),
      paymentMethod: selectedPayment,
      contact,
      ...extra,
    };
    sessionStorage.setItem(`pay:${orderId}`, JSON.stringify(payload));
    return payload;
  };

  // ===== BookingId handling
  const [bookingId, setBookingId] = useState(state?.bookingId ?? null);
  const [bookingLoad, setBookingLoad] = useState(false);

  // Nếu không có bookingId từ state, fetch danh sách và chọn booking hợp lệ:
  // - thuộc đúng user hiện tại (theo token)
  // - đã có price > 0
  // - ưu tiên status hợp lệ và mới nhất
  useEffect(() => {
    if (bookingId) return;

    const fetchLatestBooking = async () => {
      setBookingLoad(true);
      try {
        const currentUserId = getUserIdFromToken();

        const res = await fetchAuthJSON(`${API_BASE}/Booking`, { method: "GET" });
        const list = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
        if (!list.length) throw new Error("Không tìm thấy booking nào của bạn.");

        const desired = {
          stationId: station?.id ?? station?.StationId,
          chargerId: charger?.id ?? charger?.ChargerId,
          gunId: gun?.id ?? gun?.GunId ?? gun?.portId ?? gun?.PortId,
        };

        const norm = list.map(normalizeBooking).filter((x) => x.id);
        // đúng user + có price
        let candidates = norm.filter(
          (x) =>
            (!currentUserId || x.customerId == currentUserId) &&
            Number(x.price) > 0 &&
            (!desired.stationId || x.stationId == desired.stationId) &&
            (!desired.chargerId || x.chargerId == desired.chargerId) &&
            (!desired.gunId || x.gunId == desired.gunId)
        );

        // nếu filter quá hẹp, nới lỏng về đúng user + có price
        if (!candidates.length) {
          candidates = norm.filter(
            (x) => (!currentUserId || x.customerId == currentUserId) && Number(x.price) > 0
          );
        }

        if (!candidates.length) {
          throw new Error(
            "Không có booking hợp lệ thuộc tài khoản hiện tại (hoặc booking chưa có giá)."
          );
        }

        const okStatuses = new Set(["pending", "reserved", "booked", "active"]);
        let filtered = candidates.filter((x) => okStatuses.has(x.status));
        if (!filtered.length) filtered = candidates;

        filtered.sort(
          (a, b) =>
            new Date(b.createdAt || b.start || 0) - new Date(a.createdAt || a.start || 0)
        );

        const pick = filtered[0];
        if (!pick?.id) throw new Error("Không xác định được booking hợp lệ.");
        setBookingId(pick.id);
      } catch (e) {
        setPayError(e?.message || "Không lấy được bookingId từ /Booking.");
      } finally {
        setBookingLoad(false);
      }
    };

    fetchLatestBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // ===== Create VNPAY URL with bookingId
  const createVnpayPayment = async () => {
    if (creatingVnpay) return null;
    setCreatingVnpay(true);
    setPayError("");

    try {
      if (!bookingId) {
        throw new Error("Thiếu bookingId. Vui lòng tạo/chọn booking trước khi thanh toán.");
      }

      // kiểm tra booking có price trước khi tạo payment (BE logic)
      try {
        const check = await fetchAuthJSON(`${API_BASE}/Booking/${bookingId}`, { method: "GET" });
        const hasPrice = Number(check?.price ?? check?.Price ?? 0) > 0;
        if (!hasPrice) throw new Error("Booking chưa có giá, không thể thanh toán.");
      } catch (e) {
        throw new Error(e?.message || "Không kiểm tra được giá của booking.");
      }

      const payload = {
        bookingId,
        returnUrl: `${window.location.origin}/payment/success?order=${orderId}`,
      };

      const res = await fetchAuthJSON(`${API_BASE}/Payment/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res?.success) throw new Error(res?.message || "Không tạo được URL thanh toán.");
      const url = res?.paymentUrl;
      if (!url) throw new Error("Backend không trả về paymentUrl.");

      // Lấy vnp_TxnRef để hiển thị
      let ref = "";
      try {
        const u = new URL(url);
        ref = u.searchParams.get("vnp_TxnRef") || "";
      } catch {}

      setVnpayUrl(url);
      setPaymentRef(ref || String(bookingId));
      return { url, ref: ref || String(bookingId) };
    } catch (err) {
      setPayError(err?.message || "Không tạo được phiên thanh toán VNPAY. Vui lòng thử lại.");
      setVnpayUrl("");
      setPaymentRef("");
      return null;
    } finally {
      setCreatingVnpay(false);
    }
  };

  // Auto-create VNPAY URL khi chọn QR và đã xác định bookingId
  useEffect(() => {
    if (selectedPayment === "qr" && bookingId && !vnpayUrl) {
      createVnpayPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPayment, bookingId, orderId]);

  const canPayByWallet = selectedPayment === "wallet" ? walletBalance >= amount : true;
  const payDisabled =
    loading ||
    !selectedPayment ||
    (selectedPayment === "wallet" && !canPayByWallet) ||
    (selectedPayment === "qr" && (!bookingId || creatingVnpay));

  const handlePay = async () => {
    if (!selectedPayment) return;
    if (selectedPayment === "wallet" && !canPayByWallet) return;

    setLoading(true);
    setPayError("");
    try {
      const baseExtra = { contact };

      if (selectedPayment === "wallet") {
        const before = walletBalance;
        const after = before - amount;
        localStorage.setItem("demo:walletBalance", String(after));
        setWalletBalance(after);

        const payload = buildSuccessPayload({
          ...baseExtra,
          walletBalanceBefore: before,
          walletBalanceAfter: after,
          paymentRef: `WAL-${orderId}`,
        });
        navigate(`/payment/success?order=${orderId}`, { state: payload, replace: true });
        return;
      }

      if (selectedPayment === "qr") {
        if (!bookingId) {
          setPayError("Chưa xác định được bookingId. Vui lòng thử lại.");
          return;
        }
        const created = await createVnpayPayment();
        if (!created?.url) return;
        // 👉 chuyển thẳng sang trang thanh toán VNPAY (cùng tab để tránh popup blocker)
        sessionStorage.setItem(`pay:${orderId}:pending`, "1");
        window.location.href = created.url;
        return;
      }

      // Card payments: demo
      const payload = buildSuccessPayload({
        ...baseExtra,
        paymentRef: `${selectedPayment.toUpperCase()}-${orderId}`,
      });
      navigate(`/payment/success?order=${orderId}`, { state: payload, replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="payment-page">
        <div className="payment-container">
          {/* LEFT COLUMN */}
          <div className="left-col">
            <div className="left-panel">
              <PaymentForm
                selectedPayment={selectedPayment}
                formData={formData}
                onSelectPayment={handleSelectPayment}
                onInputChange={onInputChange}
                walletBalance={walletBalance}
                amount={amount}
                contact={contact}
              />

              {selectedPayment === "qr" && (
                <div className="os-qr">
                  {!bookingId && (
                    <p className="os-warning">
                      Đang tìm booking phù hợp... {bookingLoad ? "(loading)" : ""}
                    </p>
                  )}

                  {vnpayUrl ? (
                    <>
                      <QRCodeCanvas value={vnpayUrl} size={180} includeMargin />
                      <p className="os-qr-hint">Quét mã QR để thanh toán qua VNPAY</p>
                      <p className="os-qr-mini">
                        Mã giao dịch: <b>{paymentRef || bookingId || orderId}</b>
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="os-qr-skeleton" />
                      <p className="os-qr-hint">
                        {bookingId
                          ? "Đang khởi tạo phiên thanh toán VNPAY..."
                          : "Chưa có bookingId"}
                      </p>
                    </>
                  )}
                  {!!payError && <p className="os-error">{payError}</p>}
                </div>
              )}

              {/* Actions */}
              <div className="os-actions">
                <button
                  onClick={handlePay}
                  className={`primary-btn ${payDisabled ? "disabled" : ""}`}
                  disabled={payDisabled}
                >
                  {selectedPayment === "qr"
                    ? creatingVnpay
                      ? "Đang khởi tạo..."
                      : "Xác nhận đã quét"
                    : "Thanh Toán"}
                </button>

                <button className="secondary-btn" onClick={() => navigate(-1)}>
                  <ArrowLeftOutlined /> Quay về
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="right-panel">
            <h2 className="os-title">Xác nhận đơn đặt trước</h2>

            <div className="os-block">
              <h3>1. Thông tin trụ sạc</h3>
              <p className="os-station-line">
                <b>{station?.name}</b> — {charger?.title} — Cổng <b>{gun?.name}</b>
              </p>
              <ul className="os-station-list">
                <li>Công suất: 60 kW</li>
                <li>Tình trạng trụ: Trống</li>
                <li>Loại cổng sạc: DC</li>
                <li>Tốc độ sạc:</li>
                <ul>
                  <li>8 – 12 tiếng cho ô tô</li>
                  <li>4 – 6 tiếng cho xe máy điện</li>
                </ul>
              </ul>
            </div>

            <div className="os-block">
              <h3>2. Chi phí (phí đặt chỗ, không phải tiền sạc)</h3>
              <table className="os-table">
                <tbody>
                  <tr>
                    <td>Đơn giá đặt chỗ theo giờ</td>
                    <td className="os-right">{vnd(pricePerHour)}</td>
                  </tr>
                  <tr>
                    <td>Số giờ đặt (làm tròn lên, tối thiểu 1h)</td>
                    <td className="os-right">{roundedHours} giờ</td>
                  </tr>
                  <tr>
                    <td>Phí đặt chỗ</td>
                    <td className="os-right">{vnd(amount)}</td>
                  </tr>
                  <tr>
                    <td>Tạm tính</td>
                    <td className="os-right">{vnd(amount)}</td>
                  </tr>
                  <tr>
                    <td>Giảm giá</td>
                    <td className="os-right">0%</td>
                  </tr>
                  <tr className="os-total">
                    <td>
                      <b>Tổng</b>
                    </td>
                    <td className="os-right">
                      <b>{vnd(amount)}</b>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="os-note">
                Lưu ý: Đây là <b>phí đặt chỗ</b> cho khoảng thời gian bạn giữ trụ, không phải tiền điện sạc.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
