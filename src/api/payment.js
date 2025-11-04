// src/api/payment.js
import { getApiBase, getToken } from "../utils/api";

const API_BASE = (getApiBase() || "").replace(/\/+$/, "");

async function postJSON(url, body, opts = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(opts.noAuth ? {} : { Authorization: `Bearer ${getToken?.() || ""}` }),
      Accept: "*/*",
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  // API create-url thường trả về { paymentUrl: "..." } hoặc { url: "..." }
  // Chuẩn hoá: lấy paymentUrl/url/location
  const data = await res.json().catch(() => ({}));
  const urlField =
    data.paymentUrl || data.url || data.location || data.redirectUrl || null;
  return urlField ? { ...data, paymentUrl: urlField } : data;
}

/**
 * Thanh toán đơn lẻ (tuỳ chọn truyền đúng 1 id hoặc kèm description).
 * @param {Object} payload
 * { bookingId?, invoiceId?, companyId?, subscriptionId?, chargingSessionId?, description? }
 */
export async function createSinglePaymentUrl(payload = {}) {
  const url = `${API_BASE}/api/Payment/create`;
  return postJSON(url, {
    bookingId: payload.bookingId || 0,
    invoiceId: payload.invoiceId || 0,
    companyId: payload.companyId || 0,
    subscriptionId: payload.subscriptionId || 0,
    chargingSessionId: payload.chargingSessionId || 0,
    description: payload.description || "",
  });
}

/**
 * Thanh toán combo: invoice + subscription (2 hoá đơn cùng lúc)
 * @param {number} invoiceId
 * @param {number} subscriptionId
 */
export async function createComboPaymentUrl(invoiceId, subscriptionId) {
  const url = `${API_BASE}/api/Payment/create-combo-url`;
  return postJSON(url, {
    invoiceId: Number(invoiceId) || 0,
    subscriptionId: Number(subscriptionId) || 0,
  });
}

/**
 * Gia hạn 1 subscription
 * @param {number} subscriptionId
 */
export async function createSubscriptionRenewUrl(subscriptionId) {
  const url = `${API_BASE}/api/Payment/create-subscription/${subscriptionId}`;
  // BE không cần body → truyền null
  return postJSON(url, null);
}

/** Điều hướng sang cổng thanh toán */
export function goToPayment(paymentUrl) {
  if (!paymentUrl) throw new Error("Không có paymentUrl để điều hướng.");
  // Lưu cờ trạng thái nếu muốn đọc lại ở callback/return
  sessionStorage.setItem("payment:redirecting", "1");
  window.location.href = paymentUrl;
}
