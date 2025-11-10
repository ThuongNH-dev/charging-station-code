import React from "react";
import { Modal } from "antd";
import { getApiBase } from "../../../../../utils/api";

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

        {/* ✅ Ảnh trạm - upload file thay vì URL */}
        <div style={{ display: "grid", gap: 8 }}>
          {data?.ImageUrl ? (
            <img
              src={data.ImageUrl}
              alt="Station"
              style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8, border: "1px solid #eee" }}
            />
          ) : null}
          <input
            type="file"
            accept="image/*"
            className="input-field"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const fd = new FormData();
                fd.append("file", file);
                const res = await fetch(`${getApiBase()}/api/stations/image/upload`, {
                  method: "POST",
                  body: fd,
                });
                const j = await res.json().catch(() => ({}));
                const url =
                  j?.url ||
                  j?.imageUrl ||
                  j?.ImageUrl ||
                  j?.data?.url ||
                  j?.message?.url ||
                  "";
                if (url) {
                  onChange({ target: { name: "ImageUrl", value: url } });
                } else {
                  // fallback: nếu BE trả thẳng string
                  if (typeof j === "string" && j.startsWith("http")) {
                    onChange({ target: { name: "ImageUrl", value: j } });
                  }
                }
              } catch {
                // silent; UI có thể bổ sung message nếu cần
              } finally {
                e.target.value = "";
              }
            }}
          />
        </div>

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
