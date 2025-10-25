// src/api/reportsApi.js
// ĐÃ SỬA LỖI: Đảm bảo tất cả các promise đều được resolve và sử dụng.

import axios from "axios";

// Giả định: BASE_URL chung cho tất cả API
const BASE_URL = import.meta.env.DEV ? "/api" : "https://localhost:7268/api";

/**
 * Hàm tổng hợp việc lấy tất cả DỮ LIỆU THÔ cần thiết cho trang báo cáo.
 * @param {object} params - Tham số lọc (ví dụ: startDate, endDate, stationId)
 * @returns {Promise<object>} Dữ liệu thô đã được gom nhóm từ các API
 */
export const fetchReportData = async (params = {}) => {
  const { startDate = "", endDate = "", stationId = "" } = params;

  // 1. Dữ liệu Phiên sạc (ChargingSessions)
  const sessionsPromise = axios.get(
    `${BASE_URL}/ChargingSessions?startDate=${startDate}&endDate=${endDate}&stationId=${stationId}`
  );

  // 2. Dữ liệu Hóa đơn (Invoices)
  const invoicesPromise = axios.get(`${BASE_URL}/Invoices`);

  // 3. Dữ liệu Trạm (Stations)
  const stationsPromise = axios.get(
    `${BASE_URL}/Stations/paged?page=1&pageSize=100`
  );

  // 4. Dữ liệu Gói dịch vụ (SubscriptionPlans)
  const subscriptionPlansPromise = axios.get(`${BASE_URL}/SubscriptionPlans`);

  // Chạy song song tất cả các lời gọi API và gán kết quả trả về (Response)
  const [
    sessionsResponse,
    invoicesResponse, // <--- KHÔNG DÙNG LẠI TÊN 'invoicesPromise' Ở ĐÂY
    stationsResponse,
    subscriptionPlansResponse,
  ] = await Promise.all([
    sessionsPromise,
    invoicesPromise, // <--- BIẾN PROMISE ĐƯỢC CHUYỂN VÀO Promise.all()
    stationsPromise,
    subscriptionPlansPromise,
  ]);

  // Trả về dữ liệu THÔ đã gom nhóm.
  return {
    sessionsData: sessionsResponse.data,
    invoicesData: invoicesResponse.data,
    stationsData: stationsResponse.data,
    subscriptionPlansData: subscriptionPlansResponse.data,
  };
};
