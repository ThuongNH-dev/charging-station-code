// src/utils/authHelpers.js
import { fetchAuthJSON, getApiBase } from "../utils/api";

// ==== Helpers chung để resolve customerId đúng với BE ====
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
    );
    return JSON.parse(jsonPayload || "{}");
  } catch { return {}; }
}
function getAccountIdFromToken() {
  const t = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
  if (!t) return null;
  const p = decodeJwtPayload(t);
  const raw =
    p?.accountId ??
    p?.AccountId ??
    p?.sub ??
    p?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function storeCustomerId(n) {
  try {
    if (Number.isFinite(n) && n > 0) {
      localStorage.setItem("customerId", String(n));
      sessionStorage.setItem("customerId", String(n));
    }
  } catch {}
}
export async function resolveCustomerIdFromAuth(apiBase) {
  // 0) storage fast-path
  try {
    const s = sessionStorage.getItem("customerId") || localStorage.getItem("customerId");
    const n = Number(s);
    if (Number.isFinite(n) && n > 0) return n;
  } catch {}
  // 1) /Auth (mảng) -> match accountId -> customers[0].customerId
  try {
    const accountId = getAccountIdFromToken();
    const res = await fetchAuthJSON(`${apiBase}/Auth`, { method: "GET" });
    const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    const mine = list.find(x => Number(x?.accountId) === Number(accountId));
    const cid = Number(mine?.customers?.[0]?.customerId) || null;
    if (cid) { storeCustomerId(cid); return cid; }
  } catch {}
  // 2) fallback /Customers/me
  try {
    const me = await fetchAuthJSON(`${apiBase}/Customers/me`, { method: "GET" });
    const cid = Number(me?.customerId ?? me?.CustomerId);
    if (Number.isFinite(cid) && cid > 0) { storeCustomerId(cid); return cid; }
  } catch {}
  return null;
}


// Lấy accountId ưu tiên từ JWT; fallback /Auth
export function getAccountIdStrict() {
  try {
    const t = localStorage.getItem("token") || "";
    const base64 = t.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    const p = base64
      ? JSON.parse(
          decodeURIComponent(
            atob(base64)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          )
        )
      : {};
    const NAME_ID = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
    const v = p?.[NAME_ID] ?? p?.sub ?? p?.userid ?? null;
    if (v != null && Number(v)) return Number(v);
  } catch {}
  // fallback nhẹ qua /Auth
  return fetchAuthJSON("/Auth")
    .then((me) => {
      const id =
        me?.accountId ?? me?.id ?? me?.userId ??
        me?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
      return id != null && Number(id) ? Number(id) : null;
    })
    .catch(() => null);
}

export async function getCustomerIdStrict() {
  // ưu tiên localStorage nếu đã lưu sau login
  const fromLS = localStorage.getItem("customerId");
  if (fromLS && Number(fromLS)) return Number(fromLS);

  // đồng nhất với PaymentSuccess: /Auth -> record.customers[0] -> /Customers/by-account
  const API_BASE = getApiBase();
  let authRes = null;
  try { authRes = await fetchAuthJSON(`/Auth`, { method: "GET" }); } catch {}
  if (!authRes) try { authRes = await fetchAuthJSON(`${API_BASE}/Auth`, { method: "GET" }); } catch {}

  // /Auth đôi khi trả thẳng customerId
  const direct =
    authRes?.customerId ?? authRes?.CustomerId ?? null;
  if (direct) return Number(direct);

  // Nếu /Auth trả danh sách customers
  const fromList =
    authRes?.customers?.[0]?.customerId ??
    authRes?.Customers?.[0]?.CustomerId ?? null;
  if (fromList) return Number(fromList);

  // Cuối cùng: tìm theo accountId -> customer
  const accountId =
    Number(
      authRes?.accountId ?? authRes?.id ?? authRes?.userId ??
      authRes?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"]
    ) || null;

  if (accountId) {
    try {
      const resp = await fetch(`${API_BASE.replace(/\/+$/, "")}/Customers/by-account/${accountId}`, {
        method: "GET",
        headers: { accept: "application/json", authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (resp.ok) {
        const j = await resp.json();
        if (j?.customerId) return Number(j.customerId);
      }
    } catch {}
  }

  return null;
}
