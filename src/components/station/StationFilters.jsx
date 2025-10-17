import React from "react";
import "./style/StationFilters.css";

const noop = () => { };

export default function StationFilters({
  // dữ liệu & handler (đặt default để khỏi lỗi khi không truyền)
  q = "", onQChange = noop,
  cityOptions = [],
  powerOptions = [],
  statusOptions = [],
  connectorOptions = [],
  speedOptions = [],
  city = "", onCityChange = noop,
  power = "", onPowerChange = noop,
  status = "", onStatusChange = noop,
  connector = "", onConnectorChange = noop,
  speed = "", onSpeedChange = noop,
  sortPrice = "", onSortPriceChange = noop,

  // mới thêm
  context = "list", // "list" | "detail" | ...
  visible = {},     // { search, city, power, status, sortPrice, connector, speed }
}) {
  const defaults = {
    search: true,
    city: true,
    power: true,
    status: true,
    sortPrice: true,
    connector: true,
    speed: true,
  };
  const v = { ...defaults, ...visible };

  const placeholder =
    context === "detail"
      ? "🔍 Tìm trụ theo tên/cổng…"
      : "🔍 Tìm theo tên hoặc địa chỉ…";

  return (
    <div className="sf-row">
      {v.search && (
        <input
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder={placeholder}
          className="sf-search"
        />
      )}

      {v.city && (
        <select className="sf-select" value={city} onChange={(e) => onCityChange(e.target.value)}>
          <option value="">Địa điểm</option>
          {cityOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}

      {v.power && (
        <select className="sf-select" value={power} onChange={(e) => onPowerChange(e.target.value)}>
          <option value="">Công suất</option>
          {powerOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      )}

      {v.status && (
        <select className="sf-select" value={status} onChange={(e) => onStatusChange(e.target.value)}>
          <option value="">Trạng thái</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}

      {v.sortPrice && (
        <select className="sf-select" value={sortPrice} onChange={(e) => onSortPriceChange(e.target.value)}>
          <option value="">Xem theo giá</option>
          <option value="asc">Tăng dần</option>
          <option value="desc">Giảm dần</option>
        </select>
      )}

      {v.connector && (
        <select className="sf-select" value={connector} onChange={(e) => onConnectorChange(e.target.value)}>
          <option value="">Cổng sạc</option>
          {connectorOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}

      {v.speed && (
        <select className="sf-select" value={speed} onChange={(e) => onSpeedChange(e.target.value)}>
          <option value="">Tốc độ sạc</option>
          {speedOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}
    </div>
  );
}
