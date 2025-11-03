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
      <input
        type="text"
        placeholder="Tên trạm *"
        name="StationName"
        value={data?.StationName || ""}
        onChange={onChange}
      />
      <input
        type="text"
        placeholder="Địa điểm *"
        name="Address"
        value={data?.Address || ""}
        onChange={onChange}
      />
      <input
        type="text"
        placeholder="Thành phố *"
        name="City"
        value={data?.City || ""}
        onChange={onChange}
      />
      <input
        type="number"
        placeholder="Vĩ độ (Latitude)"
        name="Latitude"
        value={data?.Latitude || ""}
        onChange={onChange}
      />
      <input
        type="number"
        placeholder="Kinh độ (Longitude)"
        name="Longitude"
        value={data?.Longitude || ""}
        onChange={onChange}
      />

      {/* ✅ Đồng bộ trạng thái với BE */}
      <select name="Status" value={data?.Status || "Open"} onChange={onChange}>
        <option value="Open">🟢 Open (Hoạt động)</option>
        <option value="Closed">⚫ Closed (Đóng cửa)</option>
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
