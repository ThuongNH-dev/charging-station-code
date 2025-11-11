import React from "react";
import { Modal } from "antd";
import { getApiBase, resolveUrl } from "../../../../../utils/api";

export default function AddEditStationModal({
  open,
  onClose,
  isEdit,
  data,
  onChange,
  onSubmit,
}) {
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const stationId = data?.StationId ?? data?.stationId;
    if (!stationId) {
      Modal.error({
        title: "Chưa có StationId",
        content:
          "Bạn cần lưu tạo trạm trước, hoặc chọn trạm đã tồn tại rồi mới upload ảnh.",
      });
      e.target.value = "";
      return;
    }

    try {
      const fd = new FormData();
      fd.append("file", file);

      // 🔹 Gửi cả hai tên tham số để chắc chắn backend bind được
      fd.append("id", String(stationId));
      fd.append("stationId", String(stationId));

      // ✅ Endpoint chính xác theo Swagger: POST /api/Stations/image/upload
      const endpoint = resolveUrl("/Stations/image/upload");

      const res = await fetch(endpoint, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        Modal.error({
          title: `Upload thất bại (${res.status})`,
          content: text || "Máy chủ từ chối yêu cầu hoặc không tìm thấy trạm.",
        });
        return;
      }

      const ct = res.headers.get("content-type") || "";
      let j = {};
      if (ct.includes("application/json")) {
        j = await res.json();
      } else {
        const t = await res.text();
        try {
          j = JSON.parse(t);
        } catch {
          j = { url: t };
        }
      }

      let url =
        j?.url ||
        j?.imageUrl ||
        j?.ImageUrl ||
        j?.data?.url ||
        j?.message?.url ||
        (typeof j === "string" && j.startsWith("http") ? j : "");

      if (!url) {
        Modal.error({
          title: "Upload thành công nhưng không nhận được URL",
          content:
            "Vui lòng đảm bảo server trả về JSON có dạng { url: 'https://...' }.",
        });
        return;
      }

      if (url.startsWith("/")) url = `${getApiBase()}${url}`;

      onChange({ target: { name: "ImageUrl", value: url } });
    } catch (err) {
      Modal.error({
        title: "Lỗi khi upload ảnh",
        content: String(err?.message || err || "Không xác định"),
      });
    } finally {
      e.target.value = "";
    }
  };

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

        {/* ✅ Upload ảnh */}
        <div style={{ display: "grid", gap: 8 }}>
          {data?.ImageUrl ? (
            <img
              src={data.ImageUrl}
              alt="Station"
              style={{
                width: "100%",
                height: 140,
                objectFit: "cover",
                borderRadius: 8,
                border: "1px solid #eee",
              }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/placeholder.png";
              }}
            />
          ) : null}

          <input
            type="file"
            accept="image/*"
            className="input-field"
            onChange={handleUpload}
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
