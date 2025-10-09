import React from "react";
import "./style/StationFilters.css";

export default function StationFilters({
  q, onQChange,
  cityOptions = [],
  powerOptions = [],
  statusOptions = [],
  connectorOptions = [],
  speedOptions = [],
  city, onCityChange,
  power, onPowerChange,
  status, onStatusChange,
  connector, onConnectorChange,
  speed, onSpeedChange,
  sortPrice, onSortPriceChange,
}) {
  // StationFilters.jsx (phần khung)
  // StationFilters.jsx (phần layout)
  return (
    <div className="sf-row">
      <input
        value={q}
        onChange={(e) => onQChange(e.target.value)}
        placeholder="🔍 Tìm theo tên hoặc địa chỉ…"
        className="sf-search"
      />

      <select className="sf-select" value={city} onChange={(e) => onCityChange(e.target.value)}>
        <option value="">Địa điểm</option>
        {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <select className="sf-select" value={power} onChange={(e) => onPowerChange(e.target.value)}>
        <option value="">Công suất</option>
        {powerOptions.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      <select className="sf-select" value={status} onChange={(e) => onStatusChange(e.target.value)}>
        <option value="">Trạng thái</option>
        {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <select className="sf-select" value={sortPrice} onChange={(e) => onSortPriceChange(e.target.value)}>
        <option value="">Xem theo giá</option>
        <option value="asc">Tăng dần</option>
        <option value="desc">Giảm dần</option>
      </select>

      <select className="sf-select" value={connector} onChange={(e) => onConnectorChange(e.target.value)}>
        <option value="">Cổng sạc</option>
        {connectorOptions.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <select className="sf-select" value={speed} onChange={(e) => onSpeedChange(e.target.value)}>
        <option value="">Tốc độ sạc</option>
        {speedOptions.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );


}
