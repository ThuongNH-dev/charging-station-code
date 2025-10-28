// src/utils/invoiceSort.js
export function tsFromInvoice(inv = {}) {
  const u = inv.updatedAt ? new Date(inv.updatedAt).getTime() : 0;
  const c = inv.createdAt ? new Date(inv.createdAt).getTime() : 0;
  const by = Number(inv.billingYear) || 0;
  const bm = Number(inv.billingMonth) || 0;
  const ym = by * 100 + bm; // ví dụ 202510
  const id = Number(inv.invoiceId ?? inv.id ?? 0);
  // Trộn thành một con số để so sánh ổn định
  return (u || c || 0) * 1_000_000 + ym * 1_000 + id;
}

export function sortInvoicesDesc(arr) {
  return (Array.isArray(arr) ? arr.slice() : []).sort((a, b) => tsFromInvoice(b) - tsFromInvoice(a));
}
