import { getApiBase, fetchAuthJSON } from "../utils/api";
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
        oldPassword: __mask(j.oldPassword),
        newPassword: __mask(j.newPassword),
        confirmPassword: __mask(j.confirmPassword),
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
function assertPayload(p = {}) {
  const normalized = {
    accountId:
      p.accountId ??
      Number.parseInt(localStorage.getItem("accountId"), 10) ??
      0,
    oldPassword: String(p.oldPassword ?? p.currentPassword ?? ""),
    newPassword: String(p.newPassword ?? ""),
    confirmPassword: String(p.confirmPassword ?? p.newPassword ?? ""),
  };

  if (!Number.isFinite(normalized.accountId)) normalized.accountId = 0;

  if (!normalized.oldPassword)
    throw new Error("Thiếu mật khẩu hiện tại (oldPassword)");
  if (!normalized.newPassword)
    throw new Error("Thiếu mật khẩu mới (newPassword)");
  if (!normalized.confirmPassword)
    throw new Error("Thiếu xác nhận mật khẩu mới (confirmPassword)");
  if (normalized.newPassword !== normalized.confirmPassword)
    throw new Error("Mật khẩu mới và xác nhận không khớp");
  if (normalized.newPassword === normalized.oldPassword)
    throw new Error("Mật khẩu mới không được trùng mật khẩu hiện tại");
  if (normalized.newPassword.length < 6)
    throw new Error("Mật khẩu mới tối thiểu 6 ký tự");

  return normalized;
}

/* =============== Change Password API =============== */
export const changePassword = async (payload = {}, opts = {}) => {
  const body = assertPayload(payload);
  const path = opts.path || "/Auth/change-password"; // đổi thành /api/change-password nếu BE bạn vậy
  const url = `${API_BASE}${path}`;

  __logFetch("[passwordApi.changePassword]", url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const res = await fetch(url, {
    method: "PUT",
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
        errText = j?.title || j?.message || "";
      }
    } catch {
      errText = (await res.text().catch(() => "")) || "";
    }
    throw new Error(errText || `Đổi mật khẩu thất bại (HTTP ${res.status})`);
  }

  if (res.status === 204) {
    return { success: true, message: "Đổi mật khẩu thành công" };
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  const okMsg =
    data?.message || data?.Message || data?.result || "Đổi mật khẩu thành công";

  return { success: true, message: okMsg };
};

export default { changePassword };
