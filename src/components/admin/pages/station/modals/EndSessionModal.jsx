import React from "react";
import { Modal } from "antd";

// Tiện ích định dạng
const formatVND = (amount) => {
  if (amount === null || amount === undefined || isNaN(Number(amount)))
    return "0";
  return Number(amount).toLocaleString("vi-VN");
};
const formatKwh = (energy) => {
  if (energy === null || energy === undefined || isNaN(Number(energy)))
    return "0.00";
  return Number(energy).toFixed(2);
};

export default function EndSessionModal({
  open,
  onClose,
  endSessionData, // có thể null -> sẽ dùng default
  endSoc,
  setEndSoc,
  isEnding,
  onConfirm,
  ids, // { stationId, chargerId, portId }
}) {
  if (!open) return null;

  // ✅ Luôn có dữ liệu để vẽ UI (ảnh #2)
  const data = {
    sessionId: null,
    userId: null,
    userName: "",
    vehicleId: null,
    vehicleName: null,
    plate: null,
    startTime: null,
    duration: 0, // (giờ)
    energy: 0, // kWh tạm tính
    currentSubtotal: 0, // phí trước thuế tạm
    currentTax: 0, // thuế tạm
    cost: 0, // tổng tạm
    endSoc: null,
    ...(endSessionData || {}),
  };

  const vehicleInfo =
    data.vehicleName ||
    data.plate ||
    (data.vehicleId ? `ID: ${data.vehicleId}` : "Unknown");

  return (
    <Modal
      title="Xác nhận Kết thúc phiên sạc"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      {/* End SoC: đọc tự động khi xác nhận dừng */}
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
            {data.endSoc != null
              ? `${data.endSoc}%`
              : "Lấy tự động từ trụ khi xác nhận dừng"}
          </div>
          <small style={{ color: "#999" }}>
            * Hệ thống sẽ đọc SoC thực tế tại thời điểm dừng.
          </small>
        </div>
      </div>

      {/* Info block */}
      <div style={{ fontSize: "15px", lineHeight: "1.8", color: "#333" }}>
        <p style={{ margin: 0, fontWeight: "bold" }}>
          Trạm: {ids?.stationId} · Trụ: {ids?.chargerId} · Cổng: {ids?.portId}
        </p>
        <p style={{ margin: 0, fontWeight: "bold" }}>
          Xe: {vehicleInfo} · Người: {data.userName || "Unknown"} (ID:{" "}
          {data.userId ?? "—"})
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
          {data.startTime
            ? `${new Date(data.startTime).toLocaleTimeString(
                "vi-VN"
              )} ${new Date(data.startTime).toLocaleDateString("vi-VN")}`
            : "N/A"}
        </p>
        <p style={{ margin: 0 }}>
          Thời lượng (giờ): {Number(data.duration || 0).toFixed(2)}
        </p>

        <p style={{ margin: 0 }}>
          Năng lượng (kWh, tạm tính): {formatKwh(data.energy)}
        </p>
        <p style={{ margin: 0, color: "#0056b3" }}>
          Phí trước thuế (tạm tính): {formatVND(data.currentSubtotal)} đ
        </p>
        <p style={{ margin: 0, color: "#0056b3" }}>
          Thuế (tạm tính): {formatVND(data.currentTax)} đ
        </p>

        <h4
          style={{ color: "#1677ff", margin: "15px 0 0", fontWeight: "bold" }}
        >
          Chi phí (Tổng tạm tính): {formatVND(data.cost)} đ
        </h4>
        <small style={{ color: "red", display: "block", marginTop: 5 }}>
          * Chi phí cuối cùng sẽ do Backend trả về sau khi xác nhận.
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
    </Modal>
  );
}
