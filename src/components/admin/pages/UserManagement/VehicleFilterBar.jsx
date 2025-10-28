// src/pages/components/VehicleFilterBar.jsx

import React from "react";

const VehicleFilterBar = ({
  vehicleFilter,
  setVehicleFilter,
  filterOptions,
}) => {
  // ✅ SỬ DỤNG LỌC VÀ OPTIONAL CHAINING ĐỂ ĐẢM BẢO TÍNH TOÀN VẸN CỦA KEY VÀ VALUE
  const carMakers = (filterOptions?.carMakers || []).filter(
    (item) => item && typeof item === "string" && item.trim() !== ""
  ); // Lọc bỏ null/undefined/chuỗi rỗng
  const models = (filterOptions?.models || []).filter(
    (item) => item && typeof item === "string" && item.trim() !== ""
  ); // Lọc bỏ null/undefined/chuỗi rỗng
  const ownerTypes = filterOptions?.ownerTypes || ["Cá nhân", "Công ty"]; // Dữ liệu này thường đã sạch // Hàm chung để cập nhật filter state (Không thay đổi)

  const handleFilterChange = (key) => (e) => {
    setVehicleFilter((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));
  }; // Hàm riêng cho việc tìm kiếm ID người dùng (Owner ID) (Không thay đổi)

  const handleOwnerIdSearch = (e) => {
    setVehicleFilter((prev) => ({
      ...prev,
      ownerId: e.target.value.trim(),
    }));
  }; // Hàm làm sạch bộ lọc (Không thay đổi)

  const handleClearFilters = () => {
    setVehicleFilter({
      ownerType: "all",
      carMaker: "all",
      model: "all",
      ownerId: "",
    });
  }; // Hàm xử lý nút 'Xuất CSV' (Không thay đổi)

  const handleExportCSV = () => {
    alert(
      "Đã nhấn nút Xuất CSV cho thông số xe. Cần triển khai logic xuất dữ liệu."
    );
  };

  return (
    <div className="filter-bar vehicle-filter-bar">
      <span style={{ fontWeight: "bold" }}>Filter:</span>
      {/* 1. Loại chủ sở hữu (Filter: Tất cả) */}
      <div className="filter-group">
        <select
          value={vehicleFilter.ownerType}
          onChange={handleFilterChange("ownerType")}
          className="filter-dropdown"
        >
          <option value="all">Tất cả</option>
          {ownerTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      {/* 2. Hãng (Car Maker) */}
      <div className="filter-group">
        <select
          value={vehicleFilter.carMaker}
          onChange={handleFilterChange("carMaker")}
          className="filter-dropdown"
        >
          <option value="all">Hãng</option>
          {carMakers.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </div>
      {/* 3. ID Chủ sở hữu (ID Người dùng) */}
      <div className="filter-group">
        <div className="search-box">
          <input
            type="text"
            placeholder="ID người dùng"
            value={vehicleFilter.ownerId}
            onChange={handleOwnerIdSearch}
          />
          <i className="fas fa-search search-icon"></i>
        </div>
      </div>
      {/* 4. Dòng xe (Model) */}
      <div className="filter-group">
        <select
          value={vehicleFilter.model}
          onChange={handleFilterChange("model")}
          className="filter-dropdown"
        >
          <option value="all">Dòng xe</option>
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>
      {/* Nút Xóa lọc */}
      <button
        className="btn secondary"
        onClick={handleClearFilters}
        style={{ marginLeft: "10px" }}
      >
        Xóa lọc
      </button>
      {/* Nút Xuất CSV */}
      <button
        className="btn export"
        onClick={handleExportCSV}
        style={{ marginLeft: "auto" }}
      >
        Xuất CSV
      </button>
    </div>
  );
};

export default VehicleFilterBar;
