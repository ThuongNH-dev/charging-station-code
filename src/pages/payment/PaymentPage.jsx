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

/** ===== Helpers: decode JWT & get current user claims ===== */
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

function getClaimsFromToken() {
  const t = localStorage.getItem("token") || "";
  const p = decodeJwtPayload(t) || {};

  const NAME_ID = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
  const EMAIL_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress";
  const NAME_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";

  const accountId =
    p[NAME_ID] != null
      ? Number(p[NAME_ID])
      : p.sub != null
        ? Number(p.sub)
        : p.userid != null
          ? Number(p.userid)
          : null;

  const username =
    p.unique_name ??
    p.preferred_username ??
    p.username ??
    p.userName ??
    p[NAME_CLAIM] ??
    null;

  const email = p.email ?? p[EMAIL_CLAIM] ?? null;

  // Một số hệ thống đẩy thẳng customerId vào token
  const customerId =
    p.customerId ??
    p.CustomerId ??
    null;

  return { accountId, username, email, customerId };
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

/** ===== Chuẩn hoá Account/Customer -> contact ===== */
function normalizeAccount(raw) {
  if (!raw || typeof raw !== "object") {
    return { fullName: "", email: "", phone: "" };
  }
  const userName = raw.userName ?? raw.username ?? raw.email ?? "";
  const emailGuess = /\S+@\S+\.\S+/.test(String(userName)) ? String(userName) : "";

  const c =
    Array.isArray(raw.customers) && raw.customers.length
      ? raw.customers[0]
      : raw.customer || null;

  const phone = c?.phone ?? raw.phone ?? "";

  const fullNameGuess =
    c?.fullName ??
    raw.fullName ??
    raw.name ??
    (emailGuess ? emailGuess.split("@")[0] : (userName || ""));

  return {
    fullName: String(fullNameGuess ?? "").trim(),
    email: String(emailGuess || raw.email || c?.email || "").trim(),
    phone: String(phone || "").trim(),
  };
}

/** ===== Chọn đúng user record từ kết quả /api/Auth ===== */
function pickCurrentUserRecord(data, claims) {
  if (!data) return null;
  if (!Array.isArray(data)) return data;

  const { accountId, username, email } = claims;

  let found =
    data.find(
      (x) =>
        Number(x.accountId ?? x.id ?? x.AccountId ?? x.Id) === Number(accountId)
    ) || null;

  if (!found && username) {
    found =
      data.find((x) => {
        const u = String(x.userName ?? x.username ?? "").toLowerCase();
        return u && u === String(username).toLowerCase();
      }) || null;
  }

  if (!found && email) {
    found =
      data.find((x) => {
        const e =
          String(x.email ?? x.userName ?? x.username ?? "").toLowerCase();
        return e === String(email).toLowerCase();
      }) || null;
  }

  return found || null;
}

/** ===== Chuẩn hoá response Vehicle -> mảng items ===== */
function extractVehicleItems(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.items)) return res.items;
  if (res.item) return [res.item];
  return [];
}

