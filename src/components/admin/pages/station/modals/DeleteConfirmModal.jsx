// src/components/station/modals/DeleteConfirmModal.jsx
import React from "react";
import { Modal } from "antd";

export default function DeleteConfirmModal({
  open,
  onClose,
  targetId,
  targetType,
  onConfirm,
}) {
  const label =
    targetType === "station"
      ? "Trạm"
      : targetType === "charger"
      ? "Bộ sạc"
      : "Cổng";

  return (
    <Modal
      title={`Xác nhận xoá ${label}`}
      open={open}
      onCancel={onClose}
      footer={null}
    >
      <p>
        Bạn có chắc muốn xoá {label} ID: {targetId} này? Hành động này không thể
        hoàn tác.
        {targetType === "station" && " Mọi bộ sạc và cổng bên trong sẽ bị xóa."}
        {targetType === "charger" && " Mọi cổng sạc bên trong sẽ bị xóa."}
      </p>
      <div className="modal-actions">
        <button onClick={onClose}>Hủy</button>
        <button className="delete" onClick={onConfirm}>
          Xoá
        </button>
      </div>
    </Modal>
  );
}
