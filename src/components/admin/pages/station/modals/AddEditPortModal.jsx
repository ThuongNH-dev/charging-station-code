import React, { useEffect, useState } from "react";
import { Modal, Select, Input, message } from "antd";
import { stationApi } from "../../../../../api/stationApi";

const OTHER_VALUE = "__OTHER__";

export default function AddEditPortModal({
  open,
  onClose,
  isEdit,
  data,
  onChange,
  onSubmit,
  ids, // { stationId, chargerId }
}) {
  const [rules, setRules] = useState([]);
  const [connectorTypes, setConnectorTypes] = useState([]);
  const [showOther, setShowOther] = useState(false);

  const patch = (name, value) => onChange({ target: { name, value } });

  // Load PricingRule và ConnectorType
  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const list = stationApi.getPricingRules
          ? await stationApi.getPricingRules()
          : [];
        setRules(Array.isArray(list) ? list : []);
      } catch {
        message.error("Không tải được danh sách PricingRule");
      }
    })();

    (async () => {
      try {
        const list = stationApi.getConnectorTypes
          ? await stationApi.getConnectorTypes()
          : [];
        setConnectorTypes(Array.isArray(list) ? list : []);
      } catch {
        message.error("Không tải được danh sách loại cổng");
      }
    })();
  }, [open]);

  // Bật input “Khác...” nếu loại cổng không nằm trong danh sách
  useEffect(() => {
    const cur = (data?.ConnectorType || "").trim();
    if (!cur) return setShowOther(false);
    const inList = connectorTypes.some(
      (t) => String(t).toLowerCase() === cur.toLowerCase()
    );
    setShowOther(!inList);
  }, [connectorTypes, data?.ConnectorType]);

  const connectorOptions = (connectorTypes || [])
    .map((t) => ({ value: t, label: t }))
    .concat([{ value: OTHER_VALUE, label: "Khác…" }]);

  const selectedConnectorValue = (() => {
    const cur = (data?.ConnectorType || "").trim();
    if (!cur) return showOther ? OTHER_VALUE : undefined;
    const inList = connectorTypes.some(
      (t) => String(t).toLowerCase() === cur.toLowerCase()
    );
    return inList ? cur : OTHER_VALUE;
  })();

  const handleSelectConnectorType = (val) => {
    if (val === OTHER_VALUE) {
      setShowOther(true);
      patch("ConnectorType", "");
    } else {
      setShowOther(false);
      patch("ConnectorType", val);
    }
  };

  return (
    <Modal
      title={
        isEdit
          ? `🛠️ Sửa Cổng (ID: ${data?.PortId})`
          : `➕ Thêm Cổng (Trạm ${ids?.stationId} - Bộ sạc ${ids?.chargerId})`
      }
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      {!isEdit && (
        <Input
          placeholder="Mã Cổng (VD: P005, tùy chọn)"
          name="Code"
          value={data?.Code || ""}
          onChange={(e) => patch("Code", e.target.value)}
          style={{ marginBottom: 8 }}
        />
      )}

      {/* Loại cổng */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
          Loại cổng
        </label>
        <Select
          style={{ width: "100%" }}
          placeholder="Chọn loại cổng"
          options={connectorOptions}
          value={selectedConnectorValue}
          onChange={handleSelectConnectorType}
          showSearch
        />
        {showOther && (
          <Input
            style={{ marginTop: 8 }}
            placeholder="Nhập loại cổng (VD: NACS, MCS, ...)"
            value={data?.ConnectorType || ""}
            onChange={(e) => patch("ConnectorType", e.target.value)}
          />
        )}
      </div>

      {/* MaxPower */}
      <Input
        type="number"
        placeholder="Công suất Tối đa (kW)"
        name="MaxPowerKw"
        value={data?.MaxPowerKw || ""}
        onChange={(e) => patch("MaxPowerKw", e.target.value)}
        style={{ marginBottom: 8 }}
      />

      {/* ✅ Đồng bộ trạng thái Port với BE */}
      <Select
        style={{ width: "100%", marginBottom: 8 }}
        name="Status"
        value={data?.Status || "Available"}
        onChange={(val) => patch("Status", val)}
        options={[
          { value: "Available", label: "🟢 Available (Sẵn sàng)" },
          { value: "Reserved", label: "🟡 Reserved (Đã đặt trước)" },
          { value: "Occupied", label: "🔴 Occupied (Đang sạc)" },
          { value: "Disabled", label: "⚫ Disabled (Không hoạt động)" },
        ]}
      />

      {/* Pricing Rule */}
      <div style={{ marginTop: 8 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
          PricingRule (tùy chọn)
        </label>
        <Select
          allowClear
          style={{ width: "100%" }}
          placeholder="Chọn Quy tắc giá áp dụng cho cổng"
          value={data?.PricingRuleId ?? null}
          onChange={(val) => patch("PricingRuleId", val ?? null)}
          options={(rules || []).map((r) => ({
            value: r.PricingRuleId,
            label: `${r.ChargerType || "?"} • ${r.PowerKw ?? 0}kW • ${
              r.TimeRange || "—"
            } • ${Number(r.PricePerKwh || 0).toLocaleString("vi-VN")}đ/kWh`,
          }))}
        />
      </div>

      <div className="modal-actions" style={{ marginTop: 16 }}>
        <button onClick={onClose}>Hủy</button>
        <button className="save" onClick={onSubmit}>
          {isEdit ? "Lưu" : "Tạo"}
        </button>
      </div>
    </Modal>
  );
}
