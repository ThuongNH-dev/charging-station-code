import React, { useEffect, useState } from "react";
import { Modal, Select, Input, message } from "antd";
import { stationApi } from "../../../../../api/stationApi";

// Giá trị đặc biệt cho tùy chọn "Khác…"
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
  const [loadingRules, setLoadingRules] = useState(false);

  const [connectorTypes, setConnectorTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [showOther, setShowOther] = useState(false);

  useEffect(() => {
    if (!open) return;

    // 1) Load Pricing Rules (defensive)
    (async () => {
      setLoadingRules(true);
      try {
        const list = stationApi.getPricingRules
          ? await stationApi.getPricingRules()
          : [];
        setRules(Array.isArray(list) ? list : []);
      } catch (e) {
        console.warn(e);
        message.error("Không tải được danh sách PricingRule");
      } finally {
        setLoadingRules(false);
      }
    })();

    // 2) Load Connector Types (defensive)
    (async () => {
      setLoadingTypes(true);
      try {
        const list = stationApi.getConnectorTypes
          ? await stationApi.getConnectorTypes()
          : [];
        setConnectorTypes(Array.isArray(list) ? list : []);
      } catch (e) {
        console.warn(e);
        message.error("Không tải được danh sách loại cổng");
      } finally {
        setLoadingTypes(false);
      }
    })();
  }, [open]);

  const patch = (name, value) => onChange({ target: { name, value } });

  // Khi list về, nếu ConnectorType hiện tại không có trong list => bật ô "Khác…"
  useEffect(() => {
    const cur = (data?.ConnectorType || "").trim();
    if (!cur) return setShowOther(false);
    if (!connectorTypes?.length) return;
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
          ? `Sửa Cổng (ID: ${data?.PortId})`
          : `Thêm Cổng Sạc (Trạm ${ids?.stationId} - Bộ sạc ${ids?.chargerId})`
      }
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      {/* Trường chỉ dùng khi thêm mới */}
      {!isEdit && (
        <Input
          placeholder="Mã Cổng (VD: P005, tùy chọn)"
          name="Code"
          value={data?.Code || ""}
          onChange={(e) => patch("Code", e.target.value)}
          style={{ marginBottom: 8 }}
        />
      )}

      {/* Loại cổng (động + Khác…) - dùng chung cho cả thêm & sửa */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
          Loại cổng
        </label>
        <Select
          style={{ width: "100%" }}
          placeholder="Chọn loại cổng"
          loading={loadingTypes}
          options={connectorOptions}
          value={selectedConnectorValue}
          onChange={handleSelectConnectorType}
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? "")
              .toString()
              .toLowerCase()
              .includes(input.toLowerCase())
          }
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

      {/* Max power */}
      <Input
        type="number"
        placeholder="Công suất Tối đa (MaxPowerKw, kW) *"
        name="MaxPowerKw"
        value={data?.MaxPowerKw || ""}
        onChange={(e) => patch("MaxPowerKw", e.target.value)}
        style={{ marginBottom: 8 }}
      />

      {/* Status */}
      <Select
        style={{ width: "100%", marginBottom: 8 }}
        name="Status"
        value={data?.Status || "Available"}
        onChange={(val) => patch("Status", val)}
        options={[
          { value: "Available", label: "Sẵn sàng" },
          { value: "Maintenance", label: "Bảo trì" },
          { value: "Busy", label: "Đang bận" },
        ]}
      />

      {/* ✨ PricingRule cho PORT */}
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
          loading={loadingRules}
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
