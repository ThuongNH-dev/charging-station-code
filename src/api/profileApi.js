// ✅ src/api/profileApi.js
import { getApiBase, fetchAuthJSON } from "../utils/api";
const API_BASE = getApiBase();

/* =============== Helpers (debug) =============== */
function __logFetch(label, url, options) {
  const token = localStorage.getItem("token");
  console.debug(`${label} →`, {
    url,
    method: options?.method || "GET",
    hasAuth: !!token,
    headers: options?.headers,
    bodyPreview: options?.body
      ? (() => {
          try {
            const j = JSON.parse(options.body);
            return { keys: Object.keys(j), sample: j };
          } catch {
            return String(options.body).slice(0, 200);
          }
        })()
      : undefined,
  });
}

/* =============== NORMALIZERS =============== */
function normalizeUser(u = {}) {
  const customers = u.customers ?? u.Customers ?? [];
  const customerObj =
    Array.isArray(customers) && customers.length ? customers[0] : {};
  const companyObj = u.company ?? u.Company ?? {};

  return {
    accountId: u.accountId ?? u.id ?? u.AccountId ?? u.Id,
    userName: u.userName ?? u.UserName ?? "",
    role: u.role ?? u.Role ?? "",
    status: u.status ?? u.Status ?? "",
    avatarUrl: u.avatarUrl ?? u.AvatarUrl ?? "",
    name:
      u.fullName ??
      u.FullName ??
      customerObj.fullName ??
      customerObj.FullName ??
      companyObj.name ??
      companyObj.Name ??
      u.name ??
      "",
    email: u.email ?? u.Email ?? customerObj.email ?? companyObj.email ?? "",
    phone: u.phone ?? u.Phone ?? customerObj.phone ?? companyObj.phone ?? "",
    address:
      u.address ?? u.Address ?? customerObj.address ?? companyObj.address ?? "",
    customerId:
      u.customerId ??
      u.CustomerId ??
      customerObj.customerId ??
      customerObj.CustomerId,
    companyId:
      u.companyId ??
      u.CompanyId ??
      companyObj.companyId ??
      companyObj.CompanyId,
    companyName: companyObj.name ?? companyObj.Name ?? "",
    taxCode: companyObj.taxCode ?? companyObj.TaxCode ?? "",
  };
}

// Chuẩn hoá đối tượng Doanh nghiệp về schema FE dùng
function normalizeCompany(c = {}) {
  return {
    companyId: c.companyId ?? c.CompanyId ?? c.id ?? c.Id ?? null,
    name: c.name ?? c.Name ?? "",
    taxCode: c.taxCode ?? c.TaxCode ?? "",
    email: c.email ?? c.Email ?? "",
    phone: c.phone ?? c.Phone ?? "",
    address: c.address ?? c.Address ?? "",
    imageUrl: c.imageUrl ?? c.ImageUrl ?? c.logoUrl ?? c.LogoUrl ?? "",
  };
}

console.log("[profileApi] API_BASE =", API_BASE);

/* =============== PROFILE (USER) =============== */
export const getCurrentUser = async ({ accountId, userName } = {}) => {
  // Thử /Auth/{id} trước (nếu có accountId)
  if (accountId && accountId !== "null" && accountId !== "undefined") {
    try {
      const url = `${API_BASE}/Auth/${encodeURIComponent(accountId)}`;
      __logFetch("[profileApi.getCurrentUser] /Auth/{id}", url, {
        method: "GET",
      });
      const res = await fetchAuthJSON(url, { method: "GET" });
      return normalizeUser(res);
    } catch (e) {
      console.warn(
        "[profileApi.getCurrentUser] /Auth/{id} fail, fallback /Auth:",
        e?.message
      );
    }
  }

  // Fallback: /Auth (có thể trả list/object)
  const listUrl = `${API_BASE}/Auth`;
  __logFetch("[profileApi.getCurrentUser] /Auth", listUrl, { method: "GET" });
  const res = await fetchAuthJSON(listUrl, { method: "GET" });

  const list = Array.isArray(res)
    ? res
    : Array.isArray(res?.items)
    ? res.items
    : res && typeof res === "object"
    ? [res]
    : [];

  if (userName) {
    const found = list.find((x) => (x.userName ?? x.UserName) === userName);
    if (found) return normalizeUser(found);
  }
  return normalizeUser(list[0] || {});
};

