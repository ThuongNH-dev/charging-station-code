import React from "react";
import { Modal } from "antd";

export default function AddEditChargerModal({
  open,
  onClose,
  isEdit,
  data,
  onChange,
  onSubmit,
  currentStationId,
}) {
  return (
    <Modal
      title={
        isEdit
          ? `🛠️ Sửa Bộ sạc (ID: ${data?.ChargerId})`
          : `➕ Thêm Bộ sạc (Trạm ID: ${currentStationId})`
      }
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <input
        type="text"
        placeholder="Mã Bộ sạc (VD: C003) *"
        name="Code"
        value={data?.Code || ""}
        onChange={onChange}
      />

      <select name="Type" value={data?.Type || "DC"} onChange={onChange}>
        <option value="DC">⚡ DC (Sạc nhanh)</option>
        <option value="AC">🔌 AC (Sạc chậm)</option>
      </select>

      <input
        type="number"
        placeholder="Công suất (PowerKw) *"
        name="PowerKw"
        value={data?.PowerKw || ""}
        onChange={onChange}
      />

      {/* ✅ Đồng bộ trạng thái Charger với BE */}
      <select
        name="Status"
        value={data?.Status || "Online"}
        onChange={onChange}
      >
        <option value="Online">🟢 Online (Hoạt động)</option>
        <option value="Offline">⚫ Offline (Ngắt kết nối)</option>
        <option value="Maintenance">🟠 Maintenance (Bảo trì)</option>
      </select>

      <div className="modal-actions">
        <button onClick={onClose}>Hủy</button>
        <button className="save" onClick={onSubmit}>
          {isEdit ? "Lưu" : "Tạo"}
        </button>
      </div>
    </Modal>
  );
}
