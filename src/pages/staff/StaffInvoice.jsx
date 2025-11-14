import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
import "./StaffInvoice.css";

const API_BASE = getApiBase();

export default function StaffInvoice() {
  const navigate = useNavigate();
  const { state, search } = useLocation();
  const params = new URLSearchParams(search);
  const order = params.get("order");

  const [authUsers, setAuthUsers] = useState([]);
  const [ownerName, setOwnerName] = useState("Đang tải...");
const [ownerId, setOwnerId] = useState("—");
  const [invoiceId, setInvoiceId] = useState(null);

  const data =
    state || JSON.parse(sessionStorage.getItem(`chargepay:${order}`) || "{}");

  const fmt = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    const ss = d.getSeconds().toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    const mon = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${hh}:${mm}:${ss} ${day}/${mon}/${year}`;
  };

  const formatCurrency = (n) =>
    (Number(n) || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });

  // ✅ Lấy danh sách user để tìm tên khách hàng
  useEffect(() => {
  async function loadOwner() {
    try {
      const res = await fetchAuthJSON(`${API_BASE}/Auth`);
      const users = res?.data ?? res ?? [];
      setAuthUsers(users);

      const custId = data?.customerId;
      const compId = data?.companyId;

      setOwnerId(custId || compId || "—");

      // ⭐ Nếu là xe công ty
      if (compId) {
        const foundCompany = users.find(
          (u) => u.role === "Company" && String(u.accountId) === String(compId)
        );
        if (foundCompany?.company?.companyName) {
          setOwnerName(foundCompany.company.companyName);
          return;
        }
      }

      // ⭐ Nếu là khách hàng cá nhân
      if (custId) {
        const foundCustomer = users
          .flatMap((u) => u.customers || [])
          .find((c) => String(c.customerId) === String(custId));

        if (foundCustomer?.fullName) {
          setOwnerName(foundCustomer.fullName);
          return;
        }
      }

      // ⭐ Nếu không thuộc 2 loại trên → khách vãng lai
      setOwnerName("Khách vãng lai");

    } catch (err) {
      console.error("❌ Lỗi khi tải thông tin chủ xe:", err);
      setOwnerName("Không có");
    }
  }

  loadOwner();
}, [data?.customerId, data?.companyId]);


  // ✅ Lấy mã hóa đơn nếu chưa có
  useEffect(() => {
    async function fetchInvoiceId() {
      try {
        if (data?.invoiceId) {
          setInvoiceId(data.invoiceId);
          return;
        }

        const res = await fetchAuthJSON(`${API_BASE}/Invoices`);
        const invoices = res?.data ?? res?.$values ?? res ?? [];
        if (!Array.isArray(invoices)) return;

        const found = invoices.find(
          (inv) =>
            inv.chargingSessions?.some(
              (s) => s.chargingSessionId === data.chargingSessionId
            ) ||
            inv.$values?.chargingSessions?.some(
              (s) => s.chargingSessionId === data.chargingSessionId
            )
        );

        if (found?.invoiceId) setInvoiceId(found.invoiceId);
      } catch (err) {
        console.error("❌ Không thể tìm thấy mã hóa đơn:", err);
      }
    }

    if (data?.chargingSessionId) fetchInvoiceId();
  }, [data?.chargingSessionId, data?.invoiceId]);

  // ✅ In hóa đơn
  function handlePrint() {
    window.print();
  }

  // ✅ Kiểm tra dữ liệu
  if (!order || !data?.chargingSessionId) {
    return (
      <div className="ivd-root">
        <div className="warn">
          <h3>Không tìm thấy thông tin hóa đơn</h3>
          <button className="btn primary" onClick={() => navigate("/staff/sessions")}>
            ← Quay lại Phiên sạc
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ivd-root">
      {/* Breadcrumb */}
      <div className="crumbs no-print">
        <span className="crumb" onClick={() => navigate("/staff/sessions")}>
          Phiên sạc
        </span>
        <span className="sep">›</span>
        <span className="crumb current">Hóa đơn</span>
      </div>

      {/* Header */}
      <div className="ivp-topbar">
        <h2>
          Hóa đơn Phiên sạc #{data.chargingSessionId}
          {invoiceId && (
            <span className="ivp-subtitle">
              &nbsp;• Mã hóa đơn: INV-{invoiceId}
            </span>
          )}
        </h2>
        <div className="actions no-print">
          <button className="btn" onClick={() => navigate(-1)}>
            ← Quay lại
          </button>
          <button className="btn primary" onClick={handlePrint}>
            🖨️ In hóa đơn
          </button>
        </div>
      </div>

      {/* Thông tin khách hàng */}
      <div className="ivp-card">
        <div className="ivp-head">
          <div>
            <h3>Thông tin khách hàng</h3>
            <div className="ivp-meta">
              <div><strong>ID chủ sở hữu:</strong> {ownerId}</div>
<div><strong>Tên chủ xe:</strong> {ownerName}</div>
            </div>
          </div>
          <div className={`pill ${data.invoiceStatus === "PAID" ? "ok" : "warn"}`}>
            {data.invoiceStatus || "UNPAID"}
          </div>
        </div>
      </div>

      {/* Chi tiết phiên sạc */}
      <div className="ivp-card">
        <h3>Chi tiết phiên sạc</h3>
        <div className="ivp-meta">
          <div><strong>Mã phiên:</strong> S-{data.chargingSessionId}</div>
          <div><strong>Trụ sạc:</strong> {data.portId || data.gun?.id || "—"}</div>
          <div><strong>Biển số xe:</strong> {data.vehicle?.licensePlate || data.licensePlate || "—"}</div>
          <div><strong>Bắt đầu:</strong> {fmt(data.startedAt)}</div>
          <div><strong>Kết thúc:</strong> {fmt(data.endedAt)}</div>
          <div><strong>Năng lượng tiêu thụ:</strong> {(data.energyKwh || 0).toFixed(2)} kWh</div>
        </div>
      </div>

      {/* Chi phí */}
      <div className="ivp-card">
        <h3>Chi phí</h3>
        <table className="ivp-table">
          <thead>
            <tr>
              <th>Mô tả</th>
              <th className="right">Số tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Tiền điện năng tiêu thụ</td>
              <td className="right">{formatCurrency(data.total || 0)}</td>
            </tr>
            <tr>
              <td>VAT (10%)</td>
              <td className="right">{formatCurrency((data.total || 0) * 0.1)}</td>
            </tr>
            <tr>
              <td><strong>Tổng cộng</strong></td>
              <td className="right">
                <strong>{formatCurrency((data.total || 0) * 1.1)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Ghi chú */}
      <div className="ivp-card">
        <h3>Ghi chú</h3>
        <p>
          Đây là hóa đơn được tạo bởi nhân viên khi dừng phiên sạc.
          Vui lòng hướng dẫn khách hàng thực hiện thanh toán hoặc xác nhận qua quầy giao dịch.
        </p>
      </div>
    </div>
  );
}
