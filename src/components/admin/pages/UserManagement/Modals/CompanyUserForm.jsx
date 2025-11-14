import React, { useState } from "react";

const CompanyUserForm = ({ userData, onSave, onCancel }) => {
  const comp = userData?.company || {};

  const [form, setForm] = useState({
    companyId: comp.companyId ?? comp.CompanyId ?? 0,
    companyName: comp.name ?? comp.companyName ?? "",
    email: comp.email ?? userData.email ?? "",
    taxCode: comp.taxCode ?? "",
    address: comp.address ?? "Đang cập nhật",

    // hiển thị như bảng (read-only)
    companyPlan: userData.servicePackageName ?? "Chưa đăng ký",
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
      <h3>Chỉnh sửa Doanh nghiệp (ID: {userData.accountId})</h3>

      <label>Tên công ty:</label>
      <input name="companyName" value={form.companyName} onChange={onChange} />

      <label>Email:</label>
      <input name="email" value={form.email} onChange={onChange} />

      <label>Mã số thuế:</label>
      <input name="taxCode" value={form.taxCode} onChange={onChange} />

      <label>Địa chỉ:</label>
      <input name="address" value={form.address} onChange={onChange} />

      <label>Gói dịch vụ:</label>
      <input value={form.companyPlan} disabled />

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

export default CompanyUserForm;
