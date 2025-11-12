import React, { useState } from "react";

const IndividualUserForm = ({ userData, onSave, onCancel }) => {
  const cust = userData?.customers?.[0] || {};

  const [form, setForm] = useState({
    customerId: cust.customerId ?? cust.CustomerId ?? 0,
    fullName: cust.fullName ?? userData.userName ?? "",
    phone: cust.phone ?? "",
    email: cust.email ?? userData.email ?? "",

    // hiển thị như bảng (read-only)
    planName: userData.servicePackageName ?? "Chưa đăng ký",
    paymentStatus: userData.paymentStatus ?? "—",
    status: userData.status ?? "Inactive",
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const submit = () => onSave(form);

  return (
    <div className="modal-form">
      <h3>Chỉnh sửa Người dùng cá nhân (ID: {userData.accountId})</h3>

      <label>Tên:</label>
      <input name="fullName" value={form.fullName} onChange={onChange} />

      <label>SĐT:</label>
      <input name="phone" value={form.phone} onChange={onChange} />

      <label>Email:</label>
      <input name="email" value={form.email} onChange={onChange} />

      <label>Gói dịch vụ:</label>
      <input value={form.planName} disabled />

      <label>Trạng thái thanh toán:</label>
      <input value={form.paymentStatus} disabled />

      <label>Trạng thái:</label>
      <select name="status" value={form.status} onChange={onChange}>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>

      <div className="modal-actions">
        <button className="btn primary" onClick={submit}>
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