/** ===== Dual-write helpers (session + local) ===== */
function saveOrderBlob(orderId, obj) {
  const key = `pay:${orderId}`;
  try { sessionStorage.setItem(key, JSON.stringify(obj)); } catch { }
  try { localStorage.setItem(key, JSON.stringify(obj)); } catch { }
  try { sessionStorage.setItem("pay:lastOrderId", orderId); } catch { }
  try { localStorage.setItem("pay:lastOrderId", orderId); } catch { }
}
function readOrderBlob(orderId) {
  const key = `pay:${orderId}`;
  let s = null;
  try { s = sessionStorage.getItem(key); } catch { }
  if (!s) {
    try { s = localStorage.getItem(key); } catch { }
  }
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

export default function PaymentPage() {
  const { state } = useLocation();
  // Fallback: nếu thiếu state/bookingId, cố lấy lại từ sessionStorage
  const stateRef = React.useRef(state);
  if (!stateRef.current) {
    try {
      const lastOrder = sessionStorage.getItem("pay:lastOrderId");
      if (lastOrder) {
        const s = sessionStorage.getItem(`pay:${lastOrder}:ctx`);
        if (s) stateRef.current = JSON.parse(s);
      }
    } catch { }
  }

  const navigate = useNavigate();

  // ===== Local states
  const [loading, setLoading] = useState(false);
  const [creatingVnpay, setCreatingVnpay] = useState(false);
  const [vnpayUrl, setVnpayUrl] = useState(state?.vnpayUrl || ""); // ưu tiên URL từ BookingPorts
  const [paymentRef, setPaymentRef] = useState("");
  const [payError, setPayError] = useState("");

  // ===== Contact đúng user đang đăng nhập
  const [contact, setContact] = useState({ fullName: "", email: "", phone: "" });
  const [contactLoad, setContactLoad] = useState(true);
  const [contactErr, setContactErr] = useState("");

  // ===== Vehicle (biển số)
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleLoad, setVehicleLoad] = useState(false);
  const [vehicleErr, setVehicleErr] = useState("");

  // ===== Đồng bộ số tiền với booking
  const [bookingId, setBookingId] = useState(state?.bookingId ?? null);
  const [bookingLoad] = useState(false);
  const [bookingPrice, setBookingPrice] = useState(null); // giá thật từ BE
  

  // 1) Lấy hồ sơ user + customerId (PATCH: thêm fallback claims & /Customers/me)
  const [currentCustomerId, setCurrentCustomerId] = useState(null);
  useEffect(() => {
    let mounted = true;

    (async () => {
      setContactLoad(true);
      setContactErr("");

      // Điền nhanh từ token để UI có tên/email trước
      const claims = getClaimsFromToken();
      if (claims?.username || claims?.email) {
        setContact((p) => ({
          fullName: p.fullName || String(claims.username || "").trim(),
          email: p.email || String(claims.email || "").trim(),
          phone: p.phone || "",
        }));
      }

      try {
        // Thử nhiều đường lấy hồ sơ
        let authRes = null;
        try {
          authRes = await fetchAuthJSON(`/Auth`, { method: "GET" });
        } catch {
          try { authRes = await fetchAuthJSON(`${API_BASE}/Auth`, { method: "GET" }); } catch { }
        }

        let record = pickCurrentUserRecord(authRes, claims);

        if (!record && claims?.accountId != null) {
          try {
            record = await fetchAuthJSON(`${API_BASE}/Account/${claims.accountId}`, { method: "GET" });
          } catch { }
        }

        if (!record) {
          record = {
            userName: claims?.username || "",
            email: claims?.email || "",
            customers: [],
          };
        }

        const normalized = normalizeAccount(record);

        // Rút customerId ưu tiên trong profile; nếu không có -> từ token; cuối cùng thử /Customers/me
        let cid =
          record?.customers?.[0]?.customerId ??
          record?.customerId ??
          record?.Customers?.[0]?.CustomerId ??
          claims?.customerId ??
          null;

        if (!cid) {
          try {
            const meCus = await fetchAuthJSON(`${API_BASE}/Customers/me`, { method: "GET" });
            cid = meCus?.customerId ?? meCus?.CustomerId ?? null;
          } catch { }
        }

        if (mounted) {
          setContact(normalized);
          setCurrentCustomerId(cid || null);
        }
      } catch (e) {
        if (mounted) setContactErr(e?.message || "Không tải được thông tin liên hệ.");
      } finally {
        if (mounted) setContactLoad(false);
      }
    })();

    return () => { mounted = false; };
  }, [API_BASE]);

  // 2) Lấy vehicle theo customerId -> licensePlate (có fallback /Customers/me ở trên)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!currentCustomerId) return;
      setVehicleLoad(true);
      setVehicleErr("");
      try {
        const paths = [
          `/Vehicles?customerId=${currentCustomerId}`,
          `/Vehicles`,
          `/Vehicle?customerId=${currentCustomerId}`,
          `/Vehicle`,
        ];

        let items = [];
        for (const p of paths) {
          try {
            const res = await fetchAuthJSON(`${API_BASE}${p}`, { method: "GET" });
            const list = extractVehicleItems(res);
            if (list.length) {
              items = list;
              break;
            }
          } catch { }
        }

        if (!items.length) throw new Error("Không tìm thấy phương tiện của bạn.");

        let mine = items.filter((v) => Number(v.customerId ?? v.CustomerId) === Number(currentCustomerId));
        if (!mine.length) mine = items;

        mine.sort((a, b) => {
          const sa = String(a.status ?? a.Status ?? "").toLowerCase() === "active" ? 1 : 0;
          const sb = String(b.status ?? b.Status ?? "").toLowerCase() === "active" ? 1 : 0;
          return sb - sa;
        });

        const chosen = mine[0];
        const plate = chosen?.licensePlate ?? chosen?.LicensePlate ?? "";
        if (!plate) throw new Error("Xe không có trường licensePlate.");

        if (mounted) setVehiclePlate(String(plate));
      } catch (e) {
        if (mounted) setVehicleErr(e?.message || "Không lấy được biển số xe.");
      } finally {
        if (mounted) setVehicleLoad(false);
      }
    })();
    return () => { mounted = false; };
  }, [currentCustomerId, API_BASE]);

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

  const [selectedPayment, setSelectedPayment] = useState(""); // 'visa' | 'mastercard' | 'qr' | 'wallet'
  const [formData, setFormData] = useState({
    cardNumber: "",
    cardHolder: "",
    expiryDate: "",
    cvv: "",
  });

  const { station, charger, gun, totalMinutes, perMinute, startTime, baseline } = state || {};
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
  const orderId = useMemo(() => state?.orderId || "ORD" + Date.now(), [state?.orderId]);

  // ---- Tham số đầu vào và cách tính phí đặt chỗ (fallback) ----
  const feePerHourFallback = useMemo(() => {
    const direct = state.feePerHour ?? state.bookingFeePerHour ?? null;
    if (direct != null) return Number(direct) || 0;
    const pm = Number(perMinute) || 0;
    return pm * 60;
  }, [state?.feePerHour, state?.bookingFeePerHour, perMinute]);

  const roundedHoursFallback = useMemo(
    () => ceilHoursFromMinutes(totalMinutes || 0),
    [totalMinutes]
  );

  const amountFallback = useMemo(
    () => Math.max(0, Math.round(feePerHourFallback * roundedHoursFallback)),
    [feePerHourFallback, roundedHoursFallback]
  );

  // ==== Đồng bộ số tiền với Booking (quan trọng để khớp VNPAY) ====
  useEffect(() => {
    if (!bookingId) return;
    (async () => {
      try {
        const b = await fetchAuthJSON(`${API_BASE}/Booking/${bookingId}`, { method: "GET" });
        const price = Number(b?.price ?? b?.Price ?? 0);
        if (price > 0) setBookingPrice(price);
      } catch {
        // Không chặn, vẫn dùng fallback nếu lỗi
      }
    })();
  }, [bookingId, API_BASE]);

  // Giá hiển thị cuối cùng (ưu tiên giá booking từ BE)
  const pricePerHour = feePerHourFallback; // giữ cho bảng hiển thị
  const roundedHours = roundedHoursFallback;
  const amount = amountFallback;

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
      bookingFee: amount,
      roundedHours,
      pricePerHour,
      paidAt: Date.now(),
      paymentMethod: selectedPayment,
      contact,
      vehiclePlate,
      ...extra,
    };
    saveOrderBlob(orderId, payload);
    return payload;
  };

  // Nếu đã có vnpayUrl từ BookingPorts, auto chọn QR và rút mã tham chiếu
  useEffect(() => {
    if (state?.vnpayUrl) {
      setSelectedPayment("qr");
      setVnpayUrl(state.vnpayUrl);
      try {
        const u = new URL(state.vnpayUrl);
        const ref = u.searchParams.get("vnp_TxnRef") || "";
        setPaymentRef(ref || String(state?.bookingId || orderId));
      } catch {
        setPaymentRef(String(state?.bookingId || orderId));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Create VNPAY URL (chỉ khi chưa có URL từ state)
  const createVnpayPayment = async () => {
    if (creatingVnpay) return null;
    setCreatingVnpay(true);
    setPayError("");

    try {
      if (!bookingId) {
        throw new Error("Thiếu bookingId. Vui lòng tạo/chọn booking trước khi thanh toán.");
      }

      let bePrice = null;
      try {
        const check = await fetchAuthJSON(`${API_BASE}/Booking/${bookingId}`, { method: "GET" });
        const hasPrice = Number(check?.price ?? check?.Price ?? 0) > 0;
        if (!hasPrice) throw new Error("Booking chưa có giá, không thể thanh toán.");
        bePrice = Number(check?.price ?? check?.Price ?? 0);
        setBookingPrice(bePrice);
      } catch (e) {
        throw new Error(e?.message || "Không kiểm tra được giá của booking.");
      }

      const payload = {
        bookingId,
        expectedAmount: bePrice || amount,
        orderId,
        minutes: totalMinutes,
        roundedHours,
        returnUrl: `${window.location.origin}/vnpay-bridge.html?order=${orderId}`,
      };

      const res = await fetchAuthJSON(`${API_BASE}/Payment/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res?.success) throw new Error(res?.message || "Không tạo được URL thanh toán.");
      const url = res?.paymentUrl;
      if (!url) throw new Error("Backend không trả về paymentUrl.");

      // Kiểm tra số tiền gửi tới VNPAY
      let vnpAmount = null;
      try {
        const u = new URL(url);
        const raw = u.searchParams.get("vnp_Amount"); // VND*100
        if (raw) vnpAmount = Number(raw);
      } catch { }

      const expected = (bePrice || amount);
      const expectedScaled = Math.round(expected * 100);
      if (!vnpAmount || Math.abs(vnpAmount - expectedScaled) >= 1) {
        throw new Error(
          `BE đang gửi sai số tiền cho VNPAY. expected=${expected.toLocaleString("vi-VN")}đ `
          + `→ vnp_Amount=${expectedScaled}, nhưng URL có vnp_Amount=${vnpAmount || "∅"}`
        );
      }

      let ref = "";
      try {
        const u = new URL(url);
        ref = u.searchParams.get("vnp_TxnRef") || "";
      } catch { }

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

  // Auto-create VNPAY URL khi chọn QR và đã xác định bookingId — nhưng chỉ khi CHƯA có url
  useEffect(() => {
    if (selectedPayment === "qr" && bookingId && !vnpayUrl) {
      createVnpayPayment();
    }
  }, [selectedPayment, bookingId, orderId, vnpayUrl]); // đã thêm vnpayUrl để tránh lặp

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
          vehiclePlate,
        });
        navigate(`/payment/success?order=${orderId}`, { state: payload, replace: true });
        return;
      }

      if (selectedPayment === "qr") {
        if (!bookingId) {
          setPayError("Chưa xác định được bookingId. Vui lòng thử lại.");
          return;
        }

        // Nếu state đã có vnpayUrl sẵn thì dùng luôn; nếu chưa có thì tạo.
        let url = vnpayUrl;
        if (!url) {
          const created = await createVnpayPayment();
          if (!created?.url) return;
          url = created.url;
        }

        // Lưu stub để PaymentSuccess dùng ngay khi quay về
        const stub = {
          orderId,
          bookingId,
          station,
          charger,
          gun,
          startTime: startTime || "",
          baseline: baseline || "",
          totalMinutes: totalMinutes || 0,
          bookingFee: amount,
          roundedHours,
          pricePerHour,
          paymentMethod: "vnpay",
          contact,
          vehiclePlate,
          paidAt: Date.now(),
        };
        saveOrderBlob(orderId, stub);
        try { sessionStorage.setItem(`pay:${orderId}:pending`, "1"); } catch { }
        try { localStorage.setItem(`pay:${orderId}:pending`, "1"); } catch { }

        window.location.href = url;
        return;
      }

      const payload = buildSuccessPayload({
        ...baseExtra,
        paymentRef: `${selectedPayment.toUpperCase()}-${orderId}`,
        vehiclePlate,
      });
      navigate(`/payment/success?order=${orderId}`, { state: payload, replace: true });
    } finally {
      setLoading(false);
    }
  };

  // Nếu đã có vnpayUrl từ state => auto chọn "qr" & hiển thị QR ngay
  useEffect(() => {
    if (state?.vnpayUrl) {
      setSelectedPayment("qr");
    }
  }, [state?.vnpayUrl]);

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
                vehiclePlate={vehiclePlate}
              />

              {contactLoad && <p className="os-warning">Đang tải thông tin liên hệ...</p>}
              {!contactLoad && contactErr && <p className="os-error">{contactErr}</p>}
              {!!vehicleErr && <p className="os-error">{vehicleErr}</p>}

              {selectedPayment === "qr" && (
                <div className="os-qr">
                  {!bookingId && (
                    <p className="os-warning">
                      Đang tìm booking phù hợp...
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
                <li>Công suất: {charger?.power || "—"}</li>
                <li>Tình trạng trụ: {charger?.status || "—"}</li>
                <li>Loại cổng sạc: {charger?.connector || "—"}</li>
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
                    <td><b>Tổng</b></td>
                    <td className="os-right"><b>{vnd(amount)}</b></td>
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
