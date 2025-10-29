// ✅ src/api/profileApi.js
import { getApiBase, fetchAuthJSON } from "../utils/api";
const API_BASE = getApiBase();

// Ảnh mặc định nếu không nhập
const DEFAULT_IMAGE_URL =
  "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg";

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

function normalizeStaff(s = {}) {
  // 🚀 THAY THẾ staffId bằng customerId
  const customerId =
    s.customerId ?? // Lấy customerId nếu có
    s.CustomerId ??
    s.accountId ?? // Lấy accountId (giá trị 3) làm dự phòng
    s.AccountId ??
    s.id ??
    s.Id ??
    null;

  return {
    // ❌ Xóa staffId
    // ✅ Dùng customerId thay thế cho Mã NV
    customerId: customerId,
    fullName: s.fullName ?? s.FullName ?? s.name ?? s.Name ?? "",
    email: s.email ?? s.Email ?? "",
    phone: s.phone ?? s.Phone ?? "",
    address: s.address ?? s.Address ?? "",
    avatarUrl:
      s.avatarUrl ??
      s.AvatarUrl ??
      s.imageUrl ??
      s.ImageUrl ??
      s.photoUrl ??
      s.PhotoUrl ??
      "",
  };
}

/**
 * Lấy staff-info:
 * - Ưu tiên /Auth/{id} (nếu trả kèm Staff).
 * - Nếu không có, thử /Staff/{staffId}.
 * - Nếu vẫn không có và role=Staff → dựng từ user/customers để hiển thị.
 */
export const getStaffInfo = async () => {
  const accountId = localStorage.getItem("accountId");

  if (accountId && accountId !== "null" && accountId !== "undefined") {
    try {
      const url = `${API_BASE}/Auth/${encodeURIComponent(accountId)}`;
      __logFetch("[profileApi.getStaffInfo] /Auth/{id}", url, {
        method: "GET",
      });
      const res = await fetchAuthJSON(url, { method: "GET" });

      // 1) Staff kèm trong user
      const staffRaw =
        res?.staff ??
        res?.Staff ??
        res?.employee ??
        res?.Employee ??
        (Array.isArray(res?.staffs) ? res.staffs[0] : null) ??
        (Array.isArray(res?.Employees) ? res.Employees[0] : null);

      if (staffRaw) return normalizeStaff(staffRaw);

      // 2) Nếu user có staffId → gọi /Staff/{id}
      const u = normalizeUser(res);
      const staffId =
        u?.staffId ??
        res?.staffId ??
        res?.StaffId ??
        (Array.isArray(res?.Staffs) && res.Staffs[0]?.StaffId) ??
        null;

      if (staffId) {
        const sUrl = `${API_BASE}/Staff/${encodeURIComponent(staffId)}`;
        __logFetch("[profileApi.getStaffInfo] /Staff/{id}", sUrl, {
          method: "GET",
        });
        const staff = await fetchAuthJSON(sUrl, { method: "GET" });
        return normalizeStaff(staff);
      }

      // 3) Fallback: nếu role=Staff nhưng không có entity staff → dựng từ user/customers
      if ((u.role || "").toLowerCase() === "staff") {
        const c0 =
          (Array.isArray(res?.customers) && res.customers[0]) ||
          (Array.isArray(res?.Customers) && res.Customers[0]) ||
          {};
        return normalizeStaff({
          AccountId: u.accountId,
          CustomerId: c0.customerId,
          StaffId: null,
          FullName: u.name || c0.fullName || res.userName || "",
          Email: u.email || "",
          Phone: u.phone || c0.phone || "",
          Address: u.address || c0.address || "",
          AvatarUrl: u.avatarUrl || "",
        });
      }
    } catch (e) {
      console.warn("[getStaffInfo] try /Auth/{id}/Staff fail:", e?.message);
    }
  }

  // 4) Fallback nữa: lấy current user rồi suy ra staff
  try {
    const u = await getCurrentUser({ accountId });
    const staffId = u?.staffId ?? null;
    if (staffId) {
      const sUrl = `${API_BASE}/Staff/${encodeURIComponent(staffId)}`;
      __logFetch("[profileApi.getStaffInfo] /Staff/{id} (fallback)", sUrl, {
        method: "GET",
      });
      const staff = await fetchAuthJSON(sUrl, { method: "GET" });
      return normalizeStaff(staff);
    }
    if ((u.role || "").toLowerCase() === "staff") {
      return normalizeStaff({
        StaffId: null,
        FullName: u.name || u.userName || "",
        Email: u.email || "",
        Phone: u.phone || "",
        Address: u.address || "",
        AvatarUrl: u.avatarUrl || "",
      });
    }
  } catch (e) {
    console.warn("[getStaffInfo] fallback fail:", e?.message);
  }

  return normalizeStaff({});
};

/**
 * Cập nhật Staff (cần StaffId). Nếu BE khác, đổi URL/body cho khớp.
 */
