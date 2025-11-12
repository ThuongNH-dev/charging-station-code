// src/utils/invoice-normalize.js
export function normalizeInvoice(raw) {
  if (!raw || typeof raw !== "object") return {};

  const get = (...keys) => {
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== null) return raw[k];
    }
    return undefined;
  };

  return {
    invoiceId: get("invoiceId", "InvoiceId", "id", "Id"),
    customerId: get("customerId", "CustomerId"),
    companyId: get("companyId", "CompanyId"),
    billingMonth: Number(get("billingMonth", "BillingMonth") ?? 0),
    billingYear: Number(get("billingYear", "BillingYear") ?? 0),
    status: String(get("status", "Status") ?? "Unpaid"),
    subtotal: Number(get("subtotal", "Subtotal") ?? 0),
    tax: Number(get("tax", "Tax") ?? 0),
    total: Number(get("total", "Total") ?? 0),
    dueDate: get("dueDate", "DueDate") || null,
    createdAt: get("createdAt", "CreatedAt") || null,
    updatedAt: get("updatedAt", "UpdatedAt") || null,
  };
}

// hỗ trợ mọi kiểu list (.NET Preserve, PagedResult, mảng thuần)
export function unwrapList(d) {
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.$values)) return d.$values;
  if (d && Array.isArray(d.items)) return d.items;
  if (d && d.data && Array.isArray(d.data)) return d.data; // phòng thêm
  return [];
}
