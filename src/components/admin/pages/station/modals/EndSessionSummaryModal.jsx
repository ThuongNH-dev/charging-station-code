// src/components/station/modals/EndSessionSummaryModal.jsx
import React from "react";
import { Modal } from "antd";

// Hàm tiện ích định dạng tiền tệ (310365 -> 310.365)
const formatVND = (amount) => {
  if (amount === null || amount === undefined) return "0";
  // Đảm bảo Number() để xử lý cả string và number, sau đó định dạng
  return Number(amount).toLocaleString("vi-VN");
};

// Hàm tiện ích định dạng kWh (59.4 -> 59.40)
const formatKwh = (energy) => {
  if (energy === null || energy === undefined) return "0.00";
  return Number(energy).toFixed(2);
};

export default function EndSessionSummaryModal({
  open,
  onClose,
  endSessionData, // Dữ liệu phiên sạc đã kết thúc (từ Backend)
}) {
  const vehicleInfo =
    endSessionData?.vehicleName ||
    endSessionData?.plate ||
    (endSessionData?.vehicleId
      ? `ID: ${endSessionData.vehicleId}`
      : "Không có thông tin");

  // Kiểm tra xem dữ liệu có sẵn để hiển thị không
  if (!endSessionData) return null;

  return (
    <Modal
      title="Tổng kết phiên sạc"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose={true} // Tùy chọn: Đảm bảo component được unmount khi đóng
    >
      {/* Thông tin chung */}
      <p style={{ margin: 0 }}>
        <strong>Người dùng:</strong>{" "}
        {endSessionData.userName ||
          endSessionData.customerName ||
          endSessionData.userId ||
          "N/A"}
      </p>
      <p style={{ margin: 0 }}>
        <strong>Xe:</strong> {vehicleInfo}
      </p>
      <p style={{ margin: 0 }}>
        <strong>Thời gian:</strong>{" "}
        {endSessionData.startedAt &&
          new Date(endSessionData.startedAt).toLocaleTimeString("vi-VN")}{" "}
        -{" "}
        {endSessionData.endedAt &&
          new Date(endSessionData.endedAt).toLocaleTimeString("vi-VN")}
      </p>

      <hr
        style={{
          border: "none",
          borderTop: "1px solid #eee",
          margin: "10px 0",
        }}
      />

      {/* Thông tin chi phí & Năng lượng */}
      <p style={{ margin: "5px 0" }}>
        <strong>Năng lượng tiêu thụ:</strong>{" "}
        {formatKwh(endSessionData.energyKwh)} kWh
      </p>

      {/* HIỂN THỊ PHÍ CHI TIẾT TỪ BACKEND */}
      <p style={{ margin: "5px 0", paddingLeft: 10, color: "#666" }}>
        Phí trước thuế: {formatVND(endSessionData.subtotal)} VNĐ
      </p>
      <p style={{ margin: "5px 0", paddingLeft: 10, color: "#666" }}>
        Thuế (VAT): {formatVND(endSessionData.tax)} VNĐ
      </p>

      {/* TỔNG CỘNG */}
      <h3 style={{ marginTop: 15, color: "#1677ff", fontWeight: "bold" }}>
        Tổng Chi Phí: {formatVND(endSessionData.total)} VNĐ
      </h3>

      <div className="modal-actions" style={{ marginTop: 20 }}>
        <button type="button" className="btn blue" onClick={onClose}>
          Đóng
        </button>
      </div>
    </Modal>
  );
}
