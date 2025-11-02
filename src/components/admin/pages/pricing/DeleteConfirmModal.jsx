// src/components/admin/pages/pricing/DeleteConfirmModal.jsx
import React from "react";
import { Modal, Button, Space } from "antd";

export default function DeleteConfirmModal({
  open,
  onClose,
  targetId,
  targetType = "mục", // Quy tắc giá
  onConfirm,
}) {
  return (
    <Modal
      title={`Xác nhận Xóa ${targetType}`}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <p style={{ margin: "20px 0", fontSize: "16px" }}>
        Bạn có chắc chắn muốn xóa **{targetType} ID: {targetId}** không?
      </p>
      <p style={{ color: "red" }}>Hành động này không thể hoàn tác!</p>
      <div
        style={{ display: "flex", justifyContent: "flex-end", marginTop: 30 }}
      >
        <Space>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" danger onClick={onConfirm}>
            Xác nhận Xóa
          </Button>
        </Space>
      </div>
    </Modal>
  );
}
