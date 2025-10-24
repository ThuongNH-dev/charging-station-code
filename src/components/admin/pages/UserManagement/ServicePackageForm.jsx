// src/components/UserManagement/ServicePackageForm.jsx
import React, { useState, useEffect } from "react";

// Nhận initialData, crudActions (chứa updateServicePackage), và setActiveModal từ Modals/ServiceModal.jsx
const ServicePackageForm = ({ initialData, crudActions, setActiveModal }) => {
  // Khởi tạo state form từ dữ liệu ban đầu hoặc giá trị mặc định
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    duration: "",
    limit: "",
    benefits: "",
    type: "Public", // Giá trị mặc định
    status: "Đang bán",
    ...initialData, // Ghi đè nếu có dữ liệu chỉnh sửa
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Xác định hành động (Update hay Create)
    const isEdit = initialData && initialData.id;
    let success = false;

    if (isEdit) {
      // CALL API UPDATE
      success = await crudActions.updateServicePackage(
        initialData.id,
        formData
      );
    } else {
      // CALL API CREATE (Giả định bạn có hàm createServicePackage trong crudActions)
      // success = await crudActions.createServicePackage(formData);
      // Tạm thời bỏ qua phần Create vì API bạn cung cấp chưa có POST
      alert("Chức năng thêm mới chưa được triển khai API!");
    }

    if (success) {
      setActiveModal(null); // Đóng modal sau khi thành công
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="service-form">
      <div className="form-group">
        <label>Tên gói:</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label>Giá:</label>
        <input
          type="number"
          name="price"
          value={formData.price}
          onChange={handleChange}
          required
        />
      </div>
      {/* ... Các trường input khác (duration, limit, benefits, type, status) ... */}

      <div className="form-group">
        <label>Quyền lợi:</label>
        <textarea
          name="benefits"
          value={formData.benefits}
          onChange={handleChange}
          rows="3"
        />
      </div>

      {/* Nút submit được di chuyển ra ngoài modal-actions (AdminModals) để giữ cấu trúc ban đầu */}
      <div className="modal-actions form-actions">
        <button type="submit" className="btn primary" disabled={isSubmitting}>
          {isSubmitting
            ? "Đang xử lý..."
            : initialData
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
