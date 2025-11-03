import React from "react";
import { PlusOutlined } from "@ant-design/icons";

export default function StationFiltersBar({
  statusFilter,
  onStatusFilterChange,
  searchTerm,
  onSearchTermChange,
  onAddStation,
}) {
  return (
    <div className="station-actions">
      <select
        className="input-field"
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        style={{ maxWidth: 160 }}
      >
        <option value="All">Tất cả trạng thái</option>
        <option value="Open">🟢 Open</option>
        <option value="Closed">⚫ Closed</option>
        <option value="Maintenance">🟠 Maintenance</option>
      </select>

      <input
        type="text"
        className="input-field"
        placeholder="Tìm theo tên trạm…"
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
      />

      <button className="btn primary" onClick={onAddStation}>
        <PlusOutlined /> Thêm trạm mới
      </button>
    </div>
  );
}
