import React, { useEffect, useMemo, useState } from "react";
import { Button, message } from "antd";
import { notificationApi } from "../../../api/notificationApi";
import { invoiceApi } from "../../../api/invoiceApi";

const PAGE_SIZE = 10;

export default function AdminInvoicesPage() {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("All");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [daysBefore, setDaysBefore] = useState(3);
  const [dueOnly, setDueOnly] = useState(false); // chỉ hiện sắp đến hạn

  // helper
  const isOverdue = (inv) => {
    if (!inv?.dueDate) return false;
    return new Date(inv.dueDate) < new Date() && inv.status !== "Paid";
  };

  const isDueSoon = (inv, days = 3) => {
    if (!inv?.dueDate) return false;
    if (inv.status === "Paid") return false;
    const now = new Date();
    const soon = new Date(now.getTime() + days * 24 * 3600 * 1000);
    const due = new Date(inv.dueDate);
    return due <= soon; // gồm cả quá hạn
  };

  // Lấy danh sách hoá đơn
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await invoiceApi.getAll();
      setInvoices(Array.isArray(data) ? data : []);
    } catch {
      message.error("Không tải được danh sách hoá đơn");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Bộ lọc
  const filtered = useMemo(() => {
    return invoices.filter((i) => {
      const okStatus = status === "All" || i.status === status;
      const okMonth = !month || i.billingMonth === Number(month);
      const okYear = !year || i.billingYear === Number(year);
      const okDue = !dueOnly || isDueSoon(i, daysBefore);
      return okStatus && okMonth && okYear && okDue;
    });
  }, [invoices, status, month, year, dueOnly, daysBefore]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ======= GỬI THÔNG BÁO =======
  const viMoney = (v) => (v ?? 0).toLocaleString("vi-VN");

  const buildTemplate = (inv) => {
    const due = inv?.dueDate ? new Date(inv.dueDate) : null;
    const overdue = isOverdue(inv);
    const dueStr = due ? due.toLocaleString("vi-VN") : "(chưa có hạn)";
    const title = overdue
      ? "Hóa đơn đã quá hạn thanh toán"
      : "Sắp đến hạn thanh toán hóa đơn";
    const messageText =
      `Hóa đơn #${inv.invoiceId} kỳ ${String(inv.billingMonth).padStart(2, "0")}/${inv.billingYear} ` +
      `tổng ${viMoney(inv.total)}đ. Hạn: ${dueStr}. Vui lòng thanh toán.`;
    const priority = overdue ? "High" : "Normal";
    return { title, message: messageText, priority };
  };

  const remindOne = async (inv) => {
    const { title, message: msg, priority } = buildTemplate(inv);
    const payload = {
      title,
      message: msg,
      type: "Invoice",
      priority,
      senderAdminId: 1,
      invoiceId: inv.invoiceId,
    };
    try {
      if (inv.customerId) {
        await notificationApi.sendToCustomer({
          ...payload,
          customerId: inv.customerId,
        });
      } else if (inv.companyId) {
        await notificationApi.sendToCompany({
          ...payload,
          companyId: inv.companyId,
        });
      }
      message.success(`Đã gửi nhắc cho hóa đơn #${inv.invoiceId}`);
    } catch (e) {
      message.error(e?.message || "Lỗi gửi thông báo");
    }
  };

  const remindBulk = async () => {
    // gửi theo bộ lọc hiện tại (đã gồm dueOnly + daysBefore)
    const targets = filtered.filter((i) => i.status !== "Paid");
    if (!targets.length) return message.info("Không có hóa đơn phù hợp");
    if (!window.confirm(`Gửi nhắc cho ${targets.length} hóa đơn?`)) return;

    setSending(true);
    try {
      // giới hạn song song = 5
      const chunk = async (arr, size) => {
        for (let i = 0; i < arr.length; i += size) {
          const part = arr.slice(i, i + size);
          await Promise.all(part.map((inv) => remindOne(inv).catch(() => null)));
        }
      };
      await chunk(targets, 5);
      message.success(`Đã gửi ${targets.length} thông báo`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">📜 Quản lý Hóa đơn</h1>

      {/* Bộ lọc */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="border px-2 py-1 rounded"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option>All</option>
          <option>Unpaid</option>
          <option>Paid</option>
        </select>

        <input
          type="number"
          className="border px-2 py-1 rounded w-24"
          placeholder="Tháng"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setPage(1);
          }}
        />
        <input
          type="number"
          className="border px-2 py-1 rounded w-24"
          placeholder="Năm"
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            setPage(1);
          }}
        />
        <Button onClick={fetchInvoices}>🔄 Tải lại</Button>

        {/* Lọc sắp đến hạn + gửi hàng loạt */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={dueOnly}
            onChange={(e) => {
              setDueOnly(e.target.checked);
              setPage(1);
            }}
          />
          <span>Chỉ sắp đến hạn trong</span>
        </label>
        <input
          type="number"
          className="border px-2 py-1 rounded w-20"
          value={daysBefore}
          min={0}
          onChange={(e) => setDaysBefore(Number(e.target.value))}
          disabled={!dueOnly}
          title="Số ngày tới hạn"
        />
        <Button type="primary" onClick={remindBulk} disabled={sending}>
          {sending ? "Đang gửi..." : "📣 Nhắc hàng loạt"}
        </Button>
      </div>

      {/* Bảng hóa đơn */}
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-10 bg-gray-100 font-semibold px-3 py-2 sticky top-0">
          <div className="col-span-1">ID</div>
          <div className="col-span-2">Người dùng</div>
          <div className="col-span-1">Tháng/Năm</div>
          <div className="col-span-1">Tổng (đ)</div>
          <div className="col-span-1">Trạng thái</div>
          <div className="col-span-2">Hạn thanh toán</div>
          <div className="col-span-2 text-right">Hành động</div>
        </div>

        {loading ? (
          <div className="p-4 text-center">Đang tải...</div>
        ) : pageData.length === 0 ? (
          <div className="p-4 text-center">Không có hóa đơn</div>
        ) : (
          pageData.map((i) => {
            const overdue = isOverdue(i);
            const soon = isDueSoon(i, daysBefore);
            const rowCls = overdue ? "bg-red-50" : soon ? "bg-yellow-50" : "";
            const dueStr = i.dueDate
              ? new Date(i.dueDate).toLocaleString("vi-VN")
              : "-";

            return (
              <div
                key={i.invoiceId}
                className={`grid grid-cols-10 px-3 py-2 border-t ${rowCls}`}
              >
                <div className="col-span-1">#{i.invoiceId}</div>
                <div className="col-span-2">
                  {i.customerId ? `KH ${i.customerId}` : `Cty ${i.companyId}`}
                </div>
                <div className="col-span-1">
                  {i.billingMonth}/{i.billingYear}
                </div>
                <div className="col-span-1">{viMoney(i.total)}</div>
                <div className="col-span-1">{i.status}</div>
                <div className="col-span-2">{dueStr}</div>
                <div className="col-span-2 flex justify-end">
                  <Button
                    size="small"
                    onClick={() => remindOne(i)}
                    disabled={sending}
                  >
                    Nhắc thanh toán
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Phân trang */}
      <div className="flex justify-between items-center mt-3">
        <div>
          Tổng: {filtered.length} • Trang {page}/{totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            size="small"
          >
            ← Trước
          </Button>
          <Button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            size="small"
          >
            Sau →
          </Button>
        </div>
      </div>
    </div>
  );
}
