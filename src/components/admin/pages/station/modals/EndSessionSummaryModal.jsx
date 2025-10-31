// src/components/station/modals/EndSessionSummaryModal.jsx
import React from "react";
import { Modal } from "antd";

export default function EndSessionSummaryModal({
  open,
  onClose,
  endSessionData,
}) {
  return (
    <Modal
      title="Tổng kết phiên sạc"
      open={open}
      onCancel={onClose}
      footer={null}
    >
      <p>
        <strong>Người dùng:</strong> {endSessionData?.userName}
      </p>
      <p>
        + <strong>Xe:</strong> +{" "}
        {endSessionData?.vehicleName ||
          endSessionData?.plate ||
          (endSessionData?.vehicleId
            ? `ID: ${endSessionData.vehicleId}`
            : "Không có thông tin")}
        +{" "}
      </p>
      <p>
        <strong>Thời gian:</strong>{" "}
        {new Date(endSessionData?.startTime).toLocaleTimeString()} -{" "}
        {new Date(endSessionData?.endTime).toLocaleTimeString()}
      </p>
      <p>
        <strong>Năng lượng:</strong> {endSessionData?.totalEnergy} kWh
      </p>
      <p>
        <strong>Chi phí:</strong>{" "}
        {Number(endSessionData?.totalCost || 0).toLocaleString()} VNĐ
      </p>
      <button onClick={onClose}>Đóng</button>
    </Modal>
  );
}
