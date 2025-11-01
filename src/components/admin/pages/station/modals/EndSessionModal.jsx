// src/components/station/modals/EndSessionModal.jsx
import React from "react";
import { Modal } from "antd";

// Hàm tiện ích định dạng tiền tệ (310365 -> 310.365)
const formatVND = (amount) => {
  if (amount === null || amount === undefined) return "0";
  // Đảm bảo Number(amount) là số trước khi gọi toLocaleString
  return Number(amount).toLocaleString("vi-VN");
};

// Hàm tiện ích định dạng kWh (59.4 -> 59.40)
const formatKwh = (energy) => {
  if (energy === null || energy === undefined) return "0.00";
  // Giả định năng lượng ở đây là giá trị tính toán nhanh, chỉ hiển thị 2 chữ số
  return Number(energy).toFixed(2);
};

export default function EndSessionModal({
  open,
  onClose,
  endSessionData, // Cần chứa: .energy, .cost, .currentSubtotal, .currentTax
  endSoc,
  setEndSoc,
  isEnding,
  onConfirm,
  ids, // { stationId, chargerId, portId }
}) {
  if (!open) return null;

  return (
    <Modal
      title="Xác nhận Kết thúc phiên sạc"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose={true}
    >
      {endSessionData ? (
        <>
          {/* End SoC: tự động đọc từ trụ tại thời điểm dừng */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div />
            <div className="input-field" style={{ marginTop: 12 }}>
              <label>End SoC (%)</label>
              <div
                style={{
                  padding: "8px 12px",
                  border: "1px solid #d9d9d9",
                  borderRadius: 6,
                  background: "#fafafa",
                  minWidth: 200,
                }}
              >
                {endSessionData?.endSoc != null
                  ? `${endSessionData.endSoc}%`
                  : "Lấy tự động từ trụ khi xác nhận dừng"}
              </div>
              <small style={{ color: "#999" }}>
                * Admin không cần nhập; hệ thống sẽ đọc SoC thực tế tại thời
                điểm dừng.
              </small>
            </div>
          </div>

          {/* Info block */}
          <div style={{ fontSize: "15px", lineHeight: "1.8", color: "#333" }}>
            <p style={{ margin: 0, fontWeight: "bold" }}>
              Trạm: {ids?.stationId} · Trụ: {ids?.chargerId} · Cổng:{" "}
              {ids?.portId}
            </p>
            <p style={{ margin: 0, fontWeight: "bold" }}>
              Xe:{" "}
              {endSessionData.vehicleName ||
                endSessionData.plate ||
                (endSessionData.vehicleId
                  ? `ID: ${endSessionData.vehicleId}`
                  : "Unknown")}
              {" · "}Người: {endSessionData.userName || "Unknown"} (ID:{" "}
              {endSessionData.userId})
            </p>
            <hr
              style={{
                border: "none",
                borderTop: "1px dotted #ccc",
                margin: "10px 0",
              }}
            />
            <p style={{ margin: 0 }}>
              Bắt đầu:{" "}
              {endSessionData.startTime
                ? `${new Date(endSessionData.startTime).toLocaleTimeString(
                    "vi-VN"
                  )} ${new Date(endSessionData.startTime).toLocaleDateString(
                    "vi-VN"
                  )}`
                : "N/A"}
            </p>
            <p style={{ margin: 0 }}>
              Thời lượng (phút): {endSessionData.duration ?? "N/A"}
            </p>
            {/* Sử dụng formatKwh cho dữ liệu tạm tính */}
            <p style={{ margin: 0 }}>
              Năng lượng (kWh, tạm tính): {formatKwh(endSessionData.energy)}
            </p>

            {/* ✨ HIỂN THỊ PHÍ CHI TIẾT TẠM TÍNH ✨ */}
            {/* Đây là phần đã thêm để hiển thị chi phí tạm tính chi tiết */}
            <p style={{ margin: 0, color: "#0056b3" }}>
              Phí trước thuế (tạm tính):{" "}
              {formatVND(endSessionData.currentSubtotal)} đ
            </p>
            <p style={{ margin: 0, color: "#0056b3" }}>
              Thuế (tạm tính): {formatVND(endSessionData.currentTax)} đ
            </p>
            {/* KẾT THÚC PHẦN THÊM */}

            <h4
              style={{
                color: "#1677ff",
                margin: "15px 0 0",
                fontWeight: "bold",
              }}
            >
              Chi phí (Tổng tạm tính): {formatVND(endSessionData.cost)} đ
            </h4>
            <small style={{ color: "red", display: "block", marginTop: 5 }}>
              *Chi phí cuối cùng (sau thuế, phí) sẽ được tính và gửi từ Backend
              sau khi xác nhận.
            </small>
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Đóng
            </button>
            <button
              type="button"
              className="btn blue"
              onClick={onConfirm}
              disabled={isEnding}
            >
              {isEnding ? "Đang kết thúc..." : "Xác nhận Kết thúc"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p style={{ color: "#ff4d4f" }}>
            Không tìm thấy dữ liệu phiên sạc đang hoạt động cho cổng này.
          </p>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Đóng
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
