// src/api/invoiceApi.js
const API_BASE = import.meta.env.VITE_API_BASE || "/api";
import { normalizeInvoice, unwrapList } from "../utils/invoice-normalize";

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.append(k, v);
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const invoiceApi = {
  // LẤY TẤT CẢ (không phân trang). Nếu backend có phân trang, xem mục 5 bên dưới.
  async getAll(params = {}) {
    const url = `${API_BASE}/Invoices${buildQuery(params)}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Không lấy được danh sách hoá đơn");
    const data = await res.json();
    return unwrapList(data).map(normalizeInvoice);
  },

  async getById(id) {
    const res = await fetch(`${API_BASE}/Invoices/${id}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Không tìm thấy hoá đơn");
    const data = await res.json();
    return normalizeInvoice(data);
  },
};
