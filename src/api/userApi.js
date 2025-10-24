// // ✅ 1. Định nghĩa BASE_URL theo yêu cầu của bạn
// const BASE_URL = "https://localhost:7268/api";

// // ✅ 2. Hàm tiện ích để xử lý response từ server
// const handleResponse = async (res, resourceName) => {
//   if (!res.ok) {
//     // Cố gắng đọc thông báo lỗi từ body (JSON hoặc Text)
//     const errorDetail = await res.text().catch(() => "No detail provided");
//     console.error(
//       `❌ Lỗi khi fetch ${resourceName}: ${res.status} - ${errorDetail}`
//     );

//     let errorMessage = `Không thể xử lý ${resourceName}.`;
//     try {
//       const errorJson = JSON.parse(errorDetail);
//       errorMessage = errorJson.message || errorJson.error || errorMessage;
//     } catch {
//       errorMessage = errorDetail || errorMessage;
//     }

//     throw new Error(errorMessage);
//   }
//   // API có thể trả về 204 No Content cho các lệnh DELETE/PUT
//   if (res.status === 204 || res.headers.get("content-length") === "0") {
//     return { success: true };
//   }
//   return res.json();
// };

// // =========================================================================
// // ✅ 3. Đối tượng API cho các thao tác User, Vehicle, Subscription (Auth)
// // =========================================================================

// export const userApi = {
//   // 1️⃣ -------- USERS / ACCOUNTS (Auth) --------

//   /**
//    * Lấy tất cả dữ liệu Account (Bỏ logic JOIN giả lập để tuân thủ "không gắn cứng dữ liệu")
//    * Endpoint: GET /api/Auth (Giả định trả về danh sách Accounts)
//    */
//   async fetchAllUsers() {
//     const res = await fetch(`${BASE_URL}/Auth`, {
//       headers: {
//         "Content-Type":
//           "application/json" /*, 'Authorization': 'Bearer YOUR_TOKEN' */,
//       },
//     });
//     const accounts = await handleResponse(res, "Accounts");

//     // CHÚ Ý: Vì đã bỏ logic JOIN/Mock data, cần phải điều chỉnh frontend
//     // để xử lý dữ liệu Account thô nếu cần phân loại Staff/Customer/Company.
//     // Tạm trả về list Account thô.
//     return accounts;
//   },

//   /**
//    * Cập nhật trạng thái người dùng (Giả định PUT cho việc thay đổi Status/Role)
//    * Endpoint: PUT /api/Auth/changestatus/{accountId}
//    */
//   async updateUserStatus(accountId, data) {
//     const res = await fetch(`${BASE_URL}/Auth/changestatus/${accountId}`, {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(data), // data có thể chứa { status: 'Active'/'Inactive' }
//     });
//     return handleResponse(res, `Update User Status ${accountId}`);
//   },

//   /**
//    * Xóa người dùng
//    * Endpoint: DELETE /api/Auth/{id}
//    */
//   async deleteUser(accountId) {
//     const res = await fetch(`${BASE_URL}/Auth/${accountId}`, {
//       method: "DELETE",
//     });
//     return handleResponse(res, `Delete User ${accountId}`);
//   },

//   // 2️⃣ -------- VEHICLES (Xe) --------

//   /**
//    * Lấy tất cả thông số xe
//    * Endpoint: GET /api/Vehicles
//    */
//   async fetchAllVehicles() {
//     const res = await fetch(`${BASE_URL}/Vehicles`, {
//       headers: { "Content-Type": "application/json" },
//     });
//     return handleResponse(res, "Vehicles");
//   },

//   /**
//    * Cập nhật thông số xe
//    * Endpoint: PUT /api/Vehicles/{id}
//    */
//   async updateVehicle(vehicleId, data) {
//     const res = await fetch(`${BASE_URL}/Vehicles/${vehicleId}`, {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(data),
//     });
//     return handleResponse(res, `Update Vehicle ${vehicleId}`);
//   },

//   /**
//    * Xóa thông số xe
//    * Endpoint: DELETE /api/Vehicles/{id}
//    */
//   async deleteVehicle(vehicleId) {
//     const res = await fetch(`${BASE_URL}/Vehicles/${vehicleId}`, {
//       method: "DELETE",
//     });
//     return handleResponse(res, `Delete Vehicle ${vehicleId}`);
//   },

//   // 3️⃣ -------- SUBSCRIPTION PLANS (Gói dịch vụ) --------

//   /**
//    * Lấy tất cả gói dịch vụ (SubscriptionPlan)
//    * Endpoint: GET /api/SubscriptionPlans
//    */
//   async fetchAllServicePackages() {
//     const res = await fetch(`${BASE_URL}/SubscriptionPlans`, {
//       headers: { "Content-Type": "application/json" },
//     });
//     return handleResponse(res, "Subscription Plans");
//   },

//   /**
//    * Cập nhật gói dịch vụ
//    * Endpoint: PUT /api/SubscriptionPlans/{id}
//    */
//   async updateServicePackage(planId, data) {
//     const res = await fetch(`${BASE_URL}/SubscriptionPlans/${planId}`, {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(data),
//     });
//     return handleResponse(res, `Update Service Package ${planId}`);
//   },

//   /**
//    * Xóa gói dịch vụ
//    * Endpoint: DELETE /api/SubscriptionPlans/{id}
//    */
//   async deleteServicePackage(planId) {
//     const res = await fetch(`${BASE_URL}/SubscriptionPlans/${planId}`, {
//       method: "DELETE",
//     });
//     return handleResponse(res, `Delete Service Package ${planId}`);
//   },
// };

// Demo thử
// src/api/userApi.js
import axios from "axios";

// 🔹 Cấu hình base URL (chạy qua proxy Vite hoặc dùng localhost trực tiếp)
const BASE_URL = import.meta.env.DEV
  ? "/api" // sẽ proxy sang backend qua vite.config.js
  : "https://localhost:7268/api";

// 🔹 API cho User Management
export const userApi = {
  // === USERS ===
  fetchAllUsers: async () => {
    const res = await axios.get(`${BASE_URL}/Auth`);
    return res.data;
  },

  updateUserStatus: async (id, data) => {
    const res = await axios.put(`${BASE_URL}/Auth/${id}`, data);
    return res.data;
  },

  deleteUser: async (id) => {
    const res = await axios.delete(`${BASE_URL}/Auth/${id}`);
    return res.data;
  },

  // === VEHICLES ===
  fetchAllVehicles: async () => {
    const res = await axios.get(`${BASE_URL}/Vehicles?page=1&pageSize=50`);
    // ⚠️ BE trả về object { page, pageSize, totalItems, totalPages, items: [...] }
    // => Ta chỉ cần lấy phần "items"
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
    const res = await axios.get(`${BASE_URL}/SubscriptionPlans`);
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
};
