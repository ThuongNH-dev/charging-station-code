import React, { useState } from "react";
import IndividualUserForm from "./IndividualUserForm";
import CompanyUserForm from "./CompanyUserForm";

const PLACEHOLDER_IMG = "https://via.placeholder.com/1.png";

const trimOr = (v, fb = "") => {
  const s = typeof v === "string" ? v.trim() : v;
  return s ? s : fb;
};

const AddStaffForm = ({ stationId, onSave, onCancel }) => {
  const [userId, setUserId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userId) {
      setIsSaving(true);
      onSave({ userId: userId.trim() })
        .catch((err) => console.error("Error during staff save:", err))
        .finally(() => setIsSaving(false));
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-white rounded-lg shadow-xl w-full max-w-md"
    >
      <h3 className="text-xl font-bold mb-4 text-gray-700">
        Thêm Nhân viên vào Station {stationId}
      </h3>
      <p className="mb-4 text-sm text-gray-500">
        Vui lòng nhập <strong>Account ID</strong> của người dùng hiện tại để
        thêm họ làm nhân viên tại trạm này.
      </p>

      <div className="mb-4">
        <label
          htmlFor="staff-user-id"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Account ID
        </label>
        <input
          id="staff-user-id"
          type="number"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="Ví dụ: 12345"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={!userId || isSaving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? "Đang thêm..." : "Thêm Nhân viên"}
        </button>
      </div>
    </form>
  );
};

const GeneralEditModal = ({
  setActiveModal,
  entityData,
  crudActions,
  modalType,
}) => {
  if (!entityData) return null;

  const isAddingStaff = modalType === "addStaff";
  const staffStationId = isAddingStaff ? entityData.stationId : null;
  const originalStatus = entityData.status;

  const handleSave = async (formData) => {
    let success = false;
    let payload = {};
    const accountId = entityData.accountId;

    try {
      if (isAddingStaff) {
        const { userId } = formData;
        if (!userId) {
          console.error("Lỗi: Không tìm thấy ID Người dùng để thêm.");
          return;
        }

        const staffPayload = {
          stationId: staffStationId,
          StaffId: Number(userId),
        };

        await crudActions.addStaffToStation(staffPayload);
        success = true;
      } else {
        const role = entityData.role;

        if (role === "Company") {
          const comp = entityData.company || {};
          payload = {
            companyId: formData.companyId ?? comp.companyId ?? comp.CompanyId,
            name: trimOr(
              formData.companyName,
              comp.name ?? comp.companyName ?? ""
            ),
            taxCode: trimOr(formData.taxCode, comp.taxCode ?? ""),
            email: trimOr(formData.email, comp.email ?? entityData.email ?? ""),
            address: trimOr(formData.address, comp.address ?? "Đang cập nhật"),
            phone: comp.phone ?? "",
            imageUrl:
              (comp.imageUrl && comp.imageUrl.trim()) || PLACEHOLDER_IMG,
          };

          await crudActions.updateUser(accountId, payload, "Company");
        } else {
          const cust = entityData.customers?.[0] || {};

          payload = {
            customerId:
              formData.customerId ?? cust.customerId ?? cust.CustomerId,
            fullName: trimOr(
              formData.fullName,
              cust.fullName ?? entityData.userName ?? ""
            ),
            phone: trimOr(formData.phone, cust.phone ?? ""),
            email: trimOr(
              formData.email,
              cust.email ?? entityData.email ?? "no-reply@example.com"
            ),
            address: trimOr(cust.address, "Đang cập nhật"),
          };

          await crudActions.updateUser(accountId, payload, "Customer");
        }

        if (formData.status && formData.status !== originalStatus) {
          await crudActions.updateUserStatus(accountId, formData.status);
        }

        success = true;
      }

      if (success) {
        setActiveModal(null);
      }
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

      console.error("Lưu thất bại: " + msg);
    }
  };

  if (isAddingStaff) {
    return (
      <AddStaffForm
        stationId={staffStationId}
        onSave={handleSave}
        onCancel={() => setActiveModal(null)}
      />
    );
  }

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
