// src/components/UserManagement/Modals/GeneralEditModal.jsx
import React from "react";

// Placeholder cho các form chỉnh sửa User/Vehicle
const GeneralEditModal = ({ setActiveModal, actionType, entityId }) => {
  // actionType sẽ là 'editUser' hoặc 'editVehicle'
  const type = actionType.replace("edit", "");

  return (
    <>
      <h3>
        Chỉnh sửa: {type}
        ID: {entityId}
      </h3>
      <div className="modal-content">
        <p>
          Đây là form **placeholder** cho chức năng Chỉnh sửa **{type}** (ID:{" "}
          {entityId}). Bạn cần tạo các form chi tiết (UserForm, VehicleForm) để
          thay thế nội dung này.
        </p>
      </div>
      <div className="modal-actions">
        <button className="btn primary" disabled>
          Lưu (Placeholder)
        </button>
        <button className="btn secondary" onClick={() => setActiveModal(null)}>
          Hủy
        </button>
      </div>
    </>
  );
};

export default GeneralEditModal;
