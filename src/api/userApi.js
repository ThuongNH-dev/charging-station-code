// src/api/userApi.js
import axios from "axios";

const BASE_URL = import.meta.env.DEV ? "/api" : "https://localhost:7268/api";

// Loại bỏ undefined khỏi payload trước khi gửi
const clean = (obj = {}) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/* ===== Helpers rút ID an toàn từ object (phòng dữ liệu lồng) ===== */
const extractCustomerId = (data) =>
  data?.customerId ??
  data?.CustomerId ??
  data?.customers?.[0]?.customerId ??
  data?.Customers?.[0]?.CustomerId ??
  null;

const extractCompanyId = (data) =>
  data?.companyId ??
  data?.CompanyId ??
  data?.company?.companyId ??
  data?.Company?.CompanyId ??
  null;

export const userApi = {
  // ===== AUTH / USERS =====
  fetchAllUsers: async () => {
    const res = await axios.get(`${BASE_URL}/Auth`);
    return res.data;
  },

  /**
   * UPDATE USER
   * - Customer: PUT /api/Auth/update-customer  body: { customerId, fullName, phone, address, email }
   * - Company : PUT /api/Auth/update-company   body: { companyId, name, taxCode, email, phone, address, imageUrl }
   * Backend tìm theo ID trong BODY => thiếu ID chắc chắn lỗi.
   */
  updateUser: async (_id, data, role) => {
    if (role === "Company") {
      const companyId = extractCompanyId(data);
      if (!companyId) {
        throw new Error(
          "Thiếu companyId trong payload update-company. Hãy truyền companyId hoặc company.companyId."
        );
      }

      const payload = clean({
        companyId,
        name: data?.name ?? data?.companyName,
        taxCode: data?.taxCode,
        email: data?.email ?? data?.companyEmail,
        phone: data?.phone ?? data?.companyPhone,
        address: data?.address,
        imageUrl: data?.imageUrl,
      });

      // console.debug("PUT /Auth/update-company payload:", payload);
      const res = await axios.put(`${BASE_URL}/Auth/update-company`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      return res.data;
    }

    // Customer
    const customerId = extractCustomerId(data);
    if (!customerId) {
      throw new Error(
        "Thiếu customerId trong payload update-customer. Hãy truyền customerId hoặc customers[0].customerId."
      );
    }

    const payload = clean({
      customerId,
      fullName: data?.fullName ?? data?.name,
      phone: data?.phone,
      address: data?.address,
      email: data?.email,
    });

    // console.debug("PUT /Auth/update-customer payload:", payload);
    const res = await axios.put(`${BASE_URL}/Auth/update-customer`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },

  /**
   * CHANGE STATUS
   * PUT /api/Auth/changestatus/{accountId}?newStatus=Active|Inactive
   * → truyền qua QUERY, không gửi body.
   */
  updateUserStatus: async (accountId, data) => {
    const newStatus =
      typeof data === "string" ? data : data?.status || data?.newStatus;
    const res = await axios.put(
      `${BASE_URL}/Auth/changestatus/${accountId}?newStatus=${encodeURIComponent(
        newStatus
      )}`
    );
    return res.data;
  },

  /**
   * CHANGE ROLE
   * PUT /api/Auth/changerole/{accountId}?newRole=...
   */
  changeUserRole: async (accountId, role) => {
    const res = await axios.put(
      `${BASE_URL}/Auth/changerole/${accountId}?newRole=${encodeURIComponent(
        role
      )}`
    );
    return res.data;
  },

  // DELETE /api/Auth/{id} — không gửi body
  deleteUser: async (id) => {
    const res = await axios.delete(`${BASE_URL}/Auth/${id}`);
    return res.data;
  },

  // ===== VEHICLES =====
  fetchAllVehicles: async () => {
    const res = await axios.get(`${BASE_URL}/Vehicles?page=1&pageSize=50`);
    return res.data.items || [];
  },

  updateVehicle: async (id, data) => {
    const res = await axios.put(`${BASE_URL}/Vehicles/${id}`, clean(data), {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },

  deleteVehicle: async (id) => {
    const res = await axios.delete(`${BASE_URL}/Vehicles/${id}`);
    return res.data;
  },

  // ===== SUBSCRIPTION PLANS =====
  fetchAllServicePackages: async () => {
    try {
      const res = await axios.get(`${BASE_URL}/SubscriptionPlans`);
      if (Array.isArray(res.data)) return res.data;
      if (res.data?.items) return res.data.items;
      return [];
    } catch (error) {
      console.error("❌ Lỗi khi tải danh sách gói dịch vụ:", error);
      return [];
    }
  },

  createServicePackage: async (data) => {
    const res = await axios.post(`${BASE_URL}/SubscriptionPlans`, clean(data), {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },

  updateServicePackage: async (id, data) => {
    const res = await axios.put(
      `${BASE_URL}/SubscriptionPlans/${id}`,
      clean(data),
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  },

  deleteServicePackage: async (id) => {
    const res = await axios.delete(`${BASE_URL}/SubscriptionPlans/${id}`);
    return res.data;
  },

  // ===== SUBSCRIPTIONS =====
  fetchAllSubscriptions: async () => {
    const res = await axios.get(`${BASE_URL}/Subscriptions`);
    return Array.isArray(res.data) ? res.data : res.data?.items || [];
  },

  fetchSubscriptionsByPlan: async (subscriptionPlanId) => {
    const all = await userApi.fetchAllSubscriptions();
    return all.filter(
      (s) => String(s.subscriptionPlanId) === String(subscriptionPlanId)
    );
  },

  createSubscription: async (payload) => {
    const res = await axios.post(`${BASE_URL}/Subscriptions`, clean(payload), {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },

  updateSubscription: async (id, payload) => {
    const res = await axios.put(
      `${BASE_URL}/Subscriptions/${id}`,
      clean(payload),
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  },

  changeSubscriptionStatus: async (id, status) => {
    const res = await axios.put(
      `${BASE_URL}/Subscriptions/${id}/status`,
      { status },
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  },

  deleteSubscription: async (id) => {
    const res = await axios.delete(`${BASE_URL}/Subscriptions/${id}`);
    return res.data;
  },

  // ===== Customers / Companies (nếu cần) =====
  fetchAllCustomers: async () => {
    const res = await axios.get(`${BASE_URL}/Customers`);
    return Array.isArray(res.data) ? res.data : res.data?.items || [];
  },

  fetchAllCompanies: async () => {
    const res = await axios.get(`${BASE_URL}/Companies`);
    return Array.isArray(res.data) ? res.data : res.data?.items || [];
  },

  // ===== Invoices =====
  fetchInvoicesByCompany: async (companyId) => {
    const res = await axios.get(`${BASE_URL}/Invoices/by-company/${companyId}`);
    return Array.isArray(res.data) ? res.data : res.data?.items || [];
  },

  fetchInvoicesByCustomer: async (customerId) => {
    const res = await axios.get(
      `${BASE_URL}/Invoices/by-customer/${customerId}`
    );
    return Array.isArray(res.data) ? res.data : res.data?.items || [];
  },

  // ===== GET USER BY ID (debug/helper) =====
  getUserById: async (id) => {
    const res = await axios.get(`${BASE_URL}/Auth/${id}`);
    return res.data;
  },
};
