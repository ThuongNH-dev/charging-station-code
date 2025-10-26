import React from "react";
import IndividualUserForm from "./IndividualUserForm";
import CompanyUserForm from "./CompanyUserForm";

const GeneralEditModal = ({ setActiveModal, entityData, crudActions }) => {
  if (!entityData) return null;

  const handleSave = async (formData) => {
    console.log("Đang lưu user:", entityData.accountId, formData);
    const role = entityData.role;
    const entityId = entityData.accountId;

    try {
      if (role === "Company") {
        // === CẤU TRÚC CHO DOANH NGHIỆP (ĐÃ SỬA) ===
        const companyData = entityData.company || {};
        const dataToSend = {
          // Gửi dữ liệu phẳng PascalCase
          AccountId: entityId,
          CompanyId: companyData.companyId || 0,
          Name: formData.companyName,
          TaxCode: formData.taxCode,
          Email: formData.email,
          Phone: companyData.phone || "",
          Address: formData.address,
          ImageUrl: companyData.imageUrl || "",
          PaymentStatus: formData.paymentStatus,
          Status: formData.status,
        };
        await crudActions.updateUser(entityId, dataToSend, role);
      } else {
        // === KHAI BÁO VÀ LẤY DỮ LIỆU CẦN THIẾT ===
        const customerId = entityData.customers?.[0]?.customerId;

        // ✅ THÊM DÒNG KHAI BÁO VÀ GÁN GIÁ TRỊ TẠI ĐÂY
        const currentAddress = entityData.customers?.[0]?.address || "-";

        const dataToSend = {
          // ✅ Gửi dữ liệu phẳng PascalCase (loại bỏ mảng Customers)
          AccountId: entityId,
          CustomerId: customerId, // ID chính của Customer
          FullName: formData.fullName,
          Phone: formData.phone,
          Email: formData.email,
          Address: currentAddress,

          // Các trường cấp root khác
          PlanName: formData.planName,
          Status: formData.status,
        };

        await crudActions.updateUser(entityId, dataToSend, role);
      }
      setActiveModal(null);
    } catch (err) {
      console.error("❌ Lỗi khi lưu:", err);
      // Giúp hiển thị thông báo lỗi chi tiết từ server
      const errorMsg = err.response?.data?.message || err.message;
      alert("Lưu thất bại: " + errorMsg);
    }
  };

  const FormComponent =
    entityData.role === "Company" ? CompanyUserForm : IndividualUserForm;

  return (
    <FormComponent
      userData={entityData}
      onSave={handleSave}
      onCancel={() => setActiveModal(null)}
    />
  );
};

export default GeneralEditModal;
