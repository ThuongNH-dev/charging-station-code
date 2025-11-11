// ✅ src/api/passwordRecoveryApi.js
import { getApiBase } from "../utils/api";
const API_BASE = getApiBase();

/* =============== Helpers (debug) =============== */
function __mask(pw) {
  if (typeof pw !== "string") return pw;
  if (!pw) return "";
  return "*".repeat(Math.min(10, pw.length));
}

function __logFetch(label, url, options) {
  const token = localStorage.getItem("token");
  let bodyPreview = options?.body;
  try {
    const j =
      typeof bodyPreview === "string" ? JSON.parse(bodyPreview) : bodyPreview;
    if (j && typeof j === "object") {
      bodyPreview = {
        ...j,
        newPassword: __mask(j.newPassword),
        confirmPassword: __mask(j.confirmPassword),
        resetToken: j.resetToken
          ? `${String(j.resetToken).slice(0, 6)}…`
          : undefined,
      };
    }
  } catch {
    bodyPreview = undefined;
  }
  console.debug(`${label} →`, {
    url,
    method: options?.method || "POST",
    hasAuth: !!token,
    headers: options?.headers,
    bodyPreview,
  });
}

/* =============== Validators =============== */
function assertForgotPayload(p = {}) {
  const userNameOrEmail = String(
    p.userNameOrEmail ?? p.username ?? p.email ?? ""
  ).trim();
  if (!userNameOrEmail) throw new Error("Thiếu userNameOrEmail");
  return { userNameOrEmail };
}

function assertResetPayload(p = {}) {
  const normalized = {
    resetToken: String(p.resetToken ?? p.token ?? "").trim(),
    newPassword: String(p.newPassword ?? "").trim(),
    confirmPassword: String(p.confirmPassword ?? p.newPassword ?? "").trim(),
  };
  if (!normalized.resetToken) throw new Error("Thiếu resetToken");
  if (!normalized.newPassword)
    throw new Error("Thiếu mật khẩu mới (newPassword)");
  if (!normalized.confirmPassword)
    throw new Error("Thiếu xác nhận mật khẩu (confirmPassword)");
  if (normalized.newPassword !== normalized.confirmPassword)
    throw new Error("Mật khẩu mới và xác nhận không khớp");
  if (normalized.newPassword.length < 6)
    throw new Error("Mật khẩu mới tối thiểu 6 ký tự");
  return normalized;
}

/* =============== Token extractor =============== */
/**
 * Cố gắng trích token từ message trả về của BE, ví dụ:
 * "Token đặt lại mật khẩu của bạn: <BASE64>"
 */
function extractTokenFromMessage(message = "") {
  if (!message) return null;

  // Ưu tiên sau dấu ":" hoặc sau từ "Token"
  const afterColon = message.split(":").slice(1).join(":").trim();
  // Token dạng base64 khá dài, cho pattern rộng 20+ ký tự
  const base64ish = /[A-Za-z0-9+/=]{20,}/g;

  const candidates = [];
  if (afterColon) {
    const m = afterColon.match(base64ish);
    if (m && m[0]) candidates.push(m[0]);
  }
  if (!candidates.length) {
    const m = message.match(base64ish);
    if (m && m[0]) candidates.push(m[0]);
  }

  return candidates.length ? candidates[0] : null;
}

/* =============== APIs =============== */
/**
 * 📩 Gửi yêu cầu quên mật khẩu
 * POST /api/Auth/forgot-password
 * Body: { "userNameOrEmail": "string" }
 */
export const forgotPassword = async (payload = {}, opts = {}) => {
  const body = assertForgotPayload(payload);
  const path = opts.path || "/Auth/forgot-password";
  const url = `${API_BASE}${path}`;

  __logFetch("[passwordRecovery.forgotPassword]", url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errText = "";
    try {
      const j = await res.json();
      errText = j?.message || j?.title || "";
    } catch {
      errText = (await res.text().catch(() => "")) || "";
    }
    throw new Error(
      errText || `Gửi yêu cầu quên mật khẩu thất bại (HTTP ${res.status})`
    );
  }

  let data = null;
  let rawText = "";
  try {
    data = await res.json();
  } catch {
    rawText = await res.text().catch(() => "");
  }

  const message =
    data?.message ||
    data?.Message ||
    rawText ||
    "Đã gửi hướng dẫn đặt lại mật khẩu (nếu tài khoản tồn tại).";

  // ✅ Trích token ngay nếu BE đang trả thẳng trong message
  const token = extractTokenFromMessage(message);

  return { success: true, message, token: token || null };
};

/**
 * 🔑 Đặt lại mật khẩu bằng token
 * POST /api/Auth/reset-password
 */
export const resetPassword = async (payload = {}, opts = {}) => {
  const body = assertResetPayload(payload);
  const path = opts.path || "/Auth/reset-password";
  const url = `${API_BASE}${path}`;

  __logFetch("[passwordRecovery.resetPassword]", url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errText = "";
    try {
      const j = await res.json();
      if (j?.errors) {
        const parts = Object.entries(j.errors).flatMap(([k, arr]) =>
          (arr || []).map((m) => `${k}: ${m}`)
        );
        errText = parts.join("\n");
      } else {
        errText = j?.message || j?.title || "";
      }
    } catch {
      errText = (await res.text().catch(() => "")) || "";
    }
    throw new Error(
      errText || `Đặt lại mật khẩu thất bại (HTTP ${res.status})`
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  const msg = data?.message || data?.Message || "Đặt lại mật khẩu thành công.";
  return { success: true, message: msg };
};

export default { forgotPassword, resetPassword };
