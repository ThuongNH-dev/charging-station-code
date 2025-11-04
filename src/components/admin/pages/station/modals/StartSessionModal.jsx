import React from "react";
import { Modal } from "antd";

export default function StartSessionModal({
  open,
  onClose,
  startSessionData,
  setStartSessionData,
  foundUserName,
  handleUserIdChange,
  onConfirm,
}) {
  return (
    <Modal title="Bắt đầu phiên sạc (Remote)" open={open} onCancel={onClose} footer={null}>
      {/* ID Xe (tùy chọn) – chỉ số */}
      <div className="input-field">
        <label>ID Xe (Tùy chọn)</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Nhập ID xe (VD: 12345)"
          value={startSessionData.vehicleInput}
          onChange={(e) =>
            setStartSessionData((prev) => ({
              ...prev,
              vehicleInput: e.target.value.replace(/\D/g, ""), // chỉ giữ số
            }))
          }
        />
      </div>

      {/* ID Người dùng – chỉ số (khuyến nghị) */}
      <div className="input-field">
        <label>ID Người dùng *</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Nhập ID người dùng"
          value={startSessionData.userId}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "");
            setStartSessionData((prev) => ({ ...prev, userId: val }));
            handleUserIdChange(val);
          }}
        />
      </div>

      {startSessionData.userId && startSessionData.userId.trim() !== "" && (
        <p
          style={{
            marginTop: "8px",
            padding: "5px 0",
            fontSize: "14px",
            fontWeight: "bold",
            color: foundUserName ? "#52c41a" : "#ff4d4f",
          }}
        >
          {foundUserName
            ? `Tên người dùng: ${foundUserName} (Đã xác minh)`
            : `Không tìm thấy ID Người dùng`}
        </p>
      )}

      <div className="modal-actions" style={{ marginTop: "20px" }}>
        <button className="btn" onClick={onClose}>Hủy</button>
        <button
          className="btn green"
          onClick={onConfirm}
          disabled={!startSessionData.userId || !foundUserName}
        >
          Bắt đầu
        </button>
      </div>
    </Modal>
  );
}
