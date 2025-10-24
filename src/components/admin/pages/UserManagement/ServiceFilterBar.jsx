// src/components/UserManagement/ServiceFilterBar.jsx

import React from "react";

const ServiceFilterBar = ({ serviceFilter, setServiceFilter }) => {
  // Các tùy chọn cho dropdown Trạng thái (Status) - Phải khớp với dữ liệu Status trả về từ API
  const statusOptions = [
    { value: "all", label: "Tất cả trạng thái" },
    { value: "Đang bán", label: "Đang bán" },
    { value: "Ngừng bán", label: "Ngừng bán" },
  ];

  const handleSearchChange = (e) => {
    // Cập nhật trường 'search' trong state serviceFilter
    setServiceFilter((prev) => ({ ...prev, search: e.target.value }));
  };

  const handleStatusChange = (e) => {
    // Cập nhật trường 'status' trong state serviceFilter
    setServiceFilter((prev) => ({ ...prev, status: e.target.value }));
  };

  return (
    <div className="filter-bar service-filter-bar">
      {/* Input tìm kiếm */}
      <input
        type="text"
        placeholder="Tìm kiếm theo tên gói..."
        value={serviceFilter.search}
        onChange={handleSearchChange}
        className="filter-input search-input"
      />

      {/* Dropdown lọc Trạng thái */}
      <select
        value={serviceFilter.status}
        onChange={handleStatusChange}
        className="filter-input status-select"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ServiceFilterBar;
