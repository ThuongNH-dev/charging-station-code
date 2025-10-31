// src/components/station/modals/EndSessionModal.jsx
import React from "react";
import { Modal } from "antd";

export default function EndSessionModal({
  open,
  onClose,
  endSessionData,
  endSoc,
  setEndSoc,
  isEnding,
  onConfirm,
  ids, // { stationId, chargerId, portId }
}) {
  if (!open) return null;

  return (
    <Modal
      title="Tổng kết phiên sạc"
      open={open}
      onCancel={onClose}
      footer={null}
    >
      {endSessionData ? (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div />
            <div className="input-field" style={{ marginTop: 12 }}>
              <label>End SoC (%) *</label>
              <input
                type="number"
                min={0}
                max={100}
                placeholder="Nhập SoC khi kết thúc (0-100)"
                value={endSoc}
                onChange={(e) => setEndSoc(e.target.value)}
              />
            </div>
          </div>

          <div style={{ fontSize: "15px", lineHeight: "1.8", color: "#333" }}>
            <p style={{ margin: "0", fontWeight: "bold" }}>
              Trạm: {ids.stationId} · Trụ: {ids.chargerId} · Cổng: {ids.portId}
            </p>
            <p style={{ margin: "0", fontWeight: "bold" }}>
              + Xe:{" "}
              {endSessionData.vehicleName ||
                endSessionData.plate ||
                (endSessionData.vehicleId
                  ? `ID: ${endSessionData.vehicleId}`
                  : "Unknown")}
              + · Người: {endSessionData.userName || "Unknown"} (ID:{" "}
              {endSessionData.userId}) +{" "}
            </p>
            <hr
              style={{
                border: "none",
                borderTop: "1px dotted #ccc",
                margin: "10px 0",
              }}
            />
            <p style={{ margin: "0" }}>
              Bắt đầu:{" "}
              {new Date(endSessionData.startTime).toLocaleTimeString("vi-VN") +
                " " +
                new Date(endSessionData.startTime).toLocaleDateString("vi-VN")}
            </p>
            <p style={{ margin: "0" }}>Kết thúc: {endSessionData.endTime}</p>
            <p style={{ margin: "0" }}>
              Thời lượng (giờ): {endSessionData.duration}
            </p>
            <p style={{ margin: "0" }}>
              Năng lượng (kWh): {endSessionData.energy}
            </p>
            <h4
              style={{
                color: "#1677ff",
                margin: "15px 0 0",
                fontWeight: "bold",
              }}
            >
              Chi phí (đ): {endSessionData.cost}
            </h4>
          </div>

          <div className="modal-actions">
            <button className="btn" onClick={onClose}>
              Đóng
            </button>
            <button
              className="btn blue"
              onClick={onConfirm}
              disabled={
                isEnding || endSoc === "" || Number.isNaN(Number(endSoc))
              }
            >
              {isEnding ? "Đang kết thúc..." : "Kết thúc"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p style={{ color: "#ff4d4f" }}>
            Không tìm thấy dữ liệu phiên sạc đang hoạt động cho cổng này.
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={onClose}>
              Đóng
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
