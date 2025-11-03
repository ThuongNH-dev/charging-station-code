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
          ? `🛠️ Sửa Bộ sạc (ID: ${data?.ChargerId || data?.chargerId || "?"})`
          : `➕ Thêm Bộ sạc (Trạm ID: ${currentStationId})`
      }
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      {/* === FORM NHẬP THÔNG TIN CHARGER === */}
      <div className="form-grid">
        {/* Mã trụ */}
        <input
          type="text"
          placeholder="Mã Bộ sạc (VD: C003) *"
          name="Code"
          value={data?.Code || ""}
          onChange={onChange}
          className="input-field"
        />

        {/* Loại trụ */}
        <select
          name="Type"
          value={data?.Type || "DC"}
          onChange={onChange}
          className="input-field"
        >
          <option value="DC">⚡ DC (Sạc nhanh)</option>
          <option value="AC">🔌 AC (Sạc chậm)</option>
        </select>

        {/* Công suất */}
        <input
          type="number"
          placeholder="Công suất (PowerKw) *"
          name="PowerKw"
          value={data?.PowerKw || ""}
          onChange={onChange}
          className="input-field"
        />

        {/* Trạng thái */}
        <select
          name="Status"
          value={data?.Status || "Online"}
          onChange={onChange}
          className="input-field"
        >
          <option value="Online">🟢 Online (Hoạt động)</option>
          <option value="Offline">⚫ Offline (Ngắt kết nối)</option>
          <option value="Maintenance">🟠 Maintenance (Bảo trì)</option>
        </select>

        {/* ✅ Thêm trường InstalledAt */}
        <input
          type="datetime-local"
          placeholder="Ngày cài đặt"
          name="InstalledAt"
          value={
            data?.InstalledAt
              ? new Date(data.InstalledAt).toISOString().slice(0, 16)
              : ""
          }
          onChange={onChange}
          className="input-field"
        />

        {/* ✅ Thêm trường ImageUrl */}
        <input
          type="text"
          placeholder="Link ảnh bộ sạc (Image URL)"
          name="ImageUrl"
          value={data?.ImageUrl || ""}
          onChange={onChange}
          className="input-field"
        />
      </div>

      {/* === BUTTONS === */}
      <div className="modal-actions">
        <button onClick={onClose}>Hủy</button>
        <button className="save" onClick={onSubmit}>
          {isEdit ? "Lưu" : "Tạo"}
        </button>
      </div>
    </Modal>
  );
}
