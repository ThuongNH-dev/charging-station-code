import React from "react";

const ServiceFilterBar = ({
  serviceFilter,
  setServiceFilter,
  setActiveModal,
}) => {
  const handleFilterChange = (key) => (e) => {
    setServiceFilter((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const categories = ["Insurance", "Maintenance", "Software", "Khác"];

  const handleClearFilters = () => {
    setServiceFilter({ search: "", category: "all" });
  };

  return (
    <div className="filter-bar service-filter-bar">
      <span style={{ fontWeight: "bold" }}>Filter Dịch vụ:</span>

      {/* 1. Lọc tìm kiếm */}
      <div className="filter-group">
        <div className="search-box">
          <input
            type="text"
            placeholder="Tìm gói dịch vụ..."
            value={serviceFilter.search}
            onChange={handleFilterChange("search")}
          />
          <i className="fas fa-search search-icon"></i>
        </div>
      </div>

      {/* 2. Lọc theo thể loại */}
      <div className="filter-group">
        <select
          value={serviceFilter.category}
          onChange={handleFilterChange("category")}
          className="filter-dropdown"
        >
          <option value="all">Tất cả Thể loại</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Nút xóa lọc */}
      <button
        className="btn secondary"
        onClick={handleClearFilters}
        style={{ marginLeft: "10px" }}
      >
        Xóa lọc
      </button>
    </div>
  );
};

export default ServiceFilterBar;