export const updateUser = async (payload = {}, opts = {}) => {
  const isCompany =
    opts.type === "company" ||
    !!payload.companyId ||
    (payload.role && String(payload.role).toLowerCase() === "company");

  if (isCompany) {
    const body = {
      CompanyId: payload.companyId,
      Name: payload.companyName ?? payload.name ?? "",
      TaxCode: payload.taxCode ?? "",
      Email: payload.email ?? "",
      Phone: payload.phone ?? "",
      Address: payload.address ?? "",
      ImageUrl: payload.imageUrl ?? payload.avatarUrl ?? "",
    };
    const url = `${API_BASE}/Auth/update-company`;
    __logFetch("[profileApi.updateUser] company", url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const res = await fetchAuthJSON(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return normalizeUser(res);
  }

  const body = {
    CustomerId: payload.customerId,
    FullName: payload.name ?? payload.fullName ?? "",
    Phone: payload.phone ?? "",
    Address: payload.address ?? "",
  };
  const url = `${API_BASE}/Auth/update-customer`;
  __logFetch("[profileApi.updateUser] customer", url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await fetchAuthJSON(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return normalizeUser(res);
};

export const changeAccountStatus = async (accountId, newStatus) => {
  const url = `${API_BASE}/Auth/changestatus/${encodeURIComponent(accountId)}`;
  __logFetch("[profileApi.changeAccountStatus]", url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: newStatus }),
  });
  return fetchAuthJSON(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: newStatus }),
  });
};

export const changeAccountRole = async (accountId, newRole) => {
  const url = `${API_BASE}/Auth/changerole/${encodeURIComponent(accountId)}`;
  __logFetch("[profileApi.changeAccountRole]", url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: newRole }),
  });
  return fetchAuthJSON(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: newRole }),
  });
};

export const uploadAvatar = async ({ accountId, file }) => {
  const url = `${API_BASE}/Auth/upload-avatar/${encodeURIComponent(accountId)}`;
  console.debug("[profileApi.uploadAvatar] Request:", {
    url,
    hasFile: !!file,
    accountId,
  });

  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
    body: fd,
  });
  if (!res.ok)
    throw new Error(
      (await res.text().catch(() => "")) || "Upload avatar thất bại"
    );

  const data = await res.json().catch(() => ({}));
  return normalizeUser(data);
};

/* =============== ENTERPRISE (COMPANY) =============== */
/**
 * Trả về object:
 * {
 *   companyId, name, taxCode, email, phone, address, imageUrl
 * }
 * Nguồn dữ liệu: /Auth (hoặc /Auth/{id}) → lấy company trong đó và chuẩn hoá.
 */
export const getEnterpriseInfo = async () => {
  const u = await getCurrentUser();
  const companyObj = {
    CompanyId: u.companyId,
    Name: u.companyName || u.name,
    TaxCode: u.taxCode,
    Email: u.email,
    Phone: u.phone,
    Address: u.address,
    ImageUrl: u.avatarUrl,
  };
  return normalizeCompany(companyObj);
};

/**
 * Cập nhật thông tin doanh nghiệp:
 * body BE yêu cầu:
 * {
 *   CompanyId, Name, TaxCode, Email, Phone, Address, ImageUrl
 * }
 */
export const updateEnterpriseInfo = async (payload = {}) => {
  const body = {
    CompanyId: payload.companyId,
    Name: payload.name ?? "",
    TaxCode: payload.taxCode ?? "",
    Email: payload.email ?? "",
    Phone: payload.phone ?? "",
    Address: payload.address ?? "",
    ImageUrl: payload.imageUrl ?? "",
  };
  const url = `${API_BASE}/Auth/update-company`;
  __logFetch("[profileApi.updateEnterpriseInfo]", url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const res = await fetchAuthJSON(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // Nhiều BE trả về user kèm company; cố gắng bóc company, nếu không có thì dùng body
  const companyRaw =
    res?.company ??
    res?.Company ??
    res?.message?.company ??
    res?.Message?.Company ??
    res ??
    body;

  return normalizeCompany(companyRaw);
};

/* =====================================================
   ❌ ĐÃ GỠ CÁC API VỀ VEHICLE theo yêu cầu (không sử dụng)
   ===================================================== */
