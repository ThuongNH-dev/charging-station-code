// API gọi BE cho tính năng gửi thông báo (Admin chỉ gửi, không nhận)
export const notificationApi = {
  async sendToCustomer(payload) {
    const res = await fetch("/api/Notification/admin/send-to-customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Gửi thông báo cho khách hàng thất bại");
    return res.json(); // { notificationId, title, message, ... }
  },

  async sendToCompany(payload) {
    const res = await fetch("/api/Notification/admin/send-to-company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Gửi thông báo cho công ty thất bại");
    return res.json();
  },

  // (tuỳ chọn) nếu BE có broadcast
  async broadcast(payload) {
    const res = await fetch("/api/Notification/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Broadcast thất bại");
    return res.json(); // trả số lượng đã gửi
  },
};
