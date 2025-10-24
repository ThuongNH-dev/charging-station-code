// src/components/UserManagement/Modals/GeneralDeleteModal.jsx
import React, { useState } from "react";

const GeneralDeleteModal = ({
  setActiveModal,
  entityId,
  actionType,
  crudActions,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  // Ánh xạ tên loại đối tượng
  const objectMap = {
    user: "Người dùng",
    vehicle: "Thông số xe",
    service: "Gói dịch vụ",
  };
  const objectName = objectMap[actionType] || "Mục";

  const handleDelete = async () => {
    setIsDeleting(true);
    let success = false;

    try {
      // Lựa chọn hàm xóa dựa trên actionType
      if (actionType === "user") {
        success = await crudActions.deleteUser(entityId);
      } else if (actionType === "vehicle") {
        success = await crudActions.deleteVehicle(entityId);
      } else if (actionType === "service") {
        success = await crudActions.deleteServicePackage(entityId);
      }
    } catch (error) {
      console.error("Lỗi xóa:", error);
    } finally {
      setIsDeleting(false);
      if (success) {
        setActiveModal(null); // Đóng modal nếu xóa thành công
      }
    }
  };

  return (
    <>
      <h3>Xác nhận xóa</h3>
      <p className="danger-text">
        Bạn có chắc chắn muốn xóa **{objectName}** (ID:
        <strong>{entityId}</strong>)? Thao tác này không thể hoàn tác.
      </p>
      <div className="modal-actions">
        <button
          className="btn danger"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "Đang xóa..." : "Xóa vĩnh viễn"}
        </button>
        <button
          className="btn secondary"
          onClick={() => setActiveModal(null)}
          disabled={isDeleting}
        >
          Hủy
        </button>
      </div>
    </>
  );
};

export default GeneralDeleteModal;
