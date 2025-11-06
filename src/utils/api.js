// src/utils/api.js

// === Base URL ===
// Dev: dùng Vite proxy => '/api'
// Prod: dùng biến môi trường như cũ (ví dụ 'https://your-domain/api')
// NEW: parse JSON an toàn
function tryParseJSON(text) {
  try { return JSON.parse(text); } catch { return null; }
}
// NEW: chuẩn hoá URL, path tương đối sẽ đi qua proxy /api
export function resolveUrl(pathOrUrl) {
  const s = String(pathOrUrl || "");
  if (/^https?:\/\//i.test(s)) return s;  // đã tuyệt đối
  // Bảo đảm luôn có tiền tố / (ví dụ "/Ports/1")
  const p = s.startsWith("/") ? s : `/${s}`;
  // Nếu đã bắt đầu bằng /api thì để nguyên; nếu chưa, tự thêm /api
  return p.startsWith("/api/") ? p : `/api${p}`;
}

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

export async function fetchAuthJSON(path, opts = {}) {
  const url = resolveUrl(path);                         // NEW: dùng resolver
  const headers = { ...(opts.headers || {}) };

  const t = getToken && getToken();
  if (t) headers.Authorization = `Bearer ${t}`;

  const res = await fetch(url, { ...opts, headers });

  const rawText = await res.text().catch(() => "");
  const data = rawText ? tryParseJSON(rawText) ?? rawText : null;

  if (!res.ok) {
    // Cố gắng lấy message chi tiết (ValidationProblemDetails của .NET)
    const msg =
      (data && (data.message || data.error || data.title)) ||
      `HTTP ${res.status}`;
    // Thêm details lỗi field nếu có
    const details = (data && data.errors) ? ` | ${JSON.stringify(data.errors)}` : "";
    throw new Error(`${msg}${details}`);
  }

  // Trả object nếu là JSON, còn lại trả raw string
  return typeof data === "string" ? { raw: data } : data;
}

