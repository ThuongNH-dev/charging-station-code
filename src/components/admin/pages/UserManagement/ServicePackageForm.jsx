// 📁 src/components/UserManagement/ServicePackageForm.jsx
import React, { useState, useEffect } from "react";

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
          min="0"
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
          min="0"
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
          min="0"
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
        <label>
          Mô tả / Quyền lợi:
          <span
            className="hint"
            style={{ marginLeft: 6, color: "#888", fontSize: 12 }}
          >
            Mỗi lợi ích 1 dòng (hoặc dùng dấu “;” hay “•”). Ví dụ:
            <em> “Phù hợp đi lại hằng ngày”</em>
          </span>
        </label>
        <textarea
          name="benefits"
          value={formData.benefits}
          onChange={handleChange}
          rows="3"
          placeholder={`Ví dụ:
• Phù hợp cá nhân đi lại hằng ngày
• Miễn phí chờ 5 phút mỗi phiên
• Giảm 5% khi thanh toán đủ điều kiện`}
        />
      </div>

      {/* Mô tả ngắn (tuỳ chọn) */}
      <div className="form-group">
        <label>Mô tả ngắn (tùy chọn):</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="2"
          placeholder="Nội dung sẽ được gộp chung với Quyền lợi khi hiển thị"
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
