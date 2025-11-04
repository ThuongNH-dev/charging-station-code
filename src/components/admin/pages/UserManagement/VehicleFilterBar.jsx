// src/pages/components/VehicleFilterBar.jsx
import React from "react";

const VehicleFilterBar = ({
  vehicleFilter,
  setVehicleFilter,
  filterOptions,
}) => {
  // Danh sách options đã làm sạch
  const carMakers = (filterOptions?.carMakers || []).filter(
    (item) => item && typeof item === "string" && item.trim() !== ""
  );
  const models = (filterOptions?.models || []).filter(
    (item) => item && typeof item === "string" && item.trim() !== ""
  );
  const ownerTypes = filterOptions?.ownerTypes || ["Cá nhân", "Công ty"];

  // Cập nhật filter state
  const handleFilterChange = (key) => (e) => {
    setVehicleFilter((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleOwnerIdSearch = (e) => {
    setVehicleFilter((prev) => ({ ...prev, ownerId: e.target.value.trim() }));
  };

  const handleClearFilters = () => {
    setVehicleFilter({
      ownerType: "all",
      carMaker: "all",
      model: "all",
      ownerId: "",
    });
  };

  return (
    <div className="filter-bar vehicle-filter-bar">
      <span style={{ fontWeight: "bold" }}>Filter:</span>

      {/* 1. Loại chủ sở hữu */}
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

      {/* 3. ID Chủ sở hữu */}
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

      {/* 4. Dòng xe */}
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
      {/* ❌ ĐÃ GỠ nút Xuất CSV ở đây. Dùng nút global bên ngoài. */}
    </div>
  );
};

export default VehicleFilterBar;
