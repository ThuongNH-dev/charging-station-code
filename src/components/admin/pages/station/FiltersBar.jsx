// src/components/station/FiltersBar.jsx
import React from "react";
import { PlusOutlined } from "@ant-design/icons";

export default function FiltersBar({
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
        style={{ maxWidth: "150px" }}
      >
        <option value="All">Tất cả trạng thái</option>
        <option value="Open">Open</option>
        <option value="Closed">Closed</option>
      </select>

      <input
        type="text"
        placeholder="Tìm kiếm trạm theo tên..."
        className="input-field"
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
      />

      <button className="btn primary" onClick={onAddStation}>
        <PlusOutlined /> Thêm trạm mới
      </button>
    </div>
  );
}
