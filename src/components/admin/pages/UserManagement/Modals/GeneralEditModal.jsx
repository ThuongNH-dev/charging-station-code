import React from "react";
import IndividualUserForm from "./IndividualUserForm";
import CompanyUserForm from "./CompanyUserForm";

const PLACEHOLDER_IMG = "https://via.placeholder.com/1.png"; // có đuôi .png

const trimOr = (v, fb = "") => {
  const s = typeof v === "string" ? v.trim() : v;
  return s ? s : fb;
};

const GeneralEditModal = ({ setActiveModal, entityData, crudActions }) => {
  if (!entityData) return null;

  const handleSave = async (formData) => {
    const role = entityData.role; // "Customer" | "Company"
    const accountId = entityData.accountId; // AccountId
    const originalStatus = entityData.status;

    try {
      if (role === "Company") {
        const comp = entityData.company || {};

        // build payload: ưu tiên input; nếu trống -> lấy giá trị đang có
        const payload = {
          companyId: formData.companyId ?? comp.companyId ?? comp.CompanyId,
          name: trimOr(
            formData.companyName,
            comp.name ?? comp.companyName ?? ""
          ),
          taxCode: trimOr(formData.taxCode, comp.taxCode ?? ""),
          email: trimOr(formData.email, comp.email ?? entityData.email ?? ""),
          address: trimOr(formData.address, comp.address ?? "Đang cập nhật"),
          phone: comp.phone ?? "", // field ẩn
          imageUrl: (comp.imageUrl && comp.imageUrl.trim()) || PLACEHOLDER_IMG,
        };

        await crudActions.updateUser(accountId, payload, "Company");
      } else {
        const cust = entityData.customers?.[0] || {};

        const payload = {
          customerId: formData.customerId ?? cust.customerId ?? cust.CustomerId,
          fullName: trimOr(
            formData.fullName,
            cust.fullName ?? entityData.userName ?? ""
          ),
          phone: trimOr(formData.phone, cust.phone ?? ""),
          email: trimOr(
            formData.email,
            cust.email ?? entityData.email ?? "no-reply@example.com"
          ),
          address: trimOr(cust.address, "Đang cập nhật"), // UI không sửa -> gửi lại
        };

        await crudActions.updateUser(accountId, payload, "Customer");
      }

      // đổi trạng thái nếu khác
      if (formData.status && formData.status !== originalStatus) {
        await crudActions.updateUserStatus(accountId, formData.status);
      }

      setActiveModal(null);
    } catch (err) {
      console.error("❌ Lỗi khi lưu:", err);
      const pd = err?.response?.data;
      let msg =
        pd?.title ||
        pd?.message ||
        err?.message ||
        "One or more validation errors occurred.";
      if (pd?.errors && typeof pd.errors === "object") {
        msg +=
          "\n\n" +
          Object.entries(pd.errors)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join("\n");
      }
      alert("Lưu thất bại: " + msg);
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
