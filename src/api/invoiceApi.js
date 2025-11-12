export const invoiceApi = {
  async getAll() {
    const res = await fetch("/api/Invoices", { credentials: "include" });
    if (!res.ok) throw new Error("Không lấy được danh sách hoá đơn");
    return res.json();
  },
  async getById(id) {
    const res = await fetch(`/api/Invoices/${id}`, { credentials: "include" });
    if (!res.ok) throw new Error("Không tìm thấy hoá đơn");
    return res.json();
  },
};
