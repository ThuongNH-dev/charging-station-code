import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PaymentForm from "../../components/paymentCard/PaymentForm";
import { QRCodeCanvas } from "qrcode.react";
import MainLayout from "../../layouts/MainLayout";
import { ArrowLeftOutlined } from "@ant-design/icons";
import "./style/PaymentPage.css";

import { getApiBase, fetchAuthJSON } from "../../utils/api";


// ===== DEBUG LOGGER =====
const DEBUG_PAY = true;
function dlog(...args) { if (DEBUG_PAY) console.log("[PAY]", ...args); }
function dwarn(...args) { if (DEBUG_PAY) console.warn("[PAY]", ...args); }
function derr(...args) { if (DEBUG_PAY) console.error("[PAY]", ...args); }

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

  const customerId =
    p.customerId ??
    p.CustomerId ??
    null;

  return { accountId, username, email, customerId };
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
  const navigate = useNavigate();

  // ===== Local states
  const [loading, setLoading] = useState(false);
  const [creatingVnpay, setCreatingVnpay] = useState(false);
  const [vnpayUrl, setVnpayUrl] = useState(state?.vnpayUrl || "");
  const [paymentRef, setPaymentRef] = useState("");
  const [payError, setPayError] = useState("");

  const [contact, setContact] = useState({ fullName: "", email: "", phone: "" });
  const [contactLoad, setContactLoad] = useState(true);
  const [contactErr, setContactErr] = useState("");

  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleLoad, setVehicleLoad] = useState(false);
  const [vehicleErr, setVehicleErr] = useState("");

  // ===== Đồng bộ số tiền với booking (BE là source of truth)
  const [bookingId, setBookingId] = useState(state?.bookingId ?? null);
  const [bookingPrice, setBookingPrice] = useState(null); // giá thật từ BE

  // Early guard
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

  const { station, charger, gun, totalMinutes, startTime, baseline } = state || {};

  // ===== Order display info (FE)
  const orderId = useMemo(() => state?.orderId || "ORD" + Date.now(), [state?.orderId]);

  // ===== Lấy hồ sơ user + customerId
  const [currentCustomerId, setCurrentCustomerId] = useState(null);
  useEffect(() => {
    let mounted = true;

    (async () => {
      setContactLoad(true);
      setContactErr("");

      const claims = getClaimsFromToken();
      if (claims?.username || claims?.email) {
        setContact((p) => ({
          fullName: p.fullName || String(claims.username || "").trim(),
          email: p.email || String(claims.email || "").trim(),
          phone: p.phone || "",
        }));
      }

      try {
        let authRes = null;
        try { authRes = await fetchAuthJSON(`/Auth`, { method: "GET" }); }
        catch { try { authRes = await fetchAuthJSON(`${API_BASE}/Auth`, { method: "GET" }); } catch { } }

        let record = pickCurrentUserRecord(authRes, claims);

        if (!record && claims?.accountId != null) {
          try { record = await fetchAuthJSON(`${API_BASE}/Account/${claims.accountId}`, { method: "GET" }); }
          catch { }
        }

        if (!record) {
          record = { userName: claims?.username || "", email: claims?.email || "", customers: [] };
        }

        const normalized = normalizeAccount(record);

        // Rút customerId
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
            if (list.length) { items = list; break; }
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

  // ===== Ưu tiên giá từ BE /Booking/{id}
  useEffect(() => {
    if (!bookingId) return;
    (async () => {
      try {
        const b = await fetchAuthJSON(`${API_BASE}/Booking/${bookingId}`, { method: "GET" });
        const price = Number(b?.price ?? b?.Price ?? 0);
        if (price > 0) setBookingPrice(price);
      } catch {
        // dùng fallback bên dưới
      }
    })();
  }, [bookingId, API_BASE]);

  // Nếu vào trang mà giá vẫn = null -> poll thêm vài lần (tối đa 10s)
  useEffect(() => {
    if (!bookingId || (bookingPrice != null && bookingPrice > 0)) return;
    let alive = true;
    const started = Date.now();
    (async function loop() {
      while (alive && Date.now() - started < 10000) {
        try {
          const b = await fetchAuthJSON(`${API_BASE}/Booking/${bookingId}`, { method: "GET" });
          const price = Number(b?.price ?? b?.Price ?? 0);
          if (price > 0) { setBookingPrice(price); break; }
        } catch { }
        await new Promise(r => setTimeout(r, 800));
      }
    })();
    return () => { alive = false; };
  }, [bookingId, bookingPrice, API_BASE]);

  // ===== Fallback 1: parse vnp_Amount từ URL (VND*100)
  const amountFromVnpUrl = useMemo(() => {
    try {
      const s = toUrlString(vnpayUrl);
      if (!s) return null;
      const u = new URL(s);
      const raw = u.searchParams.get("vnp_Amount");
      if (!raw) return null;
      const scaled = Number(raw);
      if (!Number.isFinite(scaled)) return null;
      return Math.round(scaled / 100);
    } catch { return null; }
  }, [vnpayUrl]);

  // ===== Fallback 2: tính tạm (không dùng nữa, luôn 0)
  const roundedHoursFallback = useMemo(
    () => ceilHoursFromMinutes(totalMinutes || 0),
    [totalMinutes]
  );

  // ===== Số tiền cuối cùng để hiển thị & thanh toán =====
  const amount = (bookingPrice != null && bookingPrice > 0)
    ? bookingPrice
    : (amountFromVnpUrl != null ? amountFromVnpUrl : null);

  // ===== Payment method UI
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
      bookingFee: amount, // giá từ BE
      roundedHours: Math.max(1, Math.ceil((totalMinutes || 0) / 60)), // chỉ để note, không tính tiền
      pricePerHour: 0,

      paidAt: Date.now(),
      paymentMethod: selectedPayment,
      contact,
      vehiclePlate,
      ...extra,
    };
    saveOrderBlob(orderId, payload);
    return payload;
  };

  function toUrlString(val) {
    if (!val) return "";
    const s =
      typeof val === "string" ? val
        : (val.result ?? val.url ?? val.href ?? "");
    if (!s) return "";
    // đảm bảo luôn là absolute URL để new URL không quăng lỗi
    if (/^https?:\/\//i.test(s)) return s;
    try { return new URL(s, window.location.origin).toString(); } catch { return ""; }
  }


  // Nếu đã có vnpayUrl từ BookingPorts, auto chọn QR và rút mã tham chiếu
  useEffect(() => {
    if (state?.vnpayUrl) {
      setSelectedPayment("qr");
      setVnpayUrl(toUrlString(state.vnpayUrl));
      try {
        const u = new URL(toUrlString(state.vnpayUrl));
        const ref = u.searchParams.get("vnp_TxnRef") || "";
        setPaymentRef(ref || String(state?.bookingId || orderId));
      } catch {
        setPaymentRef(String(state?.bookingId || orderId));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ===== Create VNPAY URL (API BE mới)
  const createVnpayPayment = async () => {
    if (creatingVnpay) return null;
    setCreatingVnpay(true);
    setPayError("");

    try {
      if (!bookingId) {
        throw new Error("Thiếu bookingId. Vui lòng tạo/chọn booking trước khi thanh toán.");
      }

      // (Tuỳ BE) kiểm tra booking đã có giá (có thể bỏ nếu BE tự validate)
      try {
        const check = await fetchAuthJSON(`${API_BASE}/Booking/${bookingId}`, { method: "GET" });
        const bePrice = Number(check?.price ?? check?.Price ?? 0);
        if (!(bePrice > 0)) {
          throw new Error("Booking chưa có giá, không thể thanh toán.");
        }
        setBookingPrice(bePrice);
      } catch (e) {
        throw new Error(e?.message || "Không kiểm tra được giá của booking.");
      }

      // Payload tạo phiên thanh toán
      const payload = {
        bookingId,
        description: `Thanh toán booking #${bookingId}`,
        invoiceId: state?.invoiceId,
        companyId: state?.companyId,
        returnUrl: `${window.location.origin}/vnpay-bridge.html?order=${encodeURIComponent(orderId)}`
      };
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      const res = await fetchAuthJSON(`${API_BASE}/Payment/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res?.success) {
        throw new Error(res?.message || "Không tạo được URL thanh toán.");
      }

      // Lấy URL trả về từ BE (string hoặc object {result|url|href})
      let url = null;
      if (typeof res?.paymentUrl === "string") {
        url = res.paymentUrl;
      } else if (res?.paymentUrl?.result) {
        url = res.paymentUrl.result;
      } else if (res?.paymentUrl?.url || res?.paymentUrl?.href) {
        url = res.paymentUrl.url || res.paymentUrl.href;
      } else {
        url = res?.paymentUrl; // fallback phòng trường hợp BE trả format khác
      }

      url = toUrlString(url);
      if (!url) throw new Error("Backend không trả về paymentUrl hợp lệ.");

      // Rút mã tham chiếu (nếu có)
      let ref = "";
      try {
        const u = new URL(url);
        ref = u.searchParams.get("vnp_TxnRef") || "";
      } catch { }

      setVnpayUrl(url);                                   // LƯU URL vào state
      setPaymentRef(ref || String(bookingId));            // LƯU mã tham chiếu
      return { url, ref: ref || String(bookingId) };      // TRẢ KẾT QUẢ (để handlePay dùng)
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

  const canPayByWallet = selectedPayment === "wallet" ? walletBalance >= (amount || 0) : true;
  const payDisabled =
    loading ||
    !selectedPayment ||
    (selectedPayment === "wallet" && !canPayByWallet) ||
    (selectedPayment === "qr" && (!bookingId || creatingVnpay || !vnpayUrl)) ||
    (amount == null); // cần có giá từ BE (hoặc từ URL) để enable

  // ===== Helpers: kiểm tra trạng thái thanh toán/confirm từ BE =====
  function isPaidOrConfirmed(raw) {
    if (!raw || typeof raw !== "object") return false;

    // Các field khả dĩ BE có thể trả
    const paid = raw.isPaid ?? raw.paid ?? raw.IsPaid ?? false;
    if (paid === true || paid === "true" || paid === 1) return true;

    const st = String(raw.status ?? raw.Status ?? "").toLowerCase();
    if (["paid", "completed", "confirmed", "success"].includes(st)) return true;

    // Nhiều BE cập nhật booking sau callback
    const paymentStatus = String(raw.paymentStatus ?? raw.PaymentStatus ?? "").toLowerCase();
    if (["paid", "success", "completed"].includes(paymentStatus)) return true;

    // Nếu có invoice gắn kèm
    const inv = raw.invoice ?? raw.Invoice;
    if (inv) {
      const ipaid = inv.isPaid ?? inv.paid ?? inv.IsPaid;
      if (ipaid === true || ipaid === "true" || ipaid === 1) return true;
      const ist = String(inv.status ?? inv.Status ?? "").toLowerCase();
      if (["paid", "success", "completed"].includes(ist)) return true;
    }

    return false;
  }

  async function fetchBookingById(apiBase, bookingId) {
    const b = await fetchAuthJSON(`${apiBase}/Booking/${bookingId}`, { method: "GET" });
    if (!b) return null;
    // Có thể là object hoặc {items:[...]}
    if (Array.isArray(b?.items) && b.items.length) return b.items[0];
    return b;
  }

  async function pollUntilPaid({ apiBase, bookingId, timeoutMs = 300000, stepMs = 2000, onTick }) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      try {
        const b = await fetchBookingById(apiBase, bookingId);
        if (onTick) onTick(b);
        if (b && isPaidOrConfirmed(b)) return { ok: true, data: b };
      } catch {
        // bỏ qua lỗi lẻ
      }
      await new Promise(r => setTimeout(r, stepMs));
    }
    return { ok: false, data: null };
  }

  const handlePay = async () => {
    if (selectedPayment !== "qr") {
      setPayError("Hiện tại chỉ hỗ trợ VNPAY-QR.");
      return;
    }
    if (!bookingId) {
      setPayError("Chưa có bookingId. Vui lòng quay lại đặt chỗ.");
      return;
    }

    setLoading(true);
    setPayError("");

    try {
      // B1: đảm bảo đã có link VNPAY
      let payUrl = vnpayUrl;
      payUrl = toUrlString(payUrl);
      if (!payUrl) {
        const created = await createVnpayPayment();
        if (!created?.url) {
          setPayError("Không tạo được phiên thanh toán VNPAY.");
          return;
        }
        payUrl = toUrlString(created.url);
      }

      // B2: mở VNPAY ở tab mới
      const payWin = window.open(payUrl, "_blank", "noopener");

      // B3: poll BE tới khi thấy paid/confirmed
      try { sessionStorage.setItem(`pay:${orderId}:pending`, "1"); } catch { }
      try { localStorage.setItem(`pay:${orderId}:pending`, "1"); } catch { }

      const res = await pollUntilPaid({
        apiBase: API_BASE,
        bookingId,
        timeoutMs: 300000, // 5 phút
        stepMs: 2500,
      });

      if (res.ok) {
        try { if (payWin && !payWin.closed) payWin.close(); } catch { }
        navigate(`/payment/success?bookingId=${encodeURIComponent(bookingId)}`, {
          replace: true,
          state: { paid: true, fromVnpay: true },
        });
        return;
      }

      // Hết thời gian poll mà chưa thấy paid
      setPayError("Chưa xác nhận được thanh toán. Vui lòng kiểm tra lại hoặc làm mới trang.");
    } finally {
      setLoading(false);
    }
  };



  // Nếu chỉ hỗ trợ QR, auto chọn QR khi vào trang (UX mượt hơn)
  useEffect(() => {
    if (!state?.vnpayUrl && !selectedPayment) setSelectedPayment("qr");
  }, [selectedPayment, state?.vnpayUrl]);

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
                      <QRCodeCanvas value={toUrlString(vnpayUrl)} size={180} includeMargin />
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
                  type="button"
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
              {amount == null ? (
                <p className="os-warning">Đang chờ hệ thống tính phí từ booking...</p>
              ) : (
                <table className="os-table">
                  <tbody>
                    <tr>
                      <td>Phí đặt chỗ (theo hệ thống)</td>
                      <td className="os-right">{vnd(amount)}</td>
                    </tr>
                    <tr className="os-total">
                      <td><b>Tổng</b></td>
                      <td className="os-right"><b>{vnd(amount)}</b></td>
                    </tr>
                  </tbody>
                </table>
              )}

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
