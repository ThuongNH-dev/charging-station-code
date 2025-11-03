import React from "react";
import { Modal } from "antd";

export default function AddEditStationModal({
  open,
  onClose,
  isEdit,
  data,
  onChange,
  onSubmit,
}) {
  return (
    <Modal
      title={isEdit ? `🛠️ Sửa Trạm (ID: ${data?.StationId})` : "➕ Thêm Trạm"}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <div className="form-grid">
        <input
          type="text"
          placeholder="Tên trạm *"
          name="StationName"
          value={data?.StationName || ""}
          onChange={onChange}
          className="input-field"
        />
        <input
          type="text"
          placeholder="Địa chỉ *"
          name="Address"
          value={data?.Address || ""}
          onChange={onChange}
          className="input-field"
        />
        <input
          type="text"
          placeholder="Thành phố *"
          name="City"
          value={data?.City || ""}
          onChange={onChange}
          className="input-field"
        />
        <input
          type="number"
          placeholder="Vĩ độ (Latitude)"
          name="Latitude"
          value={data?.Latitude ?? ""}
          onChange={onChange}
          className="input-field"
        />
        <input
          type="number"
          placeholder="Kinh độ (Longitude)"
          name="Longitude"
          value={data?.Longitude ?? ""}
          onChange={onChange}
          className="input-field"
        />

        {/* ✅ Thêm field hình ảnh */}
        <input
          type="text"
          placeholder="Ảnh (Image URL)"
          name="ImageUrl"
          value={data?.ImageUrl || ""}
          onChange={onChange}
          className="input-field"
        />

        <select
          name="Status"
          value={data?.Status || "Open"}
          onChange={onChange}
          className="input-field"
        >
          <option value="Open">🟢 Open (Hoạt động)</option>
          <option value="Closed">⚫ Closed (Đóng cửa)</option>
          <option value="Maintenance">🟠 Maintenance (Bảo trì)</option>
        </select>
      </div>

      <div className="modal-actions">
        <button onClick={onClose}>Hủy</button>
        <button className="save" onClick={onSubmit}>
          {isEdit ? "Lưu" : "Tạo"}
        </button>
      </div>
    </Modal>
  );
}
