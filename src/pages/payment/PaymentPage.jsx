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

  return { accountId, username, email };
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

/** ===== fetch helper với retry ngắn ===== */
async function fetchJSONwithRetry(url, init = {}, retries = 2, delayMs = 600) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (i < retries) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }
  throw lastErr;
}

/** ===== Tạo VNPAY Payment (robust) ===== */
async function robustCreateVnpay({ bookingId, orderId, minutes, roundedHours, expectedAmount, returnUrl }) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetchJSONwithRetry(
    `${API_BASE}/Payment/create`,
    {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({
        bookingId,
        orderId,
        minutes,
        roundedHours,
        expectedAmount, // VND
        returnUrl,
      }),
    },
    2,
    700
  );

  if (!res?.success || !res?.paymentUrl) {
    throw new Error(res?.message || "Không tạo được URL thanh toán.");
  }

  let vnpAmount = null; let txnRef = "";
  try {
    const u = new URL(res.paymentUrl);
    vnpAmount = Number(u.searchParams.get("vnp_Amount"));
    txnRef = u.searchParams.get("vnp_TxnRef") || "";
  } catch { /* ignore */ }

  if (!Number.isFinite(vnpAmount) || vnpAmount <= 0) {
    throw new Error("URL trả về thiếu hoặc sai vnp_Amount.");
  }

  return { url: res.paymentUrl, vnpAmount, txnRef };
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
  const [bookingLoad, setBookingLoad] = useState(false);
  const [bookingPrice, setBookingPrice] = useState(null); // giá thật từ BE

  // 1) Lấy hồ sơ user + customerId
  const [currentCustomerId, setCurrentCustomerId] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      setContactLoad(true);
      setContactErr("");
      try {
        const claims = getClaimsFromToken();

        const raw = await fetchAuthJSON(`${API_BASE}/Auth`, { method: "GET" });
        let record = pickCurrentUserRecord(raw, claims);

        if (!record && claims.accountId != null) {
          try {
            const r2 = await fetchAuthJSON(`${API_BASE}/Account/${claims.accountId}`, {
              method: "GET",
            });
            if (r2) record = r2;
          } catch { }
        }

        if (!record) throw new Error("Không tìm thấy hồ sơ trùng với người đang đăng nhập.");

        const normalized = normalizeAccount(record);

        // Lấy customerId để fetch vehicle
        const cid =
          record?.customers?.[0]?.customerId ??
          record?.customerId ??
          record?.Customers?.[0]?.CustomerId ??
          null;

        if (mounted) {
          setContact(normalized);
          setCurrentCustomerId(cid);
        }
      } catch (e) {
        if (mounted) setContactErr(e?.message || "Không tải được thông tin liên hệ.");
      } finally {
        if (mounted) setContactLoad(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 2) Lấy vehicle theo customerId -> licensePlate
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
  }, [currentCustomerId]);

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
  const orderId = useMemo(() => state.orderId || "ORD" + Date.now(), [state.orderId]);

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
  }, [bookingId]);

  // Giá hiển thị cuối cùng (ưu tiên giá booking từ BE)
  const pricePerHour = feePerHourFallback; // giữ cho bảng hiển thị
  const roundedHours = roundedHoursFallback;
  const amount = bookingPrice != null ? bookingPrice : amountFallback;

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

  // ===== Tự tìm bookingId nếu thiếu
  useEffect(() => {
    if (bookingId) return;

    const fetchLatestBooking = async () => {
      setBookingLoad(true);
      try {
        const currentUserId = getClaimsFromToken().accountId;

        const res = await fetchAuthJSON(`${API_BASE}/Booking`, { method: "GET" });
        const list = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
        if (!list.length) throw new Error("Không tìm thấy booking nào của bạn.");

        const desired = {
          stationId: station?.id ?? station?.StationId,
          chargerId: charger?.id ?? charger?.ChargerId,
          gunId: gun?.id ?? gun?.GunId ?? gun?.portId ?? gun?.PortId,
        };

        const norm = list.map(normalizeBooking).filter((x) => x.id);
        let candidates = norm.filter(
          (x) =>
            (!currentUserId || x.customerId == currentUserId) &&
            Number(x.price) > 0 &&
            (!desired.stationId || x.stationId == desired.stationId) &&
            (!desired.chargerId || x.chargerId == desired.chargerId) &&
            (!desired.gunId || x.gunId == desired.gunId)
        );

        if (!candidates.length) {
          candidates = norm.filter(
            (x) => (!currentUserId || x.customerId == currentUserId) && Number(x.price) > 0
          );
        }

        if (!candidates.length) {
          throw new Error("Không có booking hợp lệ thuộc tài khoản hiện tại (hoặc booking chưa có giá).");
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
        if (Number(pick.price) > 0) setBookingPrice(Number(pick.price));
      } catch (e) {
        setPayError(e?.message || "Không lấy được bookingId từ /Booking.");
      } finally {
        setBookingLoad(false);
      }
    };

    fetchLatestBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // ===== Create VNPAY URL with bookingId (robust) =====
  const createVnpayPayment = async () => {
    if (creatingVnpay) return null;
    setCreatingVnpay(true);
    setPayError("");

    try {
      if (!bookingId) {
        throw new Error("Thiếu bookingId. Vui lòng tạo/chọn booking trước khi thanh toán.");
      }

      // Đồng bộ giá từ BE
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

      const { url, vnpAmount, txnRef } = await robustCreateVnpay({
        bookingId,
        orderId,
        minutes: totalMinutes,
        roundedHours,
        expectedAmount: bePrice || amount,
        returnUrl: `${window.location.origin}/vnpay-bridge.html?order=${orderId}`,
      });

      // Kiểm tra số tiền (VND*100) đối chiếu FE
      const expectedScaled = Math.round((bePrice || amount) * 100);
      if (Math.abs(vnpAmount - expectedScaled) >= 1) {
        throw new Error(
          `BE đang gửi sai số tiền cho VNPAY. expected=${(bePrice || amount).toLocaleString("vi-VN")}đ ` +
          `→ vnp_Amount=${expectedScaled}, nhưng URL có vnp_Amount=${vnpAmount}`
        );
      }

      // LƯU STUB để PaymentSuccess dùng ngay khi quay về
      const stub = {
        orderId,
        bookingId,
        station,
        charger,
        gun,
        startTime: startTime || "",
        baseline: baseline || "",
        totalMinutes: totalMinutes || 0,
        bookingFee: bePrice || amount,
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

      setVnpayUrl(url);
      setPaymentRef(txnRef || String(bookingId));
      return { url, ref: txnRef || String(bookingId) };
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
        const created = await createVnpayPayment();
        if (!created?.url) return;

        // Chuyển sang trang thanh toán VNPAY (nếu bạn muốn tự động)
        // window.location.href = created.url;
      }

      if (selectedPayment !== "qr" && selectedPayment !== "wallet") {
        const payload = buildSuccessPayload({
          ...baseExtra,
          paymentRef: `${selectedPayment.toUpperCase()}-${orderId}`,
          vehiclePlate,
        });
        navigate(`/payment/success?order=${orderId}`, { state: payload, replace: true });
      }
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
                vehiclePlate={vehiclePlate}
              />

              {contactLoad && <p className="os-warning">Đang tải thông tin liên hệ...</p>}
              {!contactLoad && contactErr && <p className="os-error">{contactErr}</p>}
              {!!vehicleErr && <p className="os-error">{vehicleErr}</p>}

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
                      <div className="os-qr-actions">
                        <button className="primary-btn" onClick={() => { window.location.href = vnpayUrl; }}>
                          Mở trang VNPAY
                        </button>
                      </div>
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
