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
function dlog(...args) {
  if (DEBUG_PAY) console.log("[PAY]", ...args);
}
function dwarn(...args) {
  if (DEBUG_PAY) console.warn("[PAY]", ...args);
}
function derr(...args) {
  if (DEBUG_PAY) console.error("[PAY]", ...args);
}

const API_BASE = getApiBase();
const vnd = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return Math.round(x).toLocaleString("vi-VN") + " đ";
};

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

  const NAME_ID =
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
  const EMAIL_CLAIM =
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress";
  const NAME_CLAIM =
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";

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
  const customerId = p.customerId ?? p.CustomerId ?? null;

  return { accountId, username, email, customerId };
}

/** ===== Chuẩn hoá Account/Customer -> contact ===== */
function normalizeAccount(raw) {
  if (!raw || typeof raw !== "object") {
    return { fullName: "", email: "", phone: "" };
  }
  const userName = raw.userName ?? raw.username ?? raw.email ?? "";
  const emailGuess = /\S+@\S+\.\S+/.test(String(userName))
    ? String(userName)
    : "";

  const c =
    Array.isArray(raw.customers) && raw.customers.length
      ? raw.customers[0]
      : raw.customer || null;

  const phone = c?.phone ?? raw.phone ?? "";

  const fullNameGuess =
    c?.fullName ??
    raw.fullName ??
    raw.name ??
    (emailGuess ? emailGuess.split("@")[0] : userName || "");

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
        const e = String(
          x.email ?? x.userName ?? x.username ?? ""
        ).toLowerCase();
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
  try {
    sessionStorage.setItem(key, JSON.stringify(obj));
  } catch {}
  try {
    localStorage.setItem(key, JSON.stringify(obj));
  } catch {}
  try {
    sessionStorage.setItem("pay:lastOrderId", orderId);
  } catch {}
  try {
    localStorage.setItem("pay:lastOrderId", orderId);
  } catch {}
}
function readOrderBlob(orderId) {
  const key = `pay:${orderId}`;
  let s = null;
  try {
    s = sessionStorage.getItem(key);
  } catch {}
  if (!s) {
    try {
      s = localStorage.getItem(key);
    } catch {}
  }
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** ===== Invoice/Booking utils ===== */
async function fetchInvoiceById(apiBase, invoiceId) {
  const res = await fetchAuthJSON(`${apiBase}/Invoices/${invoiceId}`, {
    method: "GET",
  });
  return res?.data ?? res ?? null;
}
async function fetchBookingById(apiBase, bookingId) {
  const b = await fetchAuthJSON(`${apiBase}/Booking/${bookingId}`, {
    method: "GET",
  });
  if (!b) return null;
  if (Array.isArray(b?.items) && b.items.length) return b.items[0];
  return b;
}
function isPaidOrConfirmed(raw) {
  if (!raw || typeof raw !== "object") return false;
  const paid = raw.isPaid ?? raw.paid ?? raw.IsPaid ?? false;
  if (paid === true || paid === "true" || paid === 1) return true;
  const st = String(raw.status ?? raw.Status ?? "").toLowerCase();
  if (["paid", "completed", "confirmed", "success", "active"].includes(st))
    return true;
  const paymentStatus = String(
    raw.paymentStatus ?? raw.PaymentStatus ?? ""
  ).toLowerCase();
  if (["paid", "success", "completed"].includes(paymentStatus)) return true;
  const inv = raw.invoice ?? raw.Invoice;
  if (inv) {
    const ipaid = inv.isPaid ?? inv.paid ?? inv.IsPaid;
    if (ipaid === true || ipaid === "true" || ipaid === 1) return true;
    const ist = String(inv.status ?? inv.Status ?? "").toLowerCase();
    if (["paid", "success", "completed"].includes(ist)) return true;
  }
  return false;
}
async function pollUntilPaid({
  apiBase,
  bookingId,
  invoiceId,
  timeoutMs = 300000,
  stepMs = 2000,
  onTick,
}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      let data = null;
      if (bookingId) data = await fetchBookingById(apiBase, bookingId);
      else if (invoiceId) data = await fetchInvoiceById(apiBase, invoiceId);
      if (onTick) onTick(data);
      if (data && isPaidOrConfirmed(data)) return { ok: true, data };
    } catch {}
    await new Promise((r) => setTimeout(r, stepMs));
  }
  return { ok: false, data: null };
}
async function activateSubscription(apiBase, subscriptionId) {
  const id = Number(subscriptionId);
  if (!Number.isFinite(id) || id <= 0) return;
  const payload = { status: "Active" };
  await fetchAuthJSON(`${apiBase}/Subscriptions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** ===== NEW: lấy số tiền Subscription giống cách “hydrate” ===== */
function extractSubscriptionAmount(subRes) {
  if (!subRes || typeof subRes !== "object") return null;
  const cands = [
    subRes.amountDue,
    subRes.totalDue,
    subRes.grandTotal,
    subRes.total,
    subRes.amount,
    subRes.paymentAmount,
    subRes.price,
    subRes.monthlyFee,
    subRes.subscriptionFee,
    subRes.dueAmount,
    subRes.outstandingBalance,
    subRes?.plan?.price,
    subRes?.plan?.monthlyPrice,
    subRes?.plan?.planPrice,
  ];
  for (const v of cands) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}
async function fetchSubscriptionAmount(apiBase, subscriptionId) {
  try {
    const res = await fetchAuthJSON(
      `${apiBase}/Subscriptions/${subscriptionId}`,
      { method: "GET" }
    );
    const obj = res?.data ?? res;
    return extractSubscriptionAmount(obj);
  } catch {
    return null;
  }
}

/** ===== NEW: lấy tiền Subscription từ cache danh sách hoá đơn (do InvoiceSummary đã lưu) ===== */
function findSubAmountFromCachedInvoices(subscriptionId) {
  try {
    const raw = sessionStorage.getItem("charge:billing:list");
    if (!raw) return null;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return null;
    // tìm hóa đơn có invoiceType=subscription & subscriptionId trùng, ưu tiên chưa thanh toán
    const candidates = list
      .filter(
        (it) =>
          String(it?.invoiceType || "").toLowerCase() === "subscription" &&
          Number(it?.subscriptionId) === Number(subscriptionId)
      )
      .sort(
        (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
      );

    if (!candidates.length) return null;

    const unpaidFirst =
      candidates.find((x) =>
        String(x?.status || "")
          .toLowerCase()
          .includes("unpaid")
      ) || candidates[0];
    const total = Number(
      unpaidFirst?.total ?? unpaidFirst?.amount ?? unpaidFirst?.grandTotal ?? 0
    );
    return Number.isFinite(total) && total > 0 ? total : null;
  } catch {
    return null;
  }
}

/** ===== NEW: cố gắng tìm hóa đơn Subscription qua các endpoint hợp lý ===== */
async function fetchSubscriptionInvoiceAmount(apiBase, subscriptionId) {
  const paths = [
    `/Invoices/by-subscription/${subscriptionId}`,
    `/Invoices?subscriptionId=${subscriptionId}`,
    `/Invoices/by-subscriptionId/${subscriptionId}`,
  ];
  for (const p of paths) {
    try {
      const res = await fetchAuthJSON(`${apiBase}${p}`, { method: "GET" });
      const items = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : res?.items ?? [];
      if (!items || !items.length) continue;

      // ưu tiên hóa đơn gần nhất/chưa thanh toán
      const normalized = items
        .filter(Boolean)
        .map((it) => ({
          total: Number(it?.total ?? it?.amount ?? it?.grandTotal ?? 0),
          status: String(it?.status ?? "").toLowerCase(),
          createdAt: it?.createdAt ?? it?.CreatedAt ?? null,
        }))
        .sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );

      const pick =
        normalized.find((x) => x.status.includes("unpaid")) || normalized[0];
      if (pick && Number.isFinite(pick.total) && pick.total > 0)
        return pick.total;
    } catch {
      /* try next path */
    }
  }
  return null;
}

/** ===== Component ===== */
export default function PaymentPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [invoiceId, setInvoiceId] = useState(state?.invoiceId ?? null);
  const [companyId, setCompanyId] = useState(state?.companyId ?? null);
  const [subscriptionId, setSubscriptionId] = useState(
    state?.subscriptionId ?? null
  );

  // ép kiểu an toàn
  useEffect(() => {
    const toNumOrNull = (v) => (v == null || v === "" ? null : Number(v));
    dlog("location.state in:", state);
    if (state?.invoiceId != null) setInvoiceId(toNumOrNull(state.invoiceId));
    if (state?.subscriptionId != null)
      setSubscriptionId(toNumOrNull(state.subscriptionId));
    if (state?.companyId != null) setCompanyId(toNumOrNull(state.companyId));
  }, [state]);

  const isCombo = Boolean(invoiceId && subscriptionId);

  // số tiền từng phần
  const [invoiceAmount, setInvoiceAmount] = useState(null); // Charging
  const [subAmount, setSubAmount] = useState(null); // Subscription
  const [subLoading, setSubLoading] = useState(false);

  // số tiền CHÍNH THỨC từ /Payment/create (tổng)
  const [serverAmount, setServerAmount] = useState(null);

  // ===== Local states
  const [loading, setLoading] = useState(false);
  const [creatingVnpay, setCreatingVnpay] = useState(false);
  const [vnpayUrl, setVnpayUrl] = useState(state?.vnpayUrl || "");
  const [paymentRef, setPaymentRef] = useState("");
  const [payError, setPayError] = useState("");

  const [contact, setContact] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [contactLoad, setContactLoad] = useState(true);
  const [contactErr, setContactErr] = useState("");

  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleLoad, setVehicleLoad] = useState(false);
  const [vehicleErr, setVehicleErr] = useState("");

  const [bookingId, setBookingId] = useState(state?.bookingId ?? null);
  const [bookingPrice, setBookingPrice] = useState(null);

  // Early guard
  if (
    !state ||
    (!state.bookingId && !state.invoiceId && !state.subscriptionId)
  ) {
    return (
      <div className="page-fallback">
        <h2>Thiếu thông tin thanh toán</h2>
        <p>Vui lòng chọn Booking hoặc Invoice để thanh toán.</p>
        <button className="secondary-btn" onClick={() => navigate("/stations")}>
          <ArrowLeftOutlined /> Về danh sách trạm
        </button>
      </div>
    );
  }

  const { station, charger, gun, totalMinutes, startTime, baseline } =
    state || {};
  const orderId = useMemo(
    () => state?.orderId || "ORD" + Date.now(),
    [state?.orderId]
  );

  // Lấy hồ sơ user + customerId
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
        try {
          authRes = await fetchAuthJSON(`/Auth`, { method: "GET" });
        } catch {
          try {
            authRes = await fetchAuthJSON(`${API_BASE}/Auth`, {
              method: "GET",
            });
          } catch {}
        }

        let record = pickCurrentUserRecord(authRes, claims);

        if (!record && claims?.accountId != null) {
          try {
            record = await fetchAuthJSON(
              `${API_BASE}/Account/${claims.accountId}`,
              { method: "GET" }
            );
          } catch {}
        }

        if (!record) {
          record = {
            userName: claims?.username || "",
            email: claims?.email || "",
            customers: [],
          };
        }

        const normalized = normalizeAccount(record);

        let cid =
          record?.customers?.[0]?.customerId ??
          record?.customerId ??
          record?.Customers?.[0]?.CustomerId ??
          claims?.customerId ??
          null;

        if (!cid) {
          try {
            const meCus = await fetchAuthJSON(`${API_BASE}/Customers/me`, {
              method: "GET",
            });
            cid = meCus?.customerId ?? meCus?.CustomerId ?? null;
          } catch {}
        }

        if (mounted) {
          setContact(normalized);
          setCurrentCustomerId(cid || null);
        }
      } catch (e) {
        if (mounted)
          setContactErr(e?.message || "Không tải được thông tin liên hệ.");
      } finally {
        if (mounted) setContactLoad(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Sau khi trở lại từ VNPAY, poll & kích hoạt subscription (nếu có)
  useEffect(() => {
    (async () => {
      let invId = invoiceId;
      let subId = subscriptionId ?? state?.subscriptionId ?? null;

      if (!invId || !subId) {
        try {
          const ctx = JSON.parse(sessionStorage.getItem("__pay_ctx") || "{}");
          invId = invId || ctx?.invoiceId || null;
          subId = subId || ctx?.subscriptionId || null;
        } catch {}
      }
      if (!invId || !subId) return;

      const { ok } = await pollUntilPaid({
        apiBase: API_BASE,
        invoiceId: invId,
        timeoutMs: 120000,
        stepMs: 2000,
      });

      if (ok) {
        try {
          await activateSubscription(API_BASE, subId);
          sessionStorage.setItem("__refresh_subs_after_pay", "1");

          // ✅ Gọi lại API Notification để lấy thông báo mới nhất
          const role = (user?.role || "").toLowerCase();
          const customerId =
            user?.customerId || localStorage.getItem("customerId");
          const companyId =
            user?.companyId || localStorage.getItem("companyId");

          let notiUrl = null;
          if (role === "customer" && customerId)
            notiUrl = `${API_BASE}/Notification/customer/${customerId}?includeArchived=false`;
          else if (role === "company" && companyId)
            notiUrl = `${API_BASE}/Notification/company/${companyId}?includeArchived=false`;

          if (notiUrl) {
            const r = await fetch(notiUrl, {
              headers: {
                accept: "application/json",
                authorization: `Bearer ${user.token}`,
              },
            });
            const notis = await r.json();
            if (Array.isArray(notis) && notis.length > 0) {
              const latest = notis.sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
              )[0];
              const url = latest?.actionUrl;
              if (url) {
                // ✅ Điều hướng theo link BE gửi về
                if (url.startsWith("/")) navigate(url, { replace: true });
                else window.location.href = url;
                return;
              }
            }
          }

          // 🔄 Nếu không có actionUrl, fallback về mặc định
          navigate("/payment-success", {
            state: { invoiceId: invId, subscriptionId: subId },
            replace: true,
          });
        } catch (err) {
          console.error("Lỗi khi kích hoạt subscription:", err);
        }
      } else {
        // ❌ Nếu hết thời gian mà chưa thanh toán, quay về trang thất bại
        navigate("/payment-failed", { replace: true });
      }
    })();
  }, []); // eslint-disable-line

  // ====== Giá từ BE /Invoices/{id} (Charging)
  useEffect(() => {
    if (!invoiceId) return;
    (async () => {
      try {
        const inv = await fetchInvoiceById(API_BASE, invoiceId);
        const total = Number(
          inv?.total ??
            inv?.Total ??
            inv?.amount ??
            inv?.Amount ??
            inv?.grandTotal ??
            inv?.GrandTotal ??
            0
        );
        if (total > 0) setInvoiceAmount(total);
      } catch {}
    })();
  }, [invoiceId]);

  // ====== Giá Subscription (theo thứ tự: cache → endpoint hóa đơn → /Subscriptions/{id})
  useEffect(() => {
    if (!subscriptionId) return;
    let alive = true;
    (async () => {
      setSubLoading(true);

      // 1) Cache từ InvoiceSummary
      const fromCache = findSubAmountFromCachedInvoices(subscriptionId);
      if (alive && fromCache != null) {
        setSubAmount(fromCache);
        setSubLoading(false);
        return;
      }

      // 2) Thử tìm hóa đơn Subscription qua các endpoint khả dĩ
      const fromInvoices = await fetchSubscriptionInvoiceAmount(
        API_BASE,
        subscriptionId
      );
      if (alive && fromInvoices != null) {
        setSubAmount(fromInvoices);
        setSubLoading(false);
        return;
      }

      // 3) Fallback: đọc trực tiếp /Subscriptions/{id} (khi BE có trường số tiền)
      const amt = await fetchSubscriptionAmount(API_BASE, subscriptionId);
      if (alive) {
        setSubAmount(amt);
        setSubLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [subscriptionId]);

  // ===== Vehicle theo customerId
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
            const res = await fetchAuthJSON(`${API_BASE}${p}`, {
              method: "GET",
            });
            const list = extractVehicleItems(res);
            if (list.length) {
              items = list;
              break;
            }
          } catch {}
        }

        if (!items.length)
          throw new Error("Không tìm thấy phương tiện của bạn.");

        let mine = items.filter(
          (v) =>
            Number(v.customerId ?? v.CustomerId) === Number(currentCustomerId)
        );
        if (!mine.length) mine = items;

        mine.sort((a, b) => {
          const sa =
            String(a.status ?? a.Status ?? "").toLowerCase() === "active"
              ? 1
              : 0;
          const sb =
            String(b.status ?? b.Status ?? "").toLowerCase() === "active"
              ? 1
              : 0;
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
    return () => {
      mounted = false;
    };
  }, [currentCustomerId]);

  // ===== Booking price
  useEffect(() => {
    if (!bookingId) return;
    (async () => {
      try {
        const b = await fetchAuthJSON(`${API_BASE}/Booking/${bookingId}`, {
          method: "GET",
        });
        const price = Number(b?.price ?? b?.Price ?? 0);
        if (price > 0) setBookingPrice(price);
      } catch {}
    })();
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId || (bookingPrice != null && bookingPrice > 0)) return;
    let alive = true;
    const started = Date.now();
    (async function loop() {
      while (alive && Date.now() - started < 10000) {
        try {
          const b = await fetchAuthJSON(`${API_BASE}/Booking/${bookingId}`, {
            method: "GET",
          });
          const price = Number(b?.price ?? b?.Price ?? 0);
          if (price > 0) {
            setBookingPrice(price);
            break;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 800));
      }
    })();
    return () => {
      alive = false;
    };
  }, [bookingId, bookingPrice]);

  // ===== Parse vnp_Amount (vnd*100) từ URL
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
    } catch {
      return null;
    }
  }, [vnpayUrl]);

  // ===== Tổng hiển thị:
  // - Nếu combo: dùng serverAmount; nếu chưa có thì cộng invoiceAmount + subAmount khi đủ.
  const derivedComboTotal =
    serverAmount != null
      ? serverAmount
      : isCombo && invoiceAmount != null && subAmount != null
      ? invoiceAmount + subAmount
      : null;

  // Số tiền cho trường hợp đơn lẻ (booking / invoice lẻ)
  const singleAmount =
    serverAmount != null
      ? serverAmount
      : bookingId && bookingPrice > 0
      ? bookingPrice
      : invoiceId && invoiceAmount > 0 && !isCombo
      ? invoiceAmount
      : amountFromVnpUrl != null
      ? amountFromVnpUrl
      : null;

  // ===== UI payment
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

  function toUrlString(val) {
    if (!val) return "";
    const s =
      typeof val === "string" ? val : val.result ?? val.url ?? val.href ?? "";
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    try {
      return new URL(s, window.location.origin).toString();
    } catch {
      return "";
    }
  }

  // Nếu đã có vnpayUrl từ BookingPorts, auto chọn QR
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
  }, []); // eslint-disable-line

  // ===== Tạo phiên VNPAY
  const createVnpayPayment = async () => {
    if (creatingVnpay) return null;
    setCreatingVnpay(true);
    setPayError("");

    try {
      if (!bookingId && !invoiceId && !subscriptionId) {
        throw new Error("Thiếu bookingId, invoiceId hoặc subscriptionId.");
      }

      // Kiểm tra số tiền trước khi tạo phiên (optional)
      if (bookingId) {
        const check = await fetchAuthJSON(`${API_BASE}/Booking/${bookingId}`, {
          method: "GET",
        });
        const bePrice = Number(check?.price ?? check?.Price ?? 0);
        if (!(bePrice > 0))
          throw new Error("Booking chưa có giá, không thể thanh toán.");
        setBookingPrice(bePrice);
      } else if (invoiceId && !isCombo) {
        const inv = await fetchInvoiceById(API_BASE, invoiceId);
        const total = Number(
          inv?.total ??
            inv?.Total ??
            inv?.amount ??
            inv?.Amount ??
            inv?.grandTotal ??
            inv?.GrandTotal ??
            0
        );
        if (!(total > 0))
          throw new Error("Invoice chưa có tổng tiền, không thể thanh toán.");
        setInvoiceAmount(total);
      } else if (isCombo) {
        // nếu combo mà chưa có subAmount -> cố gắng lấy trước để UI hiển thị chuẩn
        if (subAmount == null && subscriptionId) {
          // ưu tiên cache/endpoint hóa đơn trước
          const fromCache = findSubAmountFromCachedInvoices(subscriptionId);
          if (fromCache != null) setSubAmount(fromCache);
          else {
            const fromInvoices = await fetchSubscriptionInvoiceAmount(
              API_BASE,
              subscriptionId
            );
            if (fromInvoices != null) setSubAmount(fromInvoices);
            else {
              const amt = await fetchSubscriptionAmount(
                API_BASE,
                subscriptionId
              );
              if (amt != null) setSubAmount(amt);
            }
          }
        }
      }

      // Payload tạo phiên thanh toán
      const fromDetail = state?.from === "invoice-detail";
      const payload = {};
      if (bookingId != null) payload.bookingId = Number(bookingId);
      if (invoiceId != null) payload.invoiceId = Number(invoiceId);
      // Chỉ loại subscriptionId khi tới từ InvoiceDetail
      if (!fromDetail && (subscriptionId ?? state?.subscriptionId) != null) {
        payload.subscriptionId = Number(
          subscriptionId ?? state?.subscriptionId
        );
      }
      if (companyId != null) payload.companyId = Number(companyId);
      payload.description = bookingId
        ? `Thanh toán booking #${bookingId}`
        : isCombo
        ? `Thanh toán combo: invoice #${invoiceId} + subscription #${subscriptionId}`
        : `Thanh toán hóa đơn #${invoiceId}`;
      const detailUrl = invoiceId
        ? `${window.location.origin}/invoiceDetail/${encodeURIComponent(
            invoiceId
          )}`
        : `${window.location.origin}/invoiceSummary`;
      payload.returnUrl = bookingId
        ? `${
            window.location.origin
          }/payment/success?bookingId=${encodeURIComponent(
            bookingId
          )}&order=${encodeURIComponent(orderId)}`
        : fromDetail
        ? detailUrl
        : `${window.location.origin}/invoiceSummary`;
      dlog("create payload →", JSON.stringify(payload));

      const rawRes = await fetchAuthJSON(`${API_BASE}/Payment/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = rawRes?.data ?? rawRes ?? {};
      dlog("Payment/create response:", res);

      if (res?.success === false) {
        throw new Error(res?.message || "Không tạo được URL thanh toán.");
      }

      // ---- LẤY SỐ TIỀN CHÍNH THỨC TỪ BE ----
      const rawVnp = res?.vnp_Amount ?? res?.vnpAmount ?? res?.VnpAmount;
      const rawAmt =
        res?.amount ??
        res?.total ??
        res?.paymentAmount ??
        (rawVnp != null ? Number(rawVnp) / 100 : null);
      if (Number.isFinite(rawAmt) && rawAmt > 0) {
        const totalAmt = Math.round(Number(rawAmt));
        setServerAmount(totalAmt);
      }

      // Lấy paymentUrl
      let url = null;
      if (typeof res?.paymentUrl === "string") url = res.paymentUrl;
      else if (res?.paymentUrl?.result) url = res.paymentUrl.result;
      else if (res?.paymentUrl?.url || res?.paymentUrl?.href)
        url = res.paymentUrl.url || res.paymentUrl.href;
      else url = res?.paymentUrl;

      url = toUrlString(url);
      if (!url) throw new Error("Backend không trả về paymentUrl hợp lệ.");

      // Rút mã tham chiếu
      let ref = "";
      try {
        const u = new URL(url);
        ref = u.searchParams.get("vnp_TxnRef") || "";
      } catch {}

      setVnpayUrl(url);
      const fallbackRef = String(bookingId || invoiceId || orderId);
      setPaymentRef(ref || fallbackRef);
      return { url, ref: ref || fallbackRef };
    } catch (err) {
      setPayError(
        err?.message ||
          "Không tạo được phiên thanh toán VNPAY. Vui lòng thử lại."
      );
      setVnpayUrl("");
      setPaymentRef("");
      return null;
    } finally {
      setCreatingVnpay(false);
    }
  };

  // Auto-create VNPAY URL khi chọn QR
  useEffect(() => {
    if (
      selectedPayment === "qr" &&
      (bookingId || invoiceId || subscriptionId) &&
      !vnpayUrl
    ) {
      createVnpayPayment();
    }
  }, [
    selectedPayment,
    bookingId,
    invoiceId,
    subscriptionId,
    orderId,
    vnpayUrl,
  ]); // eslint-disable-line

  const payingTotal = isCombo ? derivedComboTotal : singleAmount;
  const canPayByWallet =
    selectedPayment === "wallet" ? walletBalance >= (payingTotal || 0) : true;
  const payDisabled =
    loading ||
    !selectedPayment ||
    (selectedPayment === "wallet" && !canPayByWallet) ||
    (selectedPayment === "qr" &&
      (!(bookingId || invoiceId || subscriptionId) ||
        creatingVnpay ||
        !vnpayUrl)) ||
    (isCombo ? derivedComboTotal == null : singleAmount == null);

  const handlePay = async () => {
    if (selectedPayment !== "qr") {
      const payload = {
        orderId,
        station,
        charger,
        gun,
        startTime: startTime || "",
        baseline: baseline || "",
        totalMinutes: totalMinutes || 0,
        bookingFee: payingTotal,
        roundedHours: Math.max(1, Math.ceil((totalMinutes || 0) / 60)),
        pricePerHour: 0,
        bookingId,
        invoiceId,
        companyId,
        paidAt: Date.now(),
        paymentMethod: selectedPayment,
        contact,
        vehiclePlate,
      };
      saveOrderBlob(orderId, payload);
      if (bookingId) {
        navigate("/payment/success", { replace: true, state: payload });
      } else if (invoiceId || subscriptionId) {
        if (state?.from === "invoice-detail" && invoiceId) {
          navigate(`/invoiceDetail/${encodeURIComponent(invoiceId)}`, {
            replace: true,
          });
        } else {
          navigate("/invoiceSummary");
        }
      }
      return;
    }

    if (!bookingId && !invoiceId && !subscriptionId) {
      setPayError("Thiếu bookingId hoặc invoiceId.");
      return;
    }

    setLoading(true);
    setPayError("");

    try {
      // Đảm bảo đã có link VNPAY
      let payUrl = toUrlString(vnpayUrl);
      if (!payUrl) {
        const created = await createVnpayPayment();
        if (!created?.url) {
          setPayError("Không tạo được phiên thanh toán VNPAY.");
          return;
        }
        payUrl = toUrlString(created.url);
      }

      try {
        sessionStorage.setItem(`pay:${orderId}:pending`, "1");
      } catch {}
      try {
        localStorage.setItem(`pay:${orderId}:pending`, "1");
      } catch {}
      window.location.href = payUrl;

      try {
        const ctx = {
          invoiceId,
          subscriptionId: subscriptionId ?? state?.subscriptionId ?? null,
          backToDetail: state?.from === "invoice-detail",
        };
        sessionStorage.setItem("__pay_ctx", JSON.stringify(ctx));
        sessionStorage.setItem("__refresh_subs_after_pay", "1");
      } catch {}
      return;
    } finally {
      setLoading(false);
    }
  };

  // Nếu chỉ hỗ trợ QR, auto chọn QR khi vào trang
  useEffect(() => {
    if (!state?.vnpayUrl && !selectedPayment) setSelectedPayment("qr");
  }, [selectedPayment, state?.vnpayUrl]); // eslint-disable-line

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
                amount={payingTotal}
                contact={contact}
                vehiclePlate={vehiclePlate}
              />

              {contactLoad && (
                <p className="os-warning">Đang tải thông tin liên hệ...</p>
              )}
              {!contactLoad && contactErr && (
                <p className="os-error">{contactErr}</p>
              )}
              {!!vehicleErr && <p className="os-error">{vehicleErr}</p>}

              {selectedPayment === "qr" && (
                <div className="os-qr">
                  {!(bookingId || invoiceId || subscriptionId) && (
                    <p className="os-warning">Đang tìm booking phù hợp...</p>
                  )}

                  {vnpayUrl ? (
                    <>
                      <QRCodeCanvas
                        value={toUrlString(vnpayUrl)}
                        size={180}
                        includeMargin
                      />
                      <p className="os-qr-hint">
                        Quét mã QR để thanh toán{" "}
                        {isCombo
                          ? "combo (Charging + Subscription)"
                          : "qua VNPAY"}
                      </p>
                      <p className="os-qr-mini">
                        Mã giao dịch:{" "}
                        <b>{paymentRef || bookingId || invoiceId || orderId}</b>
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="os-qr-skeleton" />
                      <p className="os-qr-hint">
                        {bookingId || invoiceId || subscriptionId
                          ? "Đang khởi tạo phiên thanh toán VNPAY..."
                          : "Thiếu mã tham chiếu thanh toán"}
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
                      : "Chuyển đến VNPAY"
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
            <h2 className="os-title">
              {bookingId
                ? "Xác nhận đơn đặt trước"
                : isCombo
                ? "Xác nhận thanh toán combo"
                : "Xác nhận thanh toán hóa đơn"}
            </h2>

            <div className="os-block">
              <h3>
                1.{" "}
                {bookingId
                  ? "Thông tin trụ sạc"
                  : isCombo
                  ? "Thông tin hóa đơn (combo)"
                  : "Thông tin hóa đơn"}
              </h3>
              {bookingId ? (
                <>
                  <p className="os-station-line">
                    <b>{station?.name}</b> — {charger?.title} — Cổng{" "}
                    <b>{gun?.name}</b>
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
                </>
              ) : isCombo ? (
                <ul className="os-station-list">
                  <li>
                    Charging InvoiceId: <b>{invoiceId}</b>
                  </li>
                  <li>
                    SubscriptionId: <b>{subscriptionId}</b>
                  </li>
                  <li>Công ty: {companyId ?? "—"}</li>
                </ul>
              ) : (
                <ul className="os-station-list">
                  <li>
                    Mã hóa đơn: <b>{invoiceId}</b>
                  </li>
                  <li>Công ty: {companyId ?? "—"}</li>
                </ul>
              )}
            </div>

            <div className="os-block">
              <h3>
                2.{" "}
                {bookingId
                  ? "Chi phí (phí đặt chỗ)"
                  : isCombo
                  ? "Tổng tiền combo"
                  : "Tổng tiền hóa đơn"}
              </h3>

              {bookingId ? (
                singleAmount == null ? (
                  <p className="os-warning">Đang chờ hệ thống tính phí...</p>
                ) : (
                  <table className="os-table">
                    <tbody>
                      <tr>
                        <td>Phí đặt chỗ (theo hệ thống)</td>
                        <td className="os-right">{vnd(singleAmount)}</td>
                      </tr>
                      <tr className="os-total">
                        <td>
                          <b>Tổng</b>
                        </td>
                        <td className="os-right">
                          <b>{vnd(singleAmount)}</b>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )
              ) : isCombo ? (
                <>
                  {invoiceAmount == null && (
                    <p className="os-warning">Đang lấy tiền Charging...</p>
                  )}
                  {subLoading && (
                    <p className="os-warning">Đang lấy tiền Subscription...</p>
                  )}
                  {(invoiceAmount != null ||
                    subAmount != null ||
                    serverAmount != null) && (
                    <table className="os-table">
                      <tbody>
                        <tr>
                          <td>Charging (InvoiceId: {invoiceId})</td>
                          <td className="os-right">
                            {invoiceAmount != null ? vnd(invoiceAmount) : "—"}
                          </td>
                        </tr>
                        <tr>
                          <td>
                            Subscription (SubscriptionId: {subscriptionId})
                          </td>
                          <td className="os-right">
                            {serverAmount != null && invoiceAmount != null
                              ? vnd(Math.max(0, serverAmount - invoiceAmount))
                              : subAmount != null
                              ? vnd(subAmount)
                              : subLoading
                              ? "…"
                              : "—"}
                          </td>
                        </tr>
                        <tr className="os-total">
                          <td>
                            <b>Tổng combo</b>
                          </td>
                          <td className="os-right">
                            <b>
                              {derivedComboTotal != null
                                ? vnd(derivedComboTotal)
                                : "—"}
                            </b>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </>
              ) : singleAmount == null ? (
                <p className="os-warning">Đang chờ hệ thống tính phí...</p>
              ) : (
                <table className="os-table">
                  <tbody>
                    <tr>
                      <td>Số tiền phải thanh toán</td>
                      <td className="os-right">{vnd(singleAmount)}</td>
                    </tr>
                    <tr className="os-total">
                      <td>
                        <b>Tổng</b>
                      </td>
                      <td className="os-right">
                        <b>{vnd(singleAmount)}</b>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}

              {bookingId ? (
                <p className="os-note">
                  Lưu ý: Đây là <b>phí đặt chỗ</b>, không phải tiền điện sạc.
                </p>
              ) : isCombo ? (
                <p className="os-note">
                  Bạn đang thanh toán <b>combo</b> gồm 1 hóa đơn Charging và 1
                  hóa đơn Subscription trong cùng một giao dịch.
                </p>
              ) : (
                <p className="os-note">
                  Bạn đang thanh toán cho <b>hóa đơn</b> đã phát sinh.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
