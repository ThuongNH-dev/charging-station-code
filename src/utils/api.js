// src/utils/api.js

// === Base URL ===
// Dev: dùng Vite proxy => '/api'
// Prod: dùng biến môi trường như cũ (ví dụ 'https://your-domain/api')
export function getApiBase() {
  if (
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.DEV
  ) {
    return "/api";
  }
  const fromEnv =
    (typeof import.meta !== "undefined"
      ? import.meta.env.VITE_API_URL
      : process.env.REACT_APP_API_URL) ?? "https://localhost:7268/api";
  return fromEnv;
}

// Giữ tương thích với code đang import API_BASE ở nơi khác
export const API_BASE = getApiBase();

export function getToken() {
  return localStorage.getItem("token") || "";
}
export function setToken(t) {
  if (t) localStorage.setItem("token", t);
}
export function clearToken() {
  localStorage.removeItem("token");
}

// Chuẩn hoá URL: chấp nhận
// - URL tuyệt đối: http(s)://...
// - Đường dẫn đã bắt đầu bằng '/api' (đã đúng base) -> giữ nguyên
// - Đường dẫn tương đối: 'Booking' hoặc '/Booking' -> nối vào API_BASE
export function resolveUrl(input) {
  if (!input) return API_BASE;
  const abs = /^https?:\/\//i.test(input);
  if (abs) return input;

  // Nếu đã bắt đầu bằng '/api' thì dùng nguyên như vậy (đi qua proxy ở dev)
  if (input.startsWith("/api")) return input;

  const base = getApiBase();
  const left = base.replace(/\/+$/, "");
  const right = String(input).replace(/^\/+/, "");
  return `${left}/${right}`;
}

export async function fetchJSON(url, init = {}) {
  const finalUrl = resolveUrl(url);
  const res = await fetch(finalUrl, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(text || `HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

export async function fetchAuthJSON(pathOrUrl, init = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const finalUrl = resolveUrl(pathOrUrl);
  const res = await fetch(finalUrl, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(text || `HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}
