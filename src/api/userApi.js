// src/api/userApi.js
import axios from "axios";

const BASE_URL = import.meta.env.DEV ? "/api" : "https://localhost:7268/api";

export const userApi = {
  // === USERS ===
  fetchAllUsers: async () => {
    const res = await axios.get(`${BASE_URL}/Auth`);
    return res.data;
  },
  // ✅ HÀM UPDATE ĐÃ ĐƯỢC CHỈNH SỬA ĐỂ NHẬN THÊM 'role'
  updateUser: async (id, data, role) => {
    let endpoint = `${BASE_URL}/Auth/update-customer`; // Mặc định là customer

    if (role === "Company") {
      // Nếu là công ty, dùng endpoint /update-company
      endpoint = `${BASE_URL}/Auth/update-company`;
    }

    // Cả hai endpoint cập nhật đều là PUT (theo hình ảnh)
    const res = await axios.put(endpoint, data);
    return res.data;
  },

  updateUserStatus: async (id, data) => {
    const res = await axios.put(`${BASE_URL}/Auth/changestatus/${id}`, data);
    return res.data;
  },

  deleteUser: async (id) => {
    const res = await axios.delete(`${BASE_URL}/Auth/${id}`);
    return res.data;
  },

  // === VEHICLES ===
  fetchAllVehicles: async () => {
    const res = await axios.get(`${BASE_URL}/Vehicles?page=1&pageSize=50`);
    return res.data.items || [];
  },

  updateVehicle: async (id, data) => {
    const res = await axios.put(`${BASE_URL}/Vehicles/${id}`, data);
    return res.data;
  },

  deleteVehicle: async (id) => {
    const res = await axios.delete(`${BASE_URL}/Vehicles/${id}`);
    return res.data;
  },

  // === SERVICE PACKAGES ===
  fetchAllServicePackages: async () => {
    try {
      const res = await axios.get(`${BASE_URL}/SubscriptionPlans`);
      // Đảm bảo luôn trả về mảng
      if (Array.isArray(res.data)) return res.data;
      if (res.data.items) return res.data.items;
      return [];
    } catch (error) {
      console.error("❌ Lỗi khi tải danh sách gói dịch vụ:", error);
      return [];
    }
  },

  createServicePackage: async (data) => {
    // HÀM MỚI: Thêm mới gói dịch vụ
    const res = await axios.post(`${BASE_URL}/SubscriptionPlans`, data);
    return res.data;
  },

  updateServicePackage: async (id, data) => {
    const res = await axios.put(`${BASE_URL}/SubscriptionPlans/${id}`, data);
    return res.data;
  },

  deleteServicePackage: async (id) => {
    const res = await axios.delete(`${BASE_URL}/SubscriptionPlans/${id}`);
    return res.data;
  },

  // === SUBSCRIPTIONS ===
  fetchAllSubscriptions: async () => {
    const res = await axios.get(`${BASE_URL}/Subscriptions`);
    return res.data;
  },
  // === GET USER BY ID ===
  getUserById: async (id) => {
    try {
      const res = await axios.get(`${BASE_URL}/Auth/${id}`);
      console.log("API getUserById trả về:", res.data); // ✅ Log để kiểm tra dữ liệu trả về
      return res.data;
    } catch (error) {
      console.error("❌ Lỗi khi gọi API getUserById:", error);
      throw error;
    }
  },
};
