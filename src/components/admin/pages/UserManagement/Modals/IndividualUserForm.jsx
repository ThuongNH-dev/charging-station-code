// src/components/UserManagement/Forms/IndividualUserForm.jsx
import React, { useState } from "react";

const IndividualUserForm = ({ userData, onSave, onCancel }) => {
  const customer = userData.customers?.[0] || {};

  const [form, setForm] = useState({
    // Tên và SĐT (đang hoạt động tốt)
    fullName: customer.fullName || "",
    phone: customer.phone || "",

    // ✅ Cập nhật: Ưu tiên lấy email từ cấp độ root của tài khoản
    email: userData.email || customer.email || "",

    // ✅ BỔ SUNG: Address (đang hoạt động tốt, hiện "-")
    address: customer.address || "-",

    // PlanName và Status (Status đang hoạt động tốt)
    planName: userData.planName || "",
    status: userData.status || "Inactive",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = () => {
    onSave(form);
  };

  return (
    <div className="modal-form">
      <h3>Chỉnh sửa Người dùng cá nhân (ID: {userData.accountId})</h3>

      {/* Các trường đã có và hoạt động... */}
      <label>Tên:</label>
      <input name="fullName" value={form.fullName} onChange={handleChange} />
      <label>SĐT:</label>
      <input name="phone" value={form.phone} onChange={handleChange} />
      <label>Email:</label>
      <input name="email" value={form.email} onChange={handleChange} />

      {/* Địa chỉ (đã được thêm và đang hiện giá trị mặc định) */}
      <label>Địa chỉ:</label>
      <input name="address" value={form.address} onChange={handleChange} />

      {/* Gói dịch vụ */}
      <label>Gói dịch vụ:</label>
      <input name="planName" value={form.planName} onChange={handleChange} />

      <label>Trạng thái:</label>
      <select name="status" value={form.status} onChange={handleChange}>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>

      <div className="modal-actions">
        <button className="btn primary" onClick={handleSubmit}>
          Lưu
        </button>
        <button className="btn secondary" onClick={onCancel}>
          Hủy
        </button>
      </div>
    </div>
  );
};

export default IndividualUserForm;
