// 📁 src/components/UserManagement/ServicePackageForm.jsx
import React, { useState, useEffect } from "react";
import "../UserManagement.css";

// 🔹 Form thêm / chỉnh sửa gói dịch vụ
const ServicePackageForm = ({ initialData, crudActions, setActiveModal }) => {
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
    ...initialData,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      planName: initialData?.planName ?? "",
      description: initialData?.description ?? "",
      category: initialData?.category ?? "Individual",
      priceMonthly: Number(initialData?.priceMonthly ?? 0),
      discountPercent: Number(initialData?.discountPercent ?? 0),
      freeIdleMinutes: Number(initialData?.freeIdleMinutes ?? 0),
      benefits: initialData?.benefits ?? "",
      isForCompany: Boolean(initialData?.isForCompany ?? false),
      status: initialData?.status ?? "Active",
    }));
  }, [initialData]);

  // Ép kiểu number cho input type="number"
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : e.target.type === "number"
          ? Number(value)
          : value,
    }));
  };

  const packageId =
    (initialData?.subscriptionPlanId ||
      initialData?.id ||
      initialData?.packageId) ??
    null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.planName.trim()) {
      alert("Tên gói dịch vụ không được để trống!");
      return;
    }
    if (formData.priceMonthly < 0) {
      alert("Giá hàng tháng phải lớn hơn hoặc bằng 0!");
      return;
    }

    setIsSubmitting(true);
    let success = false;

    try {
      if (packageId) {
        if (crudActions.updateServicePackage) {
          await crudActions.updateServicePackage(packageId, formData);
          success = true;
        } else {
          alert("Chức năng cập nhật chưa được triển khai API!");
        }
      } else {
        if (crudActions.createServicePackage) {
          await crudActions.createServicePackage(formData);
          success = true;
        } else {
          alert("Chức năng thêm mới chưa được triển khai API!");
          success = true;
        }
      }
    } catch (error) {
      console.error("Lỗi xử lý gói dịch vụ:", error);
      alert(`Lỗi: ${error.message || "Không thể xử lý gói dịch vụ."}`);
      success = false;
    }

    if (success) {
      setActiveModal(null);
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="service-form">
      <div className="form-grid">
        {/* Tên gói */}
        <div className="form-group full-width">
          <label htmlFor="planName" className="form-label">
            Tên gói <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            id="planName"
            name="planName"
            value={formData.planName}
            onChange={handleChange}
            className="form-input"
            placeholder="Nhập tên gói dịch vụ"
            required
          />
        </div>

        {/* Giá hàng tháng */}
        <div className="form-group">
          <label htmlFor="priceMonthly" className="form-label">
            Giá hàng tháng (VND) <span className="required-asterisk">*</span>
          </label>
          <input
            type="number"
            id="priceMonthly"
            name="priceMonthly"
            value={formData.priceMonthly}
            onChange={handleChange}
            className="form-input"
            placeholder="0"
            required
            min="0"
            step="1000"
          />
        </div>

        {/* Loại (Category) */}
        <div className="form-group">
          <label htmlFor="category" className="form-label">
            Loại (Category) <span className="required-asterisk">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="form-select"
            required
          >
            <option value="Individual">Cá nhân</option>
            <option value="Business">Doanh nghiệp</option>
          </select>
        </div>

        {/* Giảm giá */}
        <div className="form-group">
          <label htmlFor="discountPercent" className="form-label">
            Giảm giá (%)
          </label>
          <input
            type="number"
            id="discountPercent"
            name="discountPercent"
            value={formData.discountPercent}
            onChange={handleChange}
            className="form-input"
            placeholder="0"
            max="100"
            min="0"
            step="1"
          />
        </div>

        {/* Phút chờ miễn phí */}
        <div className="form-group">
          <label htmlFor="freeIdleMinutes" className="form-label">
            Phút chờ miễn phí
          </label>
          <input
            type="number"
            id="freeIdleMinutes"
            name="freeIdleMinutes"
            value={formData.freeIdleMinutes}
            onChange={handleChange}
            className="form-input"
            placeholder="0"
            min="0"
            step="1"
          />
        </div>

        {/* Trạng thái */}
        <div className="form-group">
          <label htmlFor="status" className="form-label">
            Trạng thái gói <span className="required-asterisk">*</span>
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="form-select"
            required
          >
            <option value="Active">Đang hoạt động</option>
            <option value="Inactive">Ngừng hoạt động</option>
          </select>
        </div>
      </div>

      {/* Checkbox dành cho doanh nghiệp */}
      <div className="form-group checkbox-group">
        <label htmlFor="isForCompany" className="checkbox-label">
          <input
            type="checkbox"
            id="isForCompany"
            name="isForCompany"
            checked={formData.isForCompany}
            onChange={handleChange}
            className="form-checkbox"
          />
          <span>Áp dụng cho Doanh nghiệp</span>
        </label>
      </div>

      {/* Mô tả / Quyền lợi */}
      <div className="form-group">
        <label htmlFor="benefits" className="form-label">
          Mô tả / Quyền lợi
        </label>
        <p className="form-hint">
          Mỗi lợi ích 1 dòng (hoặc dùng dấu ";" hay "•"). Ví dụ: "Phù hợp đi lại hằng ngày"
        </p>
        <textarea
          id="benefits"
          name="benefits"
          value={formData.benefits}
          onChange={handleChange}
          className="form-textarea"
          rows="4"
          placeholder="• Phù hợp cá nhân đi lại hằng ngày
• Miễn phí chờ 5 phút mỗi phiên
• Giảm 5% khi thanh toán đủ điều kiện"
        />
      </div>

      {/* Mô tả ngắn (tuỳ chọn) */}
      <div className="form-group">
        <label htmlFor="description" className="form-label">
          Mô tả ngắn (tùy chọn)
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="form-textarea"
          rows="3"
          placeholder="Nội dung sẽ được gộp chung với Quyền lợi khi hiển thị"
        />
      </div>

      {/* Nút hành động */}
      <div className="form-actions">
        <button
          type="button"
          className="btn btn-cancel"
          onClick={() => setActiveModal(null)}
          disabled={isSubmitting}
        >
          Hủy
        </button>
        <button
          type="submit"
          className="btn btn-submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Đang xử lý..."
            : packageId
            ? "Lưu thay đổi"
            : "Thêm mới"}
        </button>
      </div>
    </form>
  );
};

export default ServicePackageForm;
