// src/components/station/modals/AddEditPortModal.jsx
import React from "react";
import { Modal } from "antd";

export default function AddEditPortModal({
  open,
  onClose,
  isEdit,
  data,
  onChange,
  onSubmit,
  ids, // { stationId, chargerId }
}) {
  return (
    <Modal
      title={
        isEdit
          ? `Sửa Cổng (ID: ${data?.PortId})`
          : `Thêm Cổng Sạc (Trạm ${ids?.stationId} - Bộ sạc ${ids?.chargerId})`
      }
      open={open}
      onCancel={onClose}
      footer={null}
    >
      {!isEdit && (
        <>
          <input
            type="text"
            placeholder="Mã Cổng (VD: P005, tùy chọn)"
            name="Code"
            value={data?.Code || ""}
            onChange={onChange}
          />
          <select
            name="ConnectorType"
            value={data?.ConnectorType || "CCS2"}
            onChange={onChange}
          >
            <option value="CCS2">CCS2</option>
            <option value="Type2">Type2</option>
            <option value="CHAdeMO">CHAdeMO</option>
          </select>
          <input
            type="number"
            placeholder="Công suất Tối đa (MaxPowerKw, kW) *"
            name="MaxPowerKw"
            value={data?.MaxPowerKw || ""}
            onChange={onChange}
          />
          <select
            name="Status"
            value={data?.Status || "Available"}
            onChange={onChange}
          >
            <option value="Available">Sẵn sàng</option>
            <option value="Maintenance">Bảo trì</option>
            <option value="Busy">Đang bận</option>
          </select>
        </>
      )}

      {isEdit && (
        <>
          <select
            name="ConnectorType"
            value={data?.ConnectorType || "CCS2"}
            onChange={onChange}
          >
            <option value="CCS2">CCS2</option>
            <option value="Type2">Type2</option>
            <option value="CHAdeMO">CHAdeMO</option>
          </select>
          <input
            type="number"
            placeholder="Công suất Tối đa (MaxPowerKw) *"
            name="MaxPowerKw"
            value={data?.MaxPowerKw || ""}
            onChange={onChange}
          />
          <select
            name="Status"
            value={data?.Status || "Available"}
            onChange={onChange}
          >
            <option value="Available">Sẵn sàng</option>
            <option value="Maintenance">Bảo trì</option>
            <option value="Busy">Đang bận</option>
          </select>
        </>
      )}

      <div className="modal-actions">
        <button onClick={onClose}>Hủy</button>
        <button className="save" onClick={onSubmit}>
          {isEdit ? "Lưu" : "Tạo"}
        </button>
      </div>
    </Modal>
  );
}
