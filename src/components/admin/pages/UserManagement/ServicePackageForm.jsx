// src/components/UserManagement/ServicePackageForm.jsx
import React, { useState, useEffect } from "react";

// 🔹 Form thêm / chỉnh sửa gói dịch vụ
//   - initialData: dữ liệu ban đầu khi chỉnh sửa
//   - crudActions: chứa các hàm updateServicePackage, createServicePackage
//   - setActiveModal: dùng để đóng modal sau khi xử lý
const ServicePackageForm = ({ initialData, crudActions, setActiveModal }) => {
  // Khởi tạo state form từ dữ liệu ban đầu hoặc giá trị mặc định
  const [formData, setFormData] = useState({
    planName: "",
    description: "",
    category: "Individual",
    priceMonthly: 0,
    discountPercent: 0,
    freeIdleMinutes: 0,
    benefits: "",
    isForCompany: false,
    status: "Active",
    ...initialData, // Ghi đè nếu có dữ liệu chỉnh sửa
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Đồng bộ lại khi initialData thay đổi
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Xử lý thay đổi input
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Xử lý submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // 🌟 CHỈNH SỬA TẠI ĐÂY: Ưu tiên lấy subscriptionPlanId theo API mẫu
    const packageId = initialData && (
      initialData.subscriptionPlanId || initialData.id || initialData.packageId
    );
    let success = false;

    try {
      if (packageId) {
        // 🔸 Gọi API update
        await crudActions.updateServicePackage(packageId, formData);
        success = true;
      } else {
        // 🔸 Gọi API create (nếu có)
        if (crudActions.createServicePackage) {
          await crudActions.createServicePackage(formData);
        } else {
          alert(
            "Chức năng thêm mới chưa được triển khai API! Tạm thời mô phỏng thành công."
          );
        }
        success = true;
      }
    } catch (error) {
      console.error("Lỗi xử lý gói dịch vụ:", error);
      alert(`Lỗi: ${error.message || "Không thể xử lý gói dịch vụ."}`);
      success = false;
    }

    if (success) {
      setActiveModal(null); // Đóng modal
      // 👉 Có thể thêm hàm refresh data ở component cha tại đây
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="service-form">
      {/* Tên gói */}
      <div className="form-group">
        <label>Tên gói:</label>
        <input
          type="text"
          name="planName"
          value={formData.planName}
          onChange={handleChange}
          required
        />
      </div>

      {/* Giá hàng tháng */}
      <div className="form-group">
        <label>Giá hàng tháng (VND):</label>
        <input
          type="number"
          name="priceMonthly"
          value={formData.priceMonthly}
          onChange={handleChange}
          required
        />
      </div>

      {/* Loại (Category) */}
      <div className="form-group">
        <label>Loại (Category):</label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
        >
          <option value="Individual">Cá nhân</option>
          <option value="Business">Doanh nghiệp</option>
        </select>
      </div>

      {/* Giảm giá */}
      <div className="form-group">
        <label>Giảm giá (%):</label>
        <input
          type="number"
          name="discountPercent"
          value={formData.discountPercent}
          onChange={handleChange}
          max="100"
        />
      </div>

      {/* Phút chờ miễn phí */}
      <div className="form-group">
        <label>Phút chờ miễn phí:</label>
        <input
          type="number"
          name="freeIdleMinutes"
          value={formData.freeIdleMinutes}
          onChange={handleChange}
        />
      </div>

      {/* Checkbox dành cho doanh nghiệp */}
      <div className="form-group checkbox-group">
        <input
          type="checkbox"
          id="isForCompany"
          name="isForCompany"
          checked={formData.isForCompany}
          onChange={handleChange}
        />
        <label htmlFor="isForCompany">Áp dụng cho Doanh nghiệp</label>
      </div>

      {/* Trạng thái */}
      <div className="form-group">
        <label>Trạng thái gói:</label>
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          required
        >
          <option value="Active">Đang hoạt động</option>
          <option value="Inactive">Ngừng hoạt động</option>
        </select>
      </div>

      {/* Mô tả / Quyền lợi */}
      <div className="form-group">
        <label>Mô tả / Quyền lợi:</label>
        <textarea
          name="benefits"
          value={formData.benefits}
          onChange={handleChange}
          rows="3"
        />
      </div>

      {/* Nút hành động */}
      <div className="modal-actions form-actions">
        <button type="submit" className="btn primary" disabled={isSubmitting}>
          {isSubmitting
            ? "Đang xử lý..."
            : packageId
            ? "Lưu thay đổi"
            : "Thêm mới"}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setActiveModal(null)}
          disabled={isSubmitting}
        >
          Hủy
        </button>
      </div>
    </form>
  );
};

export default ServicePackageForm;