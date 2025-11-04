// src/components/station/modals/DeleteConfirmModal.jsx
import React, { useState, useEffect } from "react";
import { Modal } from "antd";

export default function DeleteConfirmModal({
  open,
  onClose,
  targetId,
  targetType,
  onConfirm,
}) {
  const [confirmed, setConfirmed] = useState(false);

  // Reset checkbox mỗi lần mở modal mới
  useEffect(() => {
    if (open) setConfirmed(false);
  }, [open]);

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
      destroyOnClose
    >
      <div style={{ fontSize: 15, lineHeight: 1.6 }}>
        <p>
          Bạn có chắc muốn xoá {label} ID: <b>{targetId}</b> này? <br />
          Hành động này <b>không thể hoàn tác</b>.
        </p>
        {targetType === "station" && (
          <p style={{ color: "#d9534f" }}>
            ⚠️ Mọi bộ sạc và cổng bên trong trạm cũng sẽ bị xoá!
          </p>
        )}
        {targetType === "charger" && (
          <p style={{ color: "#f0ad4e" }}>
            ⚠️ Mọi cổng sạc thuộc bộ sạc này cũng sẽ bị xoá!
          </p>
        )}
      </div>

      {/* Checkbox xác nhận */}
      <div
        style={{
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
        }}
      >
        <input
          type="checkbox"
          id="confirm-delete"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <label htmlFor="confirm-delete">
          Tôi hiểu và xác nhận muốn xoá {label.toLowerCase()} này
        </label>
      </div>

      <div
        className="modal-actions"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 20,
          gap: 10,
        }}
      >
        <button type="button" onClick={onClose}>
          Hủy
        </button>
        <button
          type="button"
          className="delete"
          disabled={!targetId || !confirmed}
          onClick={() => {
            if (!targetId) return;
            onConfirm(); // ✅ Bấm là xoá luôn (nếu đã tick checkbox)
          }}
        >
          Xoá
        </button>
      </div>
    </Modal>
  );
}
