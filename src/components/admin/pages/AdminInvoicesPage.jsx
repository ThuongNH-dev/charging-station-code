import React, { useEffect, useMemo, useState } from "react";
import { Button, message } from "antd";
import { notificationApi } from "../../../api/notificationApi";
import { invoiceApi } from "../../../api/invoiceApi";
import "./AdminInvoicesPage.css";

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
  const [dueOnly, setDueOnly] = useState(false);

  // ===== Helpers =====
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

  const viMoney = (v) => (v ?? 0).toLocaleString("vi-VN");

  // ===== Fetch =====
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // lấy tất cả, không filter ở server (lọc client)
      const data = await invoiceApi.getAll();
      setInvoices(Array.isArray(data) ? data : []);
      setPage(1); // reset về trang 1 sau khi tải
    } catch (e) {
      console.error(e);
      message.error("Không tải được danh sách hoá đơn");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // ===== Filter / Paging =====
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

  // ===== Tạo nội dung thông báo =====
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

  // ===== Gửi 1 =====
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

  // ===== Gửi lô =====
  const remindBulk = async () => {
    const targets = filtered.filter((i) => i.status !== "Paid");
    if (!targets.length) return message.info("Không có hóa đơn phù hợp");
    if (!window.confirm(`Gửi nhắc cho ${targets.length} hóa đơn?`)) return;

    setSending(true);
    try {
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

  // ===== Render =====
  return (
    <div className="invoice-wrap">
      <h1 className="invoice-title">📜 Quản lý Hóa đơn</h1>

      {/* Toolbar */}
      <div className="invoice-toolbar">
        <select
          className="toolbar-select"
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
          className="toolbar-input"
          style={{ width: 96 }}
          placeholder="Tháng"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setPage(1);
          }}
        />
        <input
          type="number"
          className="toolbar-input"
          style={{ width: 96 }}
          placeholder="Năm"
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            setPage(1);
          }}
        />
        <Button onClick={fetchInvoices}>🔄 Tải lại</Button>

        <label className="toolbar-checkbox">
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
          className="toolbar-input"
          style={{ width: 80 }}
          value={daysBefore}
          min={0}
          onChange={(e) => setDaysBefore(Number(e.target.value))}
          disabled={!dueOnly}
          title="Số ngày tới hạn"
        />

        <span className="toolbar-spacer" />
        <Button type="primary" onClick={remindBulk} disabled={sending}>
          {sending ? "Đang gửi..." : "📣 Nhắc hàng loạt"}
        </Button>
      </div>

      {/* Table */}
      <div className="invoice-table">
        <div className="table-header">
          <div>ID</div>
          <div>Người dùng</div>
          <div>Tháng/Năm</div>
          <div>Tổng (đ)</div>
          <div>Trạng thái</div>
          <div>Hạn thanh toán</div>
          <div className="text-right">Hành động</div>
        </div>

        {loading ? (
          <div className="p-4 text-center">Đang tải...</div>
        ) : pageData.length === 0 ? (
          <div className="p-4 text-center">Không có hóa đơn</div>
        ) : (
          pageData.map((i) => {
            const overdue = isOverdue(i);
            const soon = isDueSoon(i, daysBefore);
            const dueStr = i.dueDate
              ? new Date(i.dueDate).toLocaleString("vi-VN")
              : "-";

            return (
              <div
                key={i.invoiceId}
                className={`table-row ${
                  overdue ? "row-overdue" : soon ? "row-soon" : ""
                }`}
              >
                <div>#{i.invoiceId}</div>
                <div>{i.customerId ? `KH ${i.customerId}` : `Cty ${i.companyId}`}</div>
                <div>
                  {i.billingMonth}/{i.billingYear}
                </div>
                <div>{viMoney(i.total)}</div>
                <div>
                  <span
                    className={`badge ${
                      overdue
                        ? "badge-overdue"
                        : i.status === "Paid"
                        ? "badge-paid"
                        : "badge-unpaid"
                    }`}
                  >
                    {overdue ? "Overdue" : i.status}
                  </span>
                </div>
                <div>{dueStr}</div>
                <div className="row-actions">
                  <Button size="small" onClick={() => remindOne(i)} disabled={sending}>
                    Nhắc thanh toán
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <div className="invoice-pagination">
        <div className="info-dim">
          Tổng: {filtered.length} • Trang {page}/{totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            size="small"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Trước
          </Button>
          <Button
            size="small"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau →
          </Button>
        </div>
      </div>
    </div>
  );
}
