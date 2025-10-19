// src/api/profileApi.js

export async function getEnterpriseInfo() {
  // ✅ Trả về dữ liệu mẫu để hiển thị form
  return Promise.resolve({
    name: "Công ty TNHH ABC",
    email: "contact@abc.com",
    address: "123 Nguyễn Văn Cừ, Quận 5, TP.HCM",
  });
}

export async function updateEnterpriseInfo(data) {
  console.log("Đã gửi dữ liệu cập nhật:", data);
  // ✅ Giả lập thành công
  return Promise.resolve({ success: true });
}
