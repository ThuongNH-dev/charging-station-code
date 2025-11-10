import React from "react";
import { PlusOutlined, SearchOutlined, FilterOutlined } from "@ant-design/icons";

export default function StationFiltersBar({
  statusFilter,
  onStatusFilterChange,
  searchTerm,
  onSearchTermChange,
  onAddStation,
}) {
  return (
    <div className="station-actions">
      <div className="filter-group">
        <FilterOutlined className="filter-icon" />
        <select
          className="input-field filter-select"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
        >
          <option value="All">Tất cả trạng thái</option>
          <option value="Open">🟢 Open</option>
          <option value="Closed">⚫ Closed</option>
          <option value="Maintenance">🟠 Maintenance</option>
        </select>
      </div>

      <div className="search-group">
        <SearchOutlined className="search-icon" />
        <input
          type="text"
          className="input-field search-input"
          placeholder="Tìm theo tên trạm…"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
        />
      </div>

      <button className="btn primary" onClick={onAddStation}>
        <PlusOutlined /> Thêm trạm mới
      </button>
    </div>
  );
}
