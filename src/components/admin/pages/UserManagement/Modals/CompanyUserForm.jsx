// src/components/UserManagement/Forms/CompanyUserForm.jsx
import React, { useState } from "react";

const CompanyUserForm = ({ userData, onSave, onCancel }) => {
  const companyData = userData.company || {};
  const [form, setForm] = useState({
    companyName: companyData.companyName || "",
    email: companyData.companyEmail || "",
    taxCode: companyData.taxCode || "",
    address: companyData.address || "",
    paymentStatus: companyData.paymentStatus || "",
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
      <h3>Chỉnh sửa Doanh nghiệp (ID: {userData.accountId})</h3>
      <label>Tên công ty:</label>
      <input name="companyName" value={form.companyName} onChange={handleChange} />

      <label>Email:</label>
      <input name="email" value={form.email} onChange={handleChange} />

      <label>Mã số thuế:</label>
      <input name="taxCode" value={form.taxCode} onChange={handleChange} />

      <label>Địa chỉ:</label>
      <input name="address" value={form.address} onChange={handleChange} />

      <label>Trạng thái thanh toán:</label>
      <input name="paymentStatus" value={form.paymentStatus} onChange={handleChange} />

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

export default CompanyUserForm;
