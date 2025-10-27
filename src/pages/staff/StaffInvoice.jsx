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
  const [customerName, setCustomerName] = useState("Đang tải...");
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

  // ✅ Lấy danh sách account từ /api/Auth để tìm tên khách hàng
  useEffect(() => {
    async function loadCustomerName() {
      try {
        const res = await fetchAuthJSON(`${API_BASE}/Auth`);
        const users = res?.data ?? res ?? [];
        setAuthUsers(users);

        const allCustomers = users.flatMap((u) => u.customers || []);
        const found = allCustomers.find(
          (c) => c.customerId === data.customerId
        );

        if (found?.fullName) setCustomerName(found.fullName);
        else setCustomerName("Không có");
      } catch (err) {
        console.error("❌ Lỗi khi tải danh sách user:", err);
        setCustomerName("Không có");
      }
    }

    if (data?.customerId) loadCustomerName();
  }, [data?.customerId]);

  // ✅ Nếu không có order hoặc dữ liệu bị mất
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
      <div className="crumbs">
        <span className="crumb" onClick={() => navigate("/staff/sessions")}>
          Phiên sạc
        </span>
        <span className="sep">›</span>
        <span className="crumb current">Hóa đơn</span>
      </div>

      {/* Header */}
      <div className="ivp-topbar">
        <h2>Hóa đơn Phiên sạc #{data.chargingSessionId}</h2>
        <div className="actions">
          <button className="btn" onClick={() => navigate("/staff/sessions")}>
            ← Quay lại
          </button>
        </div>
      </div>

      {/* Thông tin khách hàng */}
      <div className="ivp-card">
        <div className="ivp-head">
          <div>
            <h3>Thông tin khách hàng</h3>
            <div className="ivp-meta">
              <div><strong>ID:</strong> {data.customerId || "—"}</div>
              <div><strong>Tên:</strong> {customerName}</div>
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
