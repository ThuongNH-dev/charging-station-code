// src/pages/admin/UserManagement.jsx
import React, { useState, useMemo, useEffect } from "react";
import {
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SearchOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import "./UserManagement.css";

// =========================================================
// SERVICE PACKAGE FORM COMPONENT (Được nhúng trong file này)
// =========================================================

// Hàm giả định để chuẩn hóa dữ liệu từ mock data gốc (load data cho chế độ Edit)
const getInitialData = (modalId, servicePackages) => {
  if (!modalId || !modalId.includes("editService-")) return {};
  const pkgId = modalId.split("-")[1];
  const data = servicePackages.find((pkg) => pkg.id === pkgId);

  if (!data) return {};

  // Tách Giá và Đơn vị từ chuỗi ví dụ "199.000đ / tháng"
  const priceParts = data.price.split(" ");
  // Loại bỏ dấu chấm, chữ 'đ' và lấy phần số
  let priceValue = priceParts[0].replace(/\./g, "").replace("đ", "");
  let priceUnit = priceParts.slice(1).join(" ");
  priceUnit = priceUnit ? priceUnit.trim() : "/ tháng"; // Đảm bảo có đơn vị

  return {
    name: data.name,
    priceValue: priceValue,
    priceUnit: priceUnit,
    duration: data.duration,
    limit: data.limit,
    benefits: data.benefits,
    type: data.type,
    status: data.status,
  };
};

function ServicePackageForm({ activeModal, servicePackages }) {
  // Lấy dữ liệu ban đầu từ mock data, chỉ chạy lại khi activeModal thay đổi
  const initialData = useMemo(
    () => getInitialData(activeModal, servicePackages),
    [activeModal, servicePackages]
  );

  const [formData, setFormData] = useState({
    name: "",
    priceValue: "",
    priceUnit: "/ tháng",
    duration: "",
    limit: "",
    benefits: "",
    type: "Cá nhân",
    status: "Đang bán",
    // initialData sẽ ghi đè lên các giá trị mặc định nếu đang ở chế độ chỉnh sửa
    ...initialData,
  });

  // Effect để reset/set form data khi Modal thay đổi
  useEffect(() => {
    // Chỉ cần set lại data nếu đang là modal Thêm hoặc Chỉnh sửa gói dịch vụ
    if (activeModal === "addService" || activeModal.includes("editService")) {
      setFormData({
        name: "",
        priceValue: "",
        priceUnit: "/ tháng",
        duration: "",
        limit: "",
        benefits: "",
        type: "Cá nhân",
        status: "Đang bán",
        ...getInitialData(activeModal, servicePackages),
      });
    }
  }, [activeModal, servicePackages]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // const handleSubmit = () => { console.log(formData); /* Call API */ }

  return (
    <form className="service-package-form" onSubmit={(e) => e.preventDefault()}>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="name">Tên gói:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Ví dụ: Premium Plus"
          />
        </div>
        <div className="form-group">
          <label htmlFor="type">Loại áp dụng:</label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
          >
            <option value="Cá nhân">Cá nhân</option>
            <option value="Doanh nghiệp">Doanh nghiệp</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group price-group">
          <label htmlFor="priceValue">Giá (VNĐ):</label>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="number"
              id="priceValue"
              name="priceValue"
              value={formData.priceValue}
              onChange={handleChange}
              required
              placeholder="199000"
            />
            <select
              name="priceUnit"
              value={formData.priceUnit}
              onChange={handleChange}
              style={{ flex: "0 0 100px" }}
            >
              <option value="/ tháng">/ tháng</option>
              <option value="/ quý">/ quý</option>
              <option value="/ năm">/ năm</option>
              <option value="Một lần">Một lần</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="duration">Thời hạn:</label>
          <input
            type="text"
            id="duration"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            required
            placeholder="Ví dụ: 1 tháng hoặc Vô thời hạn"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="limit">Giới hạn:</label>
          <input
            type="text"
            id="limit"
            name="limit"
            value={formData.limit}
            onChange={handleChange}
            placeholder="Ví dụ: 200 kWh/tháng hoặc Không giới hạn"
          />
        </div>
        <div className="form-group">
          <label htmlFor="status">Trạng thái:</label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="Đang bán">Đang bán</option>
            <option value="Tạm ngưng">Tạm ngưng</option>
          </select>
        </div>
      </div>

      <div className="form-group full-width">
        <label htmlFor="benefits">Quyền lợi/Mô tả:</label>
        <textarea
          id="benefits"
          name="benefits"
          value={formData.benefits}
          onChange={handleChange}
          rows="3"
          placeholder="Mô tả chi tiết các quyền lợi đi kèm gói dịch vụ..."
        ></textarea>
      </div>
    </form>
  );
}
// =========================================================
// END SERVICE PACKAGE FORM
// =========================================================

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState("users");
  // Cập nhật trạng thái activeModal để lưu thao tác đang thực hiện
  const [activeModal, setActiveModal] = useState(null); // Ví dụ: "editUser", "deleteService", "addService"

  // ================= 1. STATE CHO BỘ LỌC ===================
  const [userFilter, setUserFilter] = useState({
    type: "all",
    search: "",
    searchField: "name",
    package: "all",
    status: "all",
  });

  const [vehicleFilter, setVehicleFilter] = useState({
    mainFilter: "all",
    brand: "all",
    model: "all",
    userId: "",
  });

  const [serviceFilter, setServiceFilter] = useState({
    status: "all",
    type: "all",
    name: "all",
  });

  // ================= MOCK DATA (Giữ nguyên) ===================
  const individualUsers = [
    {
      id: "U001",
      name: "Nguyễn Văn A",
      phone: "0912345678",
      email: "anva@example.com",
      accountType: "Cá nhân",
      service: "Trả sau",
      status: "Hoạt động",
      role: "Tài xế",
      balance: "500.000 VNĐ",
    },
    {
      id: "U002",
      name: "Trần Thị B",
      phone: "0987654321",
      email: "ttb@example.com",
      accountType: "Cá nhân",
      service: "Thuê bao",
      status: "Tạm khóa",
      role: "Tài xế",
      balance: "-25.000 VNĐ",
    },
  ];
  const companyUsers = [
    {
      id: "DN001",
      companyName: "Công ty ABC",
      representative: "Nguyễn Văn A",
      phone: "0912345678",
      email: "anva@ctya.vn",
      taxCode: "0123456789",
      size: "Vừa",
      technology: "Công nghệ",
      location: "Hà Nội",
      service: "Doanh nghiệp",
      status: "Hoạt động",
      role: "Quản lý",
      balance: "0 VNĐ",
      paymentStatus: "Đã thanh toán",
    },
    {
      id: "DN002",
      companyName: "CTCP XYZ",
      representative: "Trần Thị B",
      phone: "0987654321",
      email: "ttb@ctyxyz.vn",
      taxCode: "9876543210",
      size: "Lớn",
      technology: "Sản xuất",
      location: "TP. HCM",
      service: "Doanh nghiệp",
      status: "Hoạt động",
      role: "Quản lý",
      balance: "15.000.000 VNĐ",
      paymentStatus: "Chờ thanh toán",
    },
  ];
  const staffUsers = [
    {
      id: "S001",
      name: "Trần Thị B",
      staffId: "NV001",
      email: "ttb@gmail.com",
      phone: "091222333",
      role: "Quản lý trạm",
      station: "Trạm A",
      headquarters: "Trụ sở 1",
      startDate: "01/01/2024",
      status: "Đang làm",
    },
    {
      id: "S002",
      name: "Vũ Minh D",
      staffId: "NV002",
      email: "vumd@company.com",
      phone: "0903332211",
      role: "Nhân viên CSKH",
      station: "Trạm B",
      headquarters: "Trụ sở 2",
      startDate: "15/03/2024",
      status: "Ngừng kích hoạt",
    },
  ];
  const vehicleList = [
    {
      id: "V001",
      userId: "U001",
      brand: "VinFast",
      model: "VF 8",
      vehicleType: "SUV",
      batteryCapacity: "87.7 kWh",
      licensePlate: "30A-123.45",
      year: "2022",
      connector: "CCS Type 2",
    },
    {
      id: "V002",
      userId: "U002",
      brand: "Tesla",
      model: "Model Y",
      vehicleType: "SUV",
      batteryCapacity: "75 kWh",
      licensePlate: "29B-987.65",
      year: "2023",
      connector: "NACS",
    },
    {
      id: "V003",
      userId: "DN001",
      brand: "VinFast",
      model: "VF 9",
      vehicleType: "SUV",
      batteryCapacity: "123 kWh",
      licensePlate: "51K-111.22",
      year: "2024",
      connector: "CCS Type 2",
    },
  ];
  const servicePackages = [
    {
      id: "PKG001",
      name: "Basic",
      price: "199.000đ / tháng",
      duration: "1 tháng",
      benefits: "Truy cập trạm sạc cơ bản",
      limit: "50 kWh/tháng",
      type: "Cá nhân",
      status: "Đang bán",
    },
    {
      id: "PKG002",
      name: "Premium",
      price: "399.000đ / tháng",
      duration: "1 tháng",
      benefits: "Truy cập tất cả trạm sạc nhanh, ưu tiên hỗ trợ",
      limit: "200 kWh/tháng",
      type: "Cá nhân",
      status: "Đang bán",
    },
    {
      id: "PKG003",
      name: "Enterprise",
      price: "2.999.000đ / tháng",
      duration: "3 tháng",
      benefits: "Quản lý nhiều phương tiện, ưu đãi sạc doanh nghiệp",
      limit: "Không giới hạn",
      type: "Doanh nghiệp",
      status: "Tạm ngưng",
    },
  ];
  // =========================================================

  // ================= 2. HÀM XỬ LÝ LỌC DỮ LIỆU (USEMEMO) ===================

  const filterUserData = (
    data,
    userType,
    statusMap,
    serviceField = "service",
    statusField = "status"
  ) => {
    // 1. Lấy giá trị tìm kiếm
    const searchTerm = userFilter.search.toLowerCase().trim();

    // 2. Lọc theo Loại
    if (userFilter.type !== "all" && userFilter.type !== userType) {
      return [];
    }

    return data.filter((item) => {
      // 3. Lọc theo Trạng thái
      const currentStatus = item[statusField];
      const normalizedStatus = statusMap[currentStatus] || currentStatus;
      if (
        userFilter.status !== "all" &&
        userFilter.status !== normalizedStatus
      ) {
        return false;
      }

      // 4. Lọc theo Gói dịch vụ
      if (serviceField) {
        if (
          userFilter.package !== "all" &&
          item[serviceField] !== userFilter.package
        ) {
          return false;
        }
      }

      // 5. Lọc theo Search Term
      if (searchTerm) {
        const searchKey = userFilter.searchField;
        let searchableValue = "";

        if (item.hasOwnProperty(searchKey)) {
          searchableValue = String(item[searchKey]).toLowerCase();
        }
        // Xử lý trường hợp đặc biệt: Tìm kiếm theo 'name' trong bảng Doanh nghiệp (sử dụng representative)
        else if (
          userType === "company" &&
          searchKey === "name" &&
          item.representative
        ) {
          searchableValue = String(item.representative).toLowerCase();
        }
        // Xử lý trường hợp đặc biệt: Tìm kiếm theo 'name' trong bảng Cá nhân/Nhân viên (sử dụng tên)
        else if (
          (userType === "individual" || userType === "staff") &&
          searchKey === "name" &&
          item.name
        ) {
          searchableValue = String(item.name).toLowerCase();
        }
        // Nếu trường tìm kiếm không tồn tại, ta cho qua bước lọc tìm kiếm này
        else {
          if (searchTerm) {
            return false; // Nếu search có giá trị nhưng field không tồn tại, loại bỏ item
          }
        }

        if (searchableValue && !searchableValue.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });
  };

  // Trạng thái cho từng loại người dùng
  const individualStatusMap = { "Hoạt động": "active", "Tạm khóa": "inactive" };
  const staffStatusMap = {
    "Đang làm": "active",
    "Ngừng kích hoạt": "inactive",
  };

  // Lọc Người dùng Cá nhân
  const filteredIndividualUsers = useMemo(() => {
    return filterUserData(
      individualUsers,
      "individual",
      individualStatusMap,
      "service",
      "status"
    );
  }, [individualUsers, userFilter]);

  // Lọc Người dùng Doanh nghiệp
  const filteredCompanyUsers = useMemo(() => {
    return filterUserData(
      companyUsers,
      "company",
      individualStatusMap,
      "service",
      "status"
    );
  }, [companyUsers, userFilter]);

  // Lọc Người dùng Nhân viên
  const filteredStaffUsers = useMemo(() => {
    return filterUserData(staffUsers, "staff", staffStatusMap, null, "status");
  }, [staffUsers, userFilter]);

  // Lọc Thông số xe (Giữ nguyên)
  const filteredVehicles = useMemo(() => {
    return vehicleList.filter((vehicle) => {
      const searchTerm = vehicleFilter.userId.toLowerCase().trim();

      if (searchTerm && !vehicle.userId.toLowerCase().includes(searchTerm)) {
        return false;
      }
      if (
        vehicleFilter.brand !== "all" &&
        vehicleFilter.brand !== vehicle.brand
      ) {
        return false;
      }
      if (
        vehicleFilter.model !== "all" &&
        vehicleFilter.model !== vehicle.model
      ) {
        return false;
      }

      return true;
    });
  }, [vehicleList, vehicleFilter]);

  // Lọc Gói dịch vụ (Giữ nguyên)
  const filteredServices = useMemo(() => {
    return servicePackages.filter((pkg) => {
      if (
        serviceFilter.status !== "all" &&
        serviceFilter.status !== pkg.status
      ) {
        return false;
      }
      if (serviceFilter.type !== "all" && serviceFilter.type !== pkg.type) {
        return false;
      }
      if (serviceFilter.name !== "all" && serviceFilter.name !== pkg.name) {
        return false;
      }
      return true;
    });
  }, [servicePackages, serviceFilter]);

  // ================= 3. GIAO DIỆN CHÍNH (Áp dụng State và Logic Lọc) ===================
  return (
    <div className="user-page">
      <h2 className="admin-title">Người dùng & Dịch vụ</h2>

      {/* Thanh công cụ (Thanh Tab) */}
      <div className="user-actions">
        <button
          className={`btn ${activeTab === "users" ? "primary" : "secondary"}`}
          onClick={() => setActiveTab("users")}
        >
          Quản lý người dùng
        </button>
        <button
          className={`btn ${activeTab === "vehicle" ? "primary" : "secondary"}`}
          onClick={() => setActiveTab("vehicle")}
        >
          Quản lý thông số xe
        </button>
        <button
          className={`btn ${activeTab === "service" ? "primary" : "secondary"}`}
          onClick={() => setActiveTab("service")}
        >
          Gói dịch vụ
        </button>
      </div>

      {/* -------------------- Thanh Lọc/Tìm kiếm -------------------- */}

      {/* 1. Thanh lọc cho tab "Quản lý người dùng" */}
      {activeTab === "users" && (
        <div className="filter-bar">
          <div className="filter-group">
            <span className="filter-label">Filter:</span>
            {/* Dropdown "Tất cả" (Loại tài khoản) */}
            <select
              className="filter-dropdown"
              value={userFilter.type}
              onChange={(e) =>
                setUserFilter({ ...userFilter, type: e.target.value })
              }
            >
              <option value="all">Tất cả</option>
              <option value="individual">Cá nhân</option>
              <option value="company">Doanh nghiệp</option>
              <option value="staff">Nhân viên</option>
            </select>
            {/* Ô tìm kiếm */}
            <div className="search-box">
              <input
                type="text"
                placeholder="Tìm kiếm"
                value={userFilter.search}
                onChange={(e) =>
                  setUserFilter({ ...userFilter, search: e.target.value })
                }
              />
              <SearchOutlined className="search-icon" />
            </div>
            {/* Dropdown "Thông tin người dùng" (Trường tìm kiếm) */}
            <select
              className="filter-dropdown"
              value={userFilter.searchField}
              onChange={(e) =>
                setUserFilter({ ...userFilter, searchField: e.target.value })
              }
            >
              <option value="name">Thông tin người dùng</option>
              <option value="id">ID</option>
              <option value="phone">SĐT</option>
              <option value="email">Email</option>
              <option value="companyName">Tên công ty</option>
              <option value="staffId">Mã NV</option>
            </select>
          </div>
          <div className="filter-group-bottom">
            {/* Dropdown "Gói dịch vụ" */}
            <select
              className="filter-dropdown"
              value={userFilter.package}
              onChange={(e) =>
                setUserFilter({ ...userFilter, package: e.target.value })
              }
            >
              <option value="all">Gói dịch vụ</option>
              <option value="Trả sau">Trả sau</option>
              <option value="Thuê bao">Thuê bao</option>
              <option value="Doanh nghiệp">Doanh nghiệp</option>
            </select>
            {/* Dropdown "Trạng thái" */}
            <select
              className="filter-dropdown"
              value={userFilter.status}
              onChange={(e) =>
                setUserFilter({ ...userFilter, status: e.target.value })
              }
            >
              <option value="all">Trạng thái</option>
              <option value="active">Hoạt động/Đang làm</option>
              <option value="inactive">Tạm khóa/Ngừng</option>
            </select>
            {/* Nút Xuất CSV */}
            <button className="btn export">
              <DownloadOutlined /> Xuất CSV
            </button>
          </div>
        </div>
      )}

      {/* 2. Thanh lọc cho tab "Quản lý thông số xe" */}
      {activeTab === "vehicle" && (
        <div className="filter-bar vehicle-filter">
          <div className="filter-group">
            <span className="filter-label">Filter:</span>
            {/* Dropdown "Tất cả" */}
            <select
              className="filter-dropdown"
              value={vehicleFilter.mainFilter}
              onChange={(e) =>
                setVehicleFilter({
                  ...vehicleFilter,
                  mainFilter: e.target.value,
                })
              }
            >
              <option value="all">Tất cả</option>
              <option value="brand">Hãng</option>
              <option value="model">Dòng xe</option>
              <option value="connector">Đầu sạc</option>
            </select>
            {/* Dropdown "Hãng" */}
            <select
              className="filter-dropdown"
              value={vehicleFilter.brand}
              onChange={(e) =>
                setVehicleFilter({ ...vehicleFilter, brand: e.target.value })
              }
            >
              <option value="all">Hãng</option>
              <option value="VinFast">VinFast</option>
              <option value="Tesla">Tesla</option>
            </select>
            {/* Nút Xuất CSV */}
            <button className="btn export" style={{ marginLeft: "auto" }}>
              <DownloadOutlined /> Xuất CSV
            </button>
          </div>
          <div className="filter-group-bottom">
            {/* Ô tìm kiếm ID người dùng */}
            <div className="search-box small-search">
              <input
                type="text"
                placeholder="ID người dùng"
                value={vehicleFilter.userId}
                onChange={(e) =>
                  setVehicleFilter({ ...vehicleFilter, userId: e.target.value })
                }
              />
              <SearchOutlined className="search-icon" />
            </div>
            {/* Dropdown "Dòng xe" */}
            <select
              className="filter-dropdown"
              value={vehicleFilter.model}
              onChange={(e) =>
                setVehicleFilter({ ...vehicleFilter, model: e.target.value })
              }
            >
              <option value="all">Dòng xe</option>
              <option value="VF 8">VF 8</option>
              <option value="VF 9">VF 9</option>
              <option value="Model Y">Model Y</option>
            </select>
          </div>
        </div>
      )}

      {/* 3. Thanh lọc cho tab "Gói dịch vụ" */}
      {activeTab === "service" && (
        <div className="filter-bar service-filter">
          <div className="filter-group">
            <span className="filter-label">Filter:</span>
            {/* Dropdown "Trạng thái" */}
            <select
              className="filter-dropdown"
              value={serviceFilter.status}
              onChange={(e) =>
                setServiceFilter({ ...serviceFilter, status: e.target.value })
              }
            >
              <option value="all">Tất cả</option>
              <option value="Đang bán">Đang bán</option>
              <option value="Tạm ngưng">Tạm ngưng</option>
            </select>
            {/* Dropdown "Loại" (Cá nhân/Doanh nghiệp) */}
            <select
              className="filter-dropdown"
              value={serviceFilter.type}
              onChange={(e) =>
                setServiceFilter({ ...serviceFilter, type: e.target.value })
              }
            >
              <option value="all">Loại</option>
              <option value="Cá nhân">Cá nhân</option>
              <option value="Doanh nghiệp">Doanh nghiệp</option>
            </select>
            {/* Dropdown "Tên gói" */}
            <select
              className="filter-dropdown"
              value={serviceFilter.name}
              onChange={(e) =>
                setServiceFilter({ ...serviceFilter, name: e.target.value })
              }
            >
              <option value="all">Tên gói</option>
              <option value="Basic">Basic</option>
              <option value="Premium">Premium</option>
              <option value="Enterprise">Enterprise</option>
            </select>
            {/* Nút Thêm gói dịch vụ */}
            <button
              className="btn primary add-service"
              style={{ marginLeft: "10px" }}
              // THAY ĐỔI: Thêm onClick để mở modal
              onClick={() => setActiveModal("addService")}
            >
              <PlusOutlined /> Thêm gói dịch vụ
            </button>
            {/* Nút Xuất CSV */}
            <button className="btn export" style={{ marginLeft: "auto" }}>
              <DownloadOutlined /> Xuất CSV
            </button>
          </div>
        </div>
      )}

      {/* -------------------- QUẢN LÝ NGƯỜI DÙNG -------------------- */}
      {activeTab === "users" && (
        <>
          {/* BẢNG CÁ NHÂN */}
          {(userFilter.type === "all" || userFilter.type === "individual") && (
            <div className="user-table-section">
              <h3>
                Thông tin người dùng cá nhân ({filteredIndividualUsers.length}{" "}
                mục)
              </h3>
              {filteredIndividualUsers.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>ID</th>
                      <th>Tên</th>
                      <th>Số điện thoại</th>
                      <th>Email</th>
                      <th>Loại tài khoản</th>
                      <th>Gói dịch vụ</th>
                      <th>Trạng thái</th>
                      <th>Vai trò</th>
                      <th>Số dư tài khoản</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIndividualUsers.map((user, index) => (
                      <tr key={user.id}>
                        <td>{index + 1}</td>
                        <td>{user.id}</td>
                        <td>{user.name}</td>
                        <td>{user.phone}</td>
                        <td>{user.email}</td>
                        <td>{user.accountType}</td>
                        <td>{user.service}</td>
                        <td>
                          <span
                            className={`status ${
                              user.status === "Hoạt động"
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td>{user.role}</td>
                        <td>{user.balance}</td>
                        <td className="action-cell">
                          <button
                            className="icon-btn"
                            onClick={() =>
                              setActiveModal(`editUser-${user.id}`)
                            }
                          >
                            <EditOutlined />
                          </button>
                          <button
                            className="icon-btn"
                            onClick={() =>
                              setActiveModal(`deleteUser-${user.id}`)
                            }
                          >
                            <DeleteOutlined />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>
                  Không tìm thấy người dùng cá nhân nào phù hợp với bộ lọc.
                  {userFilter.search &&
                    ` (Tìm kiếm theo ${userFilter.searchField}: "${userFilter.search}")`}
                </p>
              )}
            </div>
          )}

          {/* BẢNG DOANH NGHIỆP */}
          {(userFilter.type === "all" || userFilter.type === "company") && (
            <div className="user-table-section">
              <h3>
                Thông tin người dùng doanh nghiệp ({filteredCompanyUsers.length}{" "}
                mục)
              </h3>
              {filteredCompanyUsers.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>ID</th>
                      <th>Công ty</th>
                      <th>Tên</th>
                      <th>SĐT</th>
                      <th>Email</th>
                      <th>MST</th>
                      <th>Quy mô</th>
                      <th>Công nghệ</th>
                      <th>Vị trí</th>
                      <th>Doanh nghiệp</th>
                      <th>Trạng thái</th>
                      <th>Vai trò</th>
                      <th>Số dư</th>
                      <th>Đã thanh toán</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanyUsers.map((c, index) => (
                      <tr key={c.id}>
                        <td>{index + 1}</td>
                        <td>{c.id}</td>
                        <td>{c.companyName}</td>
                        <td>{c.representative}</td>
                        <td>{c.phone}</td>
                        <td>{c.email}</td>
                        <td>{c.taxCode}</td>
                        <td>{c.size}</td>
                        <td>{c.technology}</td>
                        <td>{c.location}</td>
                        <td>{c.service}</td>
                        <td>
                          <span
                            className={`status ${
                              c.status === "Hoạt động" ? "active" : "inactive"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td>{c.role}</td>
                        <td>{c.balance}</td>
                        <td>{c.paymentStatus}</td>
                        <td className="action-cell">
                          <button
                            className="icon-btn"
                            onClick={() =>
                              setActiveModal(`editCompany-${c.id}`)
                            }
                          >
                            <EditOutlined />
                          </button>
                          <button
                            className="icon-btn"
                            onClick={() =>
                              setActiveModal(`deleteCompany-${c.id}`)
                            }
                          >
                            <DeleteOutlined />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>
                  Không tìm thấy người dùng doanh nghiệp nào phù hợp với bộ lọc.
                  {userFilter.search &&
                    ` (Tìm kiếm theo ${userFilter.searchField}: "${userFilter.search}")`}
                </p>
              )}
            </div>
          )}

          {/* BẢNG NHÂN VIÊN */}
          {(userFilter.type === "all" || userFilter.type === "staff") && (
            <div className="user-table-section">
              <h3>
                Thông tin người dùng nhân viên ({filteredStaffUsers.length} mục)
              </h3>
              {filteredStaffUsers.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Họ tên</th>
                      <th>Mã NV</th>
                      <th>Email</th>
                      <th>SĐT</th>
                      <th>Chức vụ</th>
                      <th>Trạm</th>
                      <th>Trụ sở</th>
                      <th>Ngày bắt đầu</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaffUsers.map((s, index) => (
                      <tr key={s.id}>
                        <td>{index + 1}</td>
                        <td>{s.name}</td>
                        <td>{s.staffId}</td>
                        <td>{s.email}</td>
                        <td>{s.phone}</td>
                        <td>{s.role}</td>
                        <td>{s.station}</td>
                        <td>{s.headquarters}</td>
                        <td>{s.startDate}</td>
                        <td>
                          <span
                            className={`status ${
                              s.status === "Đang làm" ? "active" : "inactive"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="action-cell">
                          <button
                            className="icon-btn"
                            onClick={() => setActiveModal(`editStaff-${s.id}`)}
                          >
                            <EditOutlined />
                          </button>
                          <button
                            className="icon-btn"
                            onClick={() =>
                              setActiveModal(`deleteStaff-${s.id}`)
                            }
                          >
                            <DeleteOutlined />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>
                  Không tìm thấy nhân viên nào phù hợp với bộ lọc.
                  {userFilter.search &&
                    ` (Tìm kiếm theo ${userFilter.searchField}: "${userFilter.search}")`}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* -------------------- THÔNG SỐ XE -------------------- */}
      {activeTab === "vehicle" && (
        <div className="user-table-section">
          <h3>Danh sách thông số xe ({filteredVehicles.length} mục)</h3>
          {filteredVehicles.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>ID Xe</th>
                  <th>ID Người dùng</th>
                  <th>Hãng</th>
                  <th>Dòng xe</th>
                  <th>Loại xe</th>
                  <th>Dung lượng pin</th>
                  <th>Biển số</th>
                  <th>Năm</th>
                  <th>Đầu sạc</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((v, index) => (
                  <tr key={v.id}>
                    <td>{index + 1}</td>
                    <td>{v.id}</td>
                    <td>{v.userId}</td>
                    <td>{v.brand}</td>
                    <td>{v.model}</td>
                    <td>{v.vehicleType}</td>
                    <td>{v.batteryCapacity}</td>
                    <td>{v.licensePlate}</td>
                    <td>{v.year}</td>
                    <td>{v.connector}</td>
                    <td className="action-cell">
                      <button
                        className="icon-btn"
                        onClick={() => setActiveModal(`editVehicle-${v.id}`)}
                      >
                        <EditOutlined />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => setActiveModal(`deleteVehicle-${v.id}`)}
                      >
                        <DeleteOutlined />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Không tìm thấy thông số xe nào phù hợp với bộ lọc.</p>
          )}
        </div>
      )}

      {/* -------------------- GÓI DỊCH VỤ -------------------- */}
      {activeTab === "service" && (
        <div className="user-table-section">
          <h3>Danh sách gói dịch vụ ({filteredServices.length} mục)</h3>
          {filteredServices.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên gói</th>
                  <th>Giá</th>
                  <th>Thời hạn</th>
                  <th>Giới hạn</th>
                  <th>Quyền lợi</th>
                  <th>Loại</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((pkg) => (
                  <tr key={pkg.id}>
                    <td>{pkg.id}</td>
                    <td>{pkg.name}</td>
                    <td>{pkg.price}</td>
                    <td>{pkg.duration}</td>
                    <td>{pkg.limit}</td>
                    <td>{pkg.benefits}</td>
                    <td>{pkg.type}</td>
                    <td>
                      <span
                        className={`status ${
                          pkg.status === "Đang bán" ? "active" : "inactive"
                        }`}
                      >
                        {pkg.status}
                      </span>
                    </td>
                    <td className="action-cell">
                      <button
                        className="icon-btn"
                        onClick={() => setActiveModal(`editService-${pkg.id}`)}
                      >
                        <EditOutlined />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() =>
                          setActiveModal(`deleteService-${pkg.id}`)
                        }
                      >
                        <DeleteOutlined />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Không tìm thấy gói dịch vụ nào phù hợp với bộ lọc.</p>
          )}
        </div>
      )}

      {/* -------------------- MODAL (PHẦN ĐÃ CẬP NHẬT) -------------------- */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          {/* Ngăn chặn sự kiện click từ Modal Box lan ra Modal Overlay */}
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            {/* 1. Modal THÊM/CHỈNH SỬA GÓI DỊCH VỤ */}
            {(activeModal === "addService" ||
              activeModal.includes("editService")) && (
              <>
                <h3>
                  {activeModal === "addService"
                    ? "Thêm gói dịch vụ mới"
                    : `Chỉnh sửa Gói dịch vụ ID: ${activeModal.split("-")[1]}`}
                </h3>

                <div className="modal-content">
                  {/* Tích hợp ServicePackageForm */}
                  <ServicePackageForm
                    activeModal={activeModal}
                    servicePackages={servicePackages}
                  />
                </div>
                {/* END FORM */}

                <div className="modal-actions">
                  <button className="btn primary">
                    {activeModal === "addService" ? "Thêm mới" : "Lưu thay đổi"}
                  </button>
                  <button
                    className="btn secondary"
                    onClick={() => setActiveModal(null)}
                  >
                    Hủy
                  </button>
                </div>
              </>
            )}

            {/* 2. Modal CHỈNH SỬA CHUNG (Người dùng/Xe) */}
            {activeModal.includes("edit") &&
              !activeModal.includes("editService") && (
                <>
                  <h3>
                    Chỉnh sửa: {activeModal.split("-")[0].replace("edit", "")}{" "}
                    ID: {activeModal.split("-")[1]}
                  </h3>
                  <div className="modal-content">
                    <p>
                      Đây là form placeholder cho chức năng **Chỉnh sửa**{" "}
                      {activeModal.split("-")[0].replace("edit", "")}.
                    </p>
                  </div>
                  <div className="modal-actions">
                    <button className="btn primary">Lưu</button>
                    <button
                      className="btn secondary"
                      onClick={() => setActiveModal(null)}
                    >
                      Hủy
                    </button>
                  </div>
                </>
              )}

            {/* 3. Modal XÓA CHUNG */}
            {activeModal.includes("delete") && (
              <>
                <h3>Xác nhận xóa</h3>
                <p>
                  Bạn có chắc chắn muốn xóa mục này (
                  {activeModal.split("-")[0].replace("delete", "")} ID:{" "}
                  <strong>{activeModal.split("-")[1]}</strong>)? Thao tác này
                  không thể hoàn tác.
                </p>
                <div className="modal-actions">
                  <button className="btn danger">Xóa</button>
                  <button
                    className="btn secondary"
                    onClick={() => setActiveModal(null)}
                  >
                    Hủy
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
