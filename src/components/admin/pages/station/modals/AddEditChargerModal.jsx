// src/components/station/modals/AddEditChargerModal.jsx
import React, { useState } from "react";
import { Modal } from "antd";
import { getApiBase, resolveUrl } from "../../../../../utils/api";

export default function AddEditChargerModal({
  open,
  onClose,
  isEdit,
  data,
  onChange,
  onSubmit,
  currentStationId,
}) {
  const [localPreview, setLocalPreview] = useState("");

  const patch = (name, value) => onChange({ target: { name, value } });

  // Upload ảnh: nếu đã có ChargerId -> upload ngay; nếu chưa (đang tạo) -> chỉ preview và giữ file để upload sau khi tạo xong
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const chargerId = data?.ChargerId ?? data?.chargerId ?? data?.id;

    // TRƯỜNG HỢP CHƯA CÓ ID (đang tạo mới): chỉ preview + giữ file để submit xong sẽ upload
    if (!chargerId) {
      const reader = new FileReader();
      reader.onload = (ev) => setLocalPreview(ev.target.result);
      reader.readAsDataURL(file);
      patch("TempImageFile", file); // giữ file thật để upload sau khi tạo
      e.target.value = "";
      return;
    }

    // TRƯỜNG HỢP ĐÃ CÓ ID: upload trực tiếp
    try {
      const fd = new FormData();
      fd.append("file", file);
      // gửi kèm cả 2 tên để backend bind chắc ăn
      fd.append("id", String(chargerId));
      fd.append("chargerId", String(chargerId));

      const endpoint = resolveUrl("/Chargers/image/upload"); // POST /api/Chargers/image/upload
      const res = await fetch(endpoint, { method: "POST", body: fd });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        Modal.error({
          title: `Upload thất bại (${res.status})`,
          content:
            text || "Máy chủ từ chối yêu cầu hoặc không tìm thấy charger.",
        });
        return;
      }

      const ct = res.headers.get("content-type") || "";
      let j = {};
      if (ct.includes("application/json")) j = await res.json();
      else {
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
          title: "Upload xong nhưng không nhận được URL",
          content: "Vui lòng để server trả về { url: 'https://...' }.",
        });
        return;
      }
      if (url.startsWith("/")) url = `${getApiBase()}${url}`;

      patch("ImageUrl", url);
      setLocalPreview(""); // đã có URL thật, bỏ preview tạm
    } catch (err) {
      Modal.error({
        title: "Có lỗi khi upload ảnh",
        content: String(err?.message || err || "Không xác định"),
      });
    } finally {
      e.target.value = "";
    }
  };

  // Nút Lưu / Tạo: với trường hợp đang tạo mới và có TempImageFile -> sau khi tạo xong sẽ gọi upload
  const handleSave = async () => {
    const result = await onSubmit?.(); // parent trả về dữ liệu vừa tạo/cập nhật (nên return ChargerId khi create)

    // Nếu vừa tạo mới, có file tạm cần upload
    const createdId =
      result?.ChargerId ?? result?.chargerId ?? result?.id ?? null;
    if (createdId && data?.TempImageFile) {
      try {
        const fd = new FormData();
        fd.append("file", data.TempImageFile);
        fd.append("id", String(createdId));
        fd.append("chargerId", String(createdId));

        const res = await fetch(resolveUrl("/Chargers/image/upload"), {
          method: "POST",
          body: fd,
        });

        if (!res.ok) {
          console.warn("[Upload sau tạo] HTTP", res.status, await res.text());
          return;
        }

        const ct = res.headers.get("content-type") || "";
        let j = {};
        if (ct.includes("application/json")) j = await res.json();
        else {
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

        if (url) {
          if (url.startsWith("/")) url = `${getApiBase()}${url}`;
          patch("ImageUrl", url);
          setLocalPreview("");
          patch("TempImageFile", null);
        }
      } catch (e) {
        console.warn("Upload ảnh sau khi tạo thất bại:", e);
      }
    }
  };

  return (
    <Modal
      title={
        isEdit
          ? `🛠️ Sửa Bộ sạc (ID: ${data?.ChargerId ?? data?.chargerId ?? "?"})`
          : `➕ Thêm Bộ sạc (Trạm ID: ${currentStationId ?? "?"})`
      }
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <div className="form-grid">
        <input
          type="text"
          placeholder="Mã Bộ sạc (VD: C003) *"
          name="Code"
          value={data?.Code || ""}
          onChange={(e) => patch("Code", e.target.value)}
          className="input-field"
        />

        <select
          name="Type"
          value={data?.Type || "DC"}
          onChange={(e) => patch("Type", e.target.value)}
          className="input-field"
        >
          <option value="DC">⚡ DC (Sạc nhanh)</option>
          <option value="AC">🔌 AC (Sạc chậm)</option>
        </select>

        <input
          type="number"
          placeholder="Công suất (kW) *"
          name="PowerKw"
          value={data?.PowerKw ?? ""}
          onChange={(e) => patch("PowerKw", e.target.value)}
          className="input-field"
        />

        {/* Đồng bộ với BE: Online / Offline / OutOfOrder */}
        <select
          name="Status"
          value={data?.Status || "Online"}
          onChange={(e) => patch("Status", e.target.value)}
          className="input-field"
        >
          <option value="Online">🟢 Online</option>
          <option value="Offline">⚫ Offline</option>
          <option value="OutOfOrder">🟠 OutOfOrder</option>
        </select>

        <input
          type="date"
          placeholder="Ngày lắp đặt"
          name="InstalledAt"
          value={
            (data?.InstalledAt || "").split("T")[0] ||
            (data?.InstalledAt || "").split(" ")[0] ||
            ""
          }
          onChange={(e) => patch("InstalledAt", e.target.value)}
          className="input-field"
        />

        {/* Ảnh bộ sạc */}
        <div style={{ display: "grid", gap: 8 }}>
          {localPreview || data?.ImageUrl ? (
            <img
              src={localPreview || data.ImageUrl}
              alt="Charger"
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
      </div>

      <div className="modal-actions">
        <button onClick={onClose}>Hủy</button>
        <button className="save" onClick={handleSave}>
          {isEdit ? "Lưu" : "Tạo"}
        </button>
      </div>
    </Modal>
  );
}
