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

/* =============== PROFILE =============== */
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

console.log("[profileApi] API_BASE =", API_BASE);

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

/* =============== VEHICLE (gộp vào profileApi) =============== */
function normalizeVehicle(v = {}) {
  return {
    id: v.vehicleId ?? v.VehicleId ?? v.id ?? v.Id,
    customerId: v.customerId ?? v.CustomerId,
    companyId: v.companyId ?? v.CompanyId,
    carMaker: v.carMaker ?? v.CarMaker ?? "",
    model: v.model ?? v.Model ?? "",
    licensePlate: v.licensePlate ?? v.LicensePlate ?? "",
    batteryCapacity: v.batteryCapacity ?? v.BatteryCapacity ?? null,
    currentSoc: v.currentSoc ?? v.CurrentSoc ?? null,
    connectorType: v.connectorType ?? v.ConnectorType ?? "",
    manufactureYear: v.manufactureYear ?? v.ManufactureYear ?? null,
    status: v.status ?? v.Status ?? "Active",
    imageUrl: v.imageUrl ?? v.ImageUrl ?? "",
    vehicleType: v.vehicleType ?? v.VehicleType ?? "",
    createdAt: v.createdAt ?? v.CreatedAt,
    updatedAt: v.updatedAt ?? v.UpdatedAt,
  };
}

export const listVehicles = async ({
  page = 1,
  pageSize = 100,
  filters = {},
} = {}) => {
  const qs = new URLSearchParams({
    page,
    pageSize,
    licensePlate: filters.licensePlate ?? "",
    carMaker: filters.carMaker ?? "",
    model: filters.model ?? "",
    status: filters.status ?? "",
    yearFrom: filters.yearFrom ?? "",
    yearTo: filters.yearTo ?? "",
    vehicleType: filters.vehicleType ?? "",
  }).toString();

  const url = `${API_BASE}/Vehicles?${qs}`;
  __logFetch("[profileApi.listVehicles] Request", url, { method: "GET" });

  const res = await fetchAuthJSON(url, { method: "GET" }).catch((e) => {
    console.error("[profileApi.listVehicles] fetch error:", e);
    throw e;
  });

  console.debug("[profileApi.listVehicles] Raw response:", res);

  const items = Array.isArray(res)
    ? res
    : Array.isArray(res?.items)
    ? res.items
    : Array.isArray(res?.Items)
    ? res.Items
    : res && typeof res === "object"
    ? [res]
    : [];

  if (!Array.isArray(items) || items.length === 0) {
    console.warn(
      "[profileApi.listVehicles] Không có vehicle nào trong response."
    );
  } else {
    console.table(
      items.map((x) => ({
        id: x.vehicleId ?? x.VehicleId ?? x.id ?? x.Id,
        CustomerId: x.customerId ?? x.CustomerId,
        CompanyId: x.companyId ?? x.CompanyId,
        LicensePlate: x.licensePlate ?? x.LicensePlate,
      }))
    );
  }

  const normalized = items.map(normalizeVehicle);
  console.debug("[profileApi.listVehicles] Normalized:", normalized);
  return normalized;
};

export const getVehicleById = async (id) => {
  const url = `${API_BASE}/Vehicles/${encodeURIComponent(id)}`;
  __logFetch("[profileApi.getVehicleById] Request", url, { method: "GET" });

  const res = await fetchAuthJSON(url, { method: "GET" });
  console.debug("[profileApi.getVehicleById] Raw response:", res);

  const n = normalizeVehicle(res);
  console.debug("[profileApi.getVehicleById] Normalized:", n);
  return n;
};

export const createVehicle = async (payload) => {
  const body = {
    CustomerId: payload.customerId,
    CompanyId: payload.companyId,
    CarMaker: payload.carMaker,
    Model: payload.model,
    LicensePlate: payload.licensePlate?.trim().toUpperCase(),
    BatteryCapacity: payload.batteryCapacity,
    CurrentSoc: payload.currentSoc,
    ConnectorType: payload.connectorType,
    ManufactureYear: payload.manufactureYear,
    ImageUrl: payload.imageUrl,
    VehicleType: payload.vehicleType,
    Status: payload.status,
  };
  const url = `${API_BASE}/Vehicles`;
  __logFetch("[profileApi.createVehicle] Request", url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const res = await fetchAuthJSON(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.debug("[profileApi.createVehicle] Raw response:", res);

  const n = normalizeVehicle(res);
  console.debug("[profileApi.createVehicle] Normalized:", n);
  return n;
};

export const updateVehicle = async (id, payload) => {
  const body = {
    // Nếu BE yêu cầu cả CustomerId khi update, mở dòng dưới:
    // CustomerId: payload.customerId,
    CompanyId: payload.companyId,
    CarMaker: payload.carMaker,
    Model: payload.model,
    LicensePlate: payload.licensePlate?.trim().toUpperCase(),
    BatteryCapacity: payload.batteryCapacity,
    CurrentSoc: payload.currentSoc,
    ConnectorType: payload.connectorType,
    ManufactureYear: payload.manufactureYear,
    ImageUrl: payload.imageUrl,
    VehicleType: payload.vehicleType,
    Status: payload.status,
  };
  const url = `${API_BASE}/Vehicles/${encodeURIComponent(id)}`;
  __logFetch("[profileApi.updateVehicle] Request", url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const res = await fetchAuthJSON(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.debug("[profileApi.updateVehicle] Raw response:", res);

  const n = normalizeVehicle(res);
  console.debug("[profileApi.updateVehicle] Normalized:", n);
  return n;
};

export const deleteVehicle = async (id) => {
  const url = `${API_BASE}/Vehicles/${encodeURIComponent(id)}`;
  __logFetch("[profileApi.deleteVehicle] Request", url, { method: "DELETE" });
  return fetchAuthJSON(url, { method: "DELETE" });
};

export const updateVehicleStatus = async (id, status) => {
  const url = `${API_BASE}/Vehicles/${encodeURIComponent(id)}/status`;
  const body = { status };
  __logFetch("[profileApi.updateVehicleStatus] Request", url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return fetchAuthJSON(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

export const uploadVehicleImage = async ({ id, file }, opts = {}) => {
  const fd = new FormData();
  fd.append("file", file);
  if (!opts.usePathId) fd.append("vehicleId", id);

  const url = opts.usePathId
    ? `${API_BASE}/Vehicles/${encodeURIComponent(id)}/image/upload`
    : `${API_BASE}/Vehicles/image/upload`;

  console.debug("[profileApi.uploadVehicleImage] Request:", {
    url,
    usePathId: !!opts.usePathId,
    hasFile: !!file,
    vehicleId: id,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
    body: fd,
  });

  console.debug("[profileApi.uploadVehicleImage] Response status:", res.status);
  if (!res.ok) throw new Error("Upload ảnh xe thất bại");

  const data = await res.json().catch(() => ({}));
  console.debug("[profileApi.uploadVehicleImage] Raw response:", data);

  const n = normalizeVehicle(data);
  console.debug("[profileApi.uploadVehicleImage] Normalized:", n);
  return n;
};
