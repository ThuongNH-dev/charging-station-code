import React from "react";

const ServiceFilterBar = ({
  serviceFilter,
  setServiceFilter,
  setActiveModal,
}) => {
  // serviceFilter nên có default: { search: "", category: "all", status: "all" }

  const handleChange = (key) => (e) => {
    setServiceFilter((prev) => ({ ...prev, [key]: e.target.value }));
  };

  // Khớp với API & bảng: Individual / Business
  const categories = [
    { value: "all", label: "Tất cả loại" },
    { value: "Individual", label: "Cá nhân" },
    { value: "Business", label: "Doanh nghiệp" },
  ];

  // Trạng thái hay dùng trong form/bảng: Active / Inactive
  const statuses = [
    { value: "all", label: "Tất cả trạng thái" },
    { value: "Active", label: "Đang hoạt động" },
    { value: "Inactive", label: "Ngừng hoạt động" },
  ];

  const handleClear = () =>
    setServiceFilter({ search: "", category: "all", status: "all" });

  return (
    <div className="filter-bar service-filter-bar">
      <span style={{ fontWeight: "bold" }}>Filter Dịch vụ:</span>

      {/* 1) Tìm theo tên gói */}
      <div className="filter-group">
        <div className="search-box">
          <input
            type="text"
            placeholder="Tìm gói dịch vụ..."
            value={serviceFilter.search}
            onChange={handleChange("search")}
          />
          <i className="fas fa-search search-icon"></i>
        </div>
      </div>

      {/* 2) Lọc theo loại (Individual/Business) */}
      <div className="filter-group">
        <select
          value={serviceFilter.category}
          onChange={handleChange("category")}
          className="filter-dropdown"
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* 3) Lọc theo trạng thái */}
      <div className="filter-group">
        <select
          value={serviceFilter.status}
          onChange={handleChange("status")}
          className="filter-dropdown"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* 4) Xóa lọc */}
      <button
        className="btn secondary"
        onClick={handleClear}
        style={{ marginLeft: 10 }}
      >
        Xóa lọc
      </button>
    </div>
  );
};

export default ServiceFilterBar;