export const updateStaffInfo = async (payload = {}) => {
  if (!payload.customerId) {
    throw new Error("Thiếu StaffId – không thể cập nhật thông tin nhân viên.");
  }

  const rawImg =
    typeof payload.avatarUrl === "string" ? payload.avatarUrl.trim() : "";
  const avatarUrl = rawImg || DEFAULT_IMAGE_URL;

  const body = {
    CustomerId: payload.customerId,
    FullName: payload.fullName ?? "",
    Phone: payload.phone ?? "",
    Address: payload.address ?? "",
    AvatarUrl: avatarUrl,
  };

  const url = `${API_BASE}/Auth/update-customer`; // 🚀 GỌI ĐÚNG ENDPOINT
  __logFetch("[profileApi.updateStaffInfo] via /update-customer", url, {
    method: "PUT", // 🚀 SỬ DỤNG METHOD PUT
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
      errText = await res.text().catch(() => "");
    }
    throw new Error(errText || `Cập nhật thất bại (HTTP ${res.status})`);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  const candidate =
    data?.staff ??
    data?.Staff ??
    data?.message?.staff ??
    data?.Message?.Staff ??
    data ??
    null;

  let normalized = normalizeStaff(candidate || {});
  const isEmpty =
    !normalized.staffId &&
    !normalized.fullName &&
    !normalized.email &&
    !normalized.phone &&
    !normalized.address &&
    !normalized.avatarUrl;

  if (isEmpty) normalized = normalizeStaff(body);
  return normalized;
};

console.log("[profileApi] API_BASE =", API_BASE);

/* =============== PROFILE (USER) =============== */
export const getCurrentUser = async ({ accountId, userName } = {}) => {
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
    const rawImg = (payload.imageUrl ?? payload.avatarUrl ?? "").trim();
    const imageUrl = rawImg ? rawImg : DEFAULT_IMAGE_URL;

    const body = {
      CompanyId: payload.companyId,
      Name: payload.companyName ?? payload.name ?? "",
      TaxCode: payload.taxCode ?? "",
      Email: payload.email ?? "",
      Phone: payload.phone ?? "",
      Address: payload.address ?? "",
      ImageUrl: imageUrl,
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
export const getEnterpriseInfo = async () => {
  const accountId = localStorage.getItem("accountId");

  if (accountId && accountId !== "null" && accountId !== "undefined") {
    try {
      const url = `${API_BASE}/Auth/${encodeURIComponent(accountId)}`;
      __logFetch("[profileApi.getEnterpriseInfo] /Auth/{id}", url, {
        method: "GET",
      });
      const res = await fetchAuthJSON(url, { method: "GET" });
      const rawCompany = res?.company ?? res?.Company ?? null;
      if (rawCompany) return normalizeCompany(rawCompany);
    } catch (e) {
      console.warn("[getEnterpriseInfo] /Auth/{id} fail:", e?.message);
    }
  }

  const u = await getCurrentUser({ accountId });

  if (!u.companyId) return normalizeCompany({});

  try {
    const url = `${API_BASE}/Company/${encodeURIComponent(u.companyId)}`;
    __logFetch("[profileApi.getEnterpriseInfo] /Company/{id}", url, {
      method: "GET",
    });
    const company = await fetchAuthJSON(url, { method: "GET" });
    return normalizeCompany(company);
  } catch (e) {
    console.warn("[getEnterpriseInfo] /Company/{id} fail:", e?.message);
    return normalizeCompany({ CompanyId: u.companyId });
  }
};

/**
 * Cập nhật thông tin doanh nghiệp – chỉ gửi field company
 */
export const updateEnterpriseInfo = async (payload = {}) => {
  if (!payload.companyId) {
    throw new Error(
      "Thiếu CompanyId – không thể cập nhật thông tin doanh nghiệp."
    );
  }

  const rawImg =
    typeof payload.imageUrl === "string" ? payload.imageUrl.trim() : "";
  const imageUrl = rawImg || DEFAULT_IMAGE_URL;

  const body = {
    CompanyId: payload.companyId,
    Name: payload.name ?? "",
    TaxCode: payload.taxCode ?? "",
    Email: payload.email ?? "",
    Phone: payload.phone ?? "",
    Address: payload.address ?? "",
    ImageUrl: imageUrl,
  };
  const url = `${API_BASE}/Auth/update-company`;
  __logFetch("[profileApi.updateEnterpriseInfo]", url, {
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
      errText = await res.text().catch(() => "");
    }
    throw new Error(errText || `Cập nhật thất bại (HTTP ${res.status})`);
  }

  if (res.status === 204) return normalizeCompany(body);

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  const candidate =
    data?.company ??
    data?.Company ??
    data?.message?.company ??
    data?.Message?.Company ??
    data ??
    null;

  let normalized = normalizeCompany(candidate || {});
  const isEmpty =
    !normalized.companyId &&
    !normalized.name &&
    !normalized.taxCode &&
    !normalized.email &&
    !normalized.phone &&
    !normalized.address &&
    !normalized.imageUrl;

  if (isEmpty) normalized = normalizeCompany(body);
  return normalized;
};

/* =====================================================
   ❌ ĐÃ GỠ API VEHICLE theo yêu cầu
   ===================================================== */
