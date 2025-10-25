// src/components/UserManagement/ServiceFilterBar.jsx
import React from "react";

const ServiceFilterBar = ({
  serviceFilter,
  setServiceFilter,
  setActiveModal,
}) => {
  // Các tùy chọn cho Loại gói (Category) - Dựa trên dữ liệu API: Business, Individual
  const categoryOptions = [
    { value: "all", label: "Loại" },
    { value: "Individual", label: "Cá nhân" },
    { value: "Business", label: "Doanh nghiệp" },
  ];

  const handleSearchChange = (e) => {
    // Tìm kiếm theo Tên gói
    setServiceFilter((prev) => ({ ...prev, search: e.target.value }));
  };

  const handleCategoryChange = (e) => {
    // Lọc theo Loại (Category)
    setServiceFilter((prev) => ({ ...prev, category: e.target.value }));
  };

  return (
    <div
      className="filter-bar service-filter-bar"
      style={{
        display: "flex",
        gap: "10px",
        alignItems: "center",
        marginBottom: "20px",
      }}
    >
      {/* Nút "Filter: Tất cả" */}
      <span style={{ fontWeight: "bold" }}>Filter:</span>
      <button
        className="filter-button"
        style={{
          border: "1px solid #ccc",
          padding: "8px 12px",
          background: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        Tất cả
      </button>

      {/* Dropdown lọc Loại (Category) */}
      <select
        value={serviceFilter.category || "all"}
        onChange={handleCategoryChange}
        className="filter-input type-select"
        style={{
          padding: "8px 12px",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      >
        {categoryOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Input tìm kiếm theo Tên gói */}
      <input
        type="text"
        placeholder="Tên gói"
        value={serviceFilter.search || ""}
        onChange={handleSearchChange}
        className="filter-input search-input"
        style={{
          padding: "8px 12px",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      />

      {/* Nút Thêm gói dịch vụ */}
      <button
        className="btn primary add-button"
        onClick={() => setActiveModal("addService")}
        style={{
          background: "#007bff",
          color: "white",
          border: "none",
          padding: "10px 15px",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        + Thêm gói dịch vụ
      </button>

      {/* Nút Xuất CSV */}
      <button
        className="btn secondary csv-button"
        style={{
          border: "1px solid #ccc",
          padding: "10px 15px",
          background: "#f5f5f5",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Xuất CSV
      </button>
    </div>
  );
};

export default ServiceFilterBar;
