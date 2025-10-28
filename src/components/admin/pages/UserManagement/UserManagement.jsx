import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PlusOutlined } from "@ant-design/icons";
import "../UserManagement.css";
import { userApi } from "../../../../api/userApi";
import UserTables from "./Usertables";
import VehicleTable from "./VehicleTable";
import ServiceTable from "./ServiceTable";
import AdminModals from "./Modals/AdminModals";
import ServiceFilterBar from "./ServiceFilterBar";
import VehicleFilterBar from "./VehicleFilterBar";

const useUserServicesHook = () => {
  const [allAccounts, setAllAccounts] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [servicePackages, setServicePackages] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // FILE: UserManagement.js (Trong useUserServicesHook)

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [accounts, vehicles, services, subscriptionsData] =
        await Promise.all([
          userApi.fetchAllUsers(),
          userApi.fetchAllVehicles(),
          userApi.fetchAllServicePackages(),
          userApi.fetchAllSubscriptions(),
        ]); // 1. Tạo Map tên gói từ ID gói dịch vụ (services)

      const serviceMap = (services || []).reduce((map, pkg) => {
        map[pkg.id] = pkg.planName;
        return map;
      }, {}); // 2. Tạo Map Gói dịch vụ hiện tại của từng người dùng

      const userPackageMap = (subscriptionsData || []).reduce((map, sub) => {
        // Lấy tên gói từ serviceMap, nếu không có ID gói thì kiểm tra trường GoiDichVu (nếu có)
        const packageName =
          serviceMap[sub.servicePackageId] || sub.GoiDichVu || null;
        if (packageName) {
          map[sub.userId] = packageName;
        }
        return map;
      }, {}); // 3. Gắn tên gói dịch vụ vào đối tượng người dùng

      const accountsWithPackage = (accounts || []).map((user) => {
        // ✅ SỬA: Gán "Chưa đăng ký" thay vì null nếu không tìm thấy gói
        const packageName = userPackageMap[user.id] || "Chưa đăng ký";
        return {
          ...user,
          servicePackageName: packageName,
        };
      }); // Cập nhật state với dữ liệu đã xử lý

      setAllAccounts(accountsWithPackage);
      setAllVehicles(vehicles || []);
      setServicePackages(services || []);
      setSubscriptions(subscriptionsData || []);
    } catch (err) {
      console.error("❌ Lỗi khi load dữ liệu:", err);
      setError(err.message || "Không thể tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdate = async (apiFunc, id, data, successMsg, role) => {
    if (typeof apiFunc !== "function") {
      console.error("❌ apiFunc không phải là function", apiFunc);
      return false;
    }
    setIsLoading(true);
    setError(null);
    try {
      if (id) await apiFunc(id, data, role);
      else await apiFunc(data);
      alert(successMsg || "Cập nhật thành công!");
      await fetchData();
      return true;
    } catch (err) {
      console.error("❌ Lỗi xử lý:", err);
      setError(err.message);
      alert(`Lỗi: ${err.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    allAccounts,
    allVehicles,
    servicePackages,
    subscriptions,
    isLoading,
    error,
    fetchData,
    // ✅ Truyền đầy đủ tất cả CRUD
    updateUser: (
      id,
      data,
      role // ✅ BỔ SUNG tham số 'role'
    ) =>
      handleUpdate(
        userApi.updateUser,
        id,
        data,
        "Đã cập nhật người dùng.",
        role
      ), // ✅ TRUYỀN 'role' vào handleUpdate

    updateUserStatus: (id, data) =>
      handleUpdate(
        userApi.updateUserStatus,
        id,
        data,
        "Đã cập nhật trạng thái người dùng."
      ),
    deleteUser: (id) =>
      handleUpdate(userApi.deleteUser, id, null, "Đã xóa người dùng."),
    createServicePackage: (data) =>
      handleUpdate(
        userApi.createServicePackage,
        null,
        data,
        "Đã thêm mới gói dịch vụ."
      ),
    updateServicePackage: (id, data) =>
      handleUpdate(
        userApi.updateServicePackage,
        id,
        data,
        "Đã cập nhật gói dịch vụ."
      ),
    deleteServicePackage: (id) =>
      handleUpdate(
        userApi.deleteServicePackage,
        id,
        null,
        "Đã xóa gói dịch vụ."
      ),
    updateVehicle: (id, data) =>
      handleUpdate(userApi.updateVehicle, id, data, "Đã cập nhật thông số xe."),
    deleteVehicle: (id) =>
      handleUpdate(userApi.deleteVehicle, id, null, "Đã xóa thông số xe."),
  };
};

/* finalFilteredUsers removed — this logic depends on userTypeFilter, individualUsers and companyUsers
   which are available inside the UserManagement component via state and the useFilterLogicHook.
   Compute combined/filtered lists inside the component where those variables are in scope. */

const useFilterLogicHook = ({
  allAccounts,
  allVehicles,
  servicePackages,
  userTypeFilter,
}) => {
  const [userFilter, setUserFilter] = useState({
    search: "",
    status: "all",
    servicePackage: "all",
    role: "all",
  });

  const [serviceFilter, setServiceFilter] = useState({
    search: "",
    category: "all",
  });

  const [vehicleFilter, setVehicleFilter] = useState({
    ownerType: "all", // Loại chủ sở hữu (Cá nhân/Công ty)
    carMaker: "all", // Hãng
    model: "all", // Dòng xe
    ownerId: "", // ID Chủ sở hữu/ID Người dùng
  });

  // ...
  const filteredUsers = useMemo(() => {
    return allAccounts.filter((user) => {
      const matchSearch =
        user.userName
          ?.toLowerCase()
          .includes(userFilter.search.toLowerCase()) ||
        userFilter.search === "";
      const matchStatus =
        userFilter.status === "all" || user.status === userFilter.status;

      const userPackageNameLower = user.servicePackageName?.toLowerCase() || "";
      const filterPackageNameLower = userFilter.servicePackage.toLowerCase();

      const matchServicePackage =
        userFilter.servicePackage === "all" ||
        userPackageNameLower === filterPackageNameLower;

      // ✅ LOGIC LỌC THEO LOẠI NGƯỜI DÙNG (ROLE)
      const matchRole =
        userTypeFilter === "all" ||
        (userTypeFilter === "individual" && user.role === "Customer") ||
        (userTypeFilter === "company" && user.role === "Company");

      // ✅ CẬP NHẬT TRẢ VỀ: Thêm matchRole vào điều kiện
      return matchSearch && matchStatus && matchServicePackage && matchRole;
    });
  }, [allAccounts, userFilter, userTypeFilter]);

  const individualUsers = useMemo(
    () => filteredUsers.filter((u) => u.role === "Customer"),
    [filteredUsers]
  );
  const companyUsers = useMemo(
    () => filteredUsers.filter((u) => u.role === "Company"),
    [filteredUsers]
  );

  const filteredServices = useMemo(() => {
    return servicePackages.filter((pkg) => {
      const categoryMatch =
        serviceFilter.category === "all" ||
        pkg.category === serviceFilter.category;
      const searchMatch =
        pkg.planName
          ?.toLowerCase()
          .includes(serviceFilter.search.toLowerCase()) ||
        serviceFilter.search === "";
      return categoryMatch && searchMatch;
    });
  }, [servicePackages, serviceFilter]);

  const filteredVehicles = useMemo(() => {
    return allVehicles.filter((vehicle) => {
      // Lọc 1: Hãng xe (Car Maker)
      const matchMaker =
        vehicleFilter.carMaker === "all" ||
        vehicle.carMaker?.toLowerCase() ===
          vehicleFilter.carMaker.toLowerCase();

      // Lọc 2: Dòng xe (Model)
      const matchModel =
        vehicleFilter.model === "all" ||
        vehicle.model?.toLowerCase() === vehicleFilter.model.toLowerCase();

      // Lọc 3: ID Chủ sở hữu (Owner ID)
      const filterOwnerId = vehicleFilter.ownerId.trim();
      const currentOwnerId = vehicle.customerId || vehicle.companyId || "";
      const matchOwnerId =
        filterOwnerId === "" ||
        currentOwnerId.toString().includes(filterOwnerId);

      // Lọc 4: Loại chủ sở hữu (Owner Type) - Cá nhân/Công ty
      const matchOwnerType =
        vehicleFilter.ownerType === "all" ||
        (vehicleFilter.ownerType === "Cá nhân" &&
          !!vehicle.customerId &&
          !vehicle.companyId) ||
        (vehicleFilter.ownerType === "Công ty" && !!vehicle.companyId);

      return matchMaker && matchModel && matchOwnerId && matchOwnerType;
    });
  }, [allVehicles, vehicleFilter]);

  const vehicleFilterOptions = useMemo(() => {
    // Sử dụng Set để đảm bảo tính duy nhất và loại bỏ giá trị null/undefined
    const makers = new Set();
    const models = new Set(); // OwnerType chỉ có 2 loại cố định: 'Cá nhân' và 'Công ty'
    const ownerTypes = ["Cá nhân", "Công ty"];

    allVehicles.forEach((vehicle) => {
      if (vehicle.carMaker) makers.add(vehicle.carMaker);
      if (vehicle.model) models.add(vehicle.model);
    });

    return {
      // Chuyển Set sang Array và sắp xếp theo thứ tự alphabet
      carMakers: Array.from(makers).sort(),
      models: Array.from(models).sort(),
      ownerTypes: ownerTypes,
    };
  }, [allVehicles]);

  return {
    userFilter,
    setUserFilter,
    vehicleFilter, // ✅ ĐÃ CHÍNH XÁC
    setVehicleFilter, // ✅ ĐÃ CHÍNH XÁC
    serviceFilter,
    setServiceFilter,
    individualUsers,
    companyUsers,
    filteredVehicles, // ✅ ĐÃ CHÍNH XÁC
    filteredServices,
    vehicleFilterOptions,
  };
};

// TẠO COMPONENT MỚI ĐỂ CHỨA LOGIC LỌC CỦA NGƯỜI DÙNG
const UserFilterBar = ({
  userFilter,
  setUserFilter,
  userTypeFilter,
  setUserTypeFilter,
  servicePackages,
}) => {
  // Tạo danh sách các gói dịch vụ cho dropdown
  const packageOptions = useMemo(() => {
    return (servicePackages || []).map((pkg) => (
      <option key={pkg.planName} value={pkg.planName}>
        {pkg.planName}
      </option>
    ));
  }, [servicePackages]);

  return (
    <div className="filter-bar">
      {/* 1. LỌC TÌM KIẾM */}
      <div className="filter-group">
        <label className="filter-label">Tìm kiếm:</label>
        <div className="search-box">
          <input
            type="text"
            placeholder="Tên, Email..."
            value={userFilter.search}
            onChange={(e) =>
              setUserFilter({ ...userFilter, search: e.target.value })
            }
          />
          <i className="fas fa-search search-icon"></i>
        </div>
      </div>

      {/* 2. LỌC LOẠI NGƯỜI DÙNG (Segmented Control) */}
      <div className="filter-group">
        <label className="filter-label">Loại người dùng:</label>
        <div className="segmented-control">
          {/* Nút 'Tất cả' */}
          <button
            className={`segmented-button ${
              userTypeFilter === "all" ? "active" : ""
            }`}
            onClick={() => setUserTypeFilter("all")}
          >
            Tất cả
          </button>
          {/* Nút 'Cá nhân' */}
          <button
            className={`segmented-button ${
              userTypeFilter === "individual" ? "active" : ""
            }`}
            onClick={() => setUserTypeFilter("individual")}
          >
            Cá nhân
          </button>
          {/* Nút 'Doanh nghiệp' */}
          <button
            className={`segmented-button ${
              userTypeFilter === "company" ? "active" : ""
            }`}
            onClick={() => setUserTypeFilter("company")}
          >
            Doanh nghiệp
          </button>
        </div>
      </div>

      {/* 3. LỌC GÓI DỊCH VỤ */}
      <div className="filter-group">
        <label className="filter-label">Gói dịch vụ:</label>
        <select
          value={userFilter.servicePackage}
          onChange={(e) =>
            setUserFilter({
              ...userFilter,
              servicePackage: e.target.value,
            })
          }
          className="filter-dropdown"
        >
          <option value="all">Tất cả Gói</option>
          {/* Tùy chọn CHƯA ĐĂNG KÝ */}
          <option value="Chưa đăng ký">Chưa đăng ký</option>
          {packageOptions}
        </select>
      </div>

      {/* 4. LỌC TRẠNG THÁI */}
      <div className="filter-group">
        <label className="filter-label">Trạng thái:</label>
        <select
          value={userFilter.status}
          onChange={(e) =>
            setUserFilter({ ...userFilter, status: e.target.value })
          }
          className="filter-dropdown"
        >
          <option value="all">Tất cả</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
    </div>
  );
};
const UserManagement = () => {
  const [activeTab, setActiveTab] = useState("users");
  const [activeModal, setActiveModal] = useState(null);
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const {
    allAccounts,
    allVehicles,
    servicePackages,
    subscriptions,
    isLoading,
    error,
    updateUser,
    updateUserStatus,
    deleteUser,
    createServicePackage,
    updateServicePackage,
    deleteServicePackage,
    updateVehicle,
    deleteVehicle,
  } = useUserServicesHook();

  const crudActions = {
    updateUser,
    updateUserStatus,
    deleteUser,
    createServicePackage,
    updateServicePackage,
    deleteServicePackage,
    updateVehicle,
    deleteVehicle,
  };

  const {
    userFilter,
    setUserFilter,
    vehicleFilter, // ✅ CẦN THÊM DÒNG NÀY
    setVehicleFilter,
    serviceFilter,
    setServiceFilter,
    individualUsers,
    companyUsers,
    filteredVehicles,
    filteredServices,
    vehicleFilterOptions,
  } = useFilterLogicHook({
    allAccounts,
    allVehicles,
    servicePackages,
    userTypeFilter,
  });

  useEffect(() => {
    console.log("================== DEBUG USER MANAGEMENT ==================");
    console.log("1. Trạng thái tải:", { isLoading, error });
    console.log("2. Filter hiện tại:", userFilter); // Log tên gói dịch vụ có sẵn trong dropdown (ServicePackages)
    const availablePackageNames = servicePackages.map((p) => p.planName);
    console.log(
      "3. Tên gói Dịch vụ có sẵn (cho Dropdown):",
      availablePackageNames
    ); // Log 3 người dùng đầu tiên với tên gói dịch vụ của họ (AllAccounts)

    const userPackageDebug = allAccounts.slice(0, 3).map((u) => ({
      id: u.id,
      name: u.userName,
      package: u.servicePackageName,
    }));
    console.log("4. 3 User đầu tiên & Gói Dịch vụ:", userPackageDebug); // Log 3 người dùng đầu tiên sau khi đã lọc (IndividualUsers)
    const filteredUserDebug = individualUsers.slice(0, 3).map((u) => ({
      id: u.id,
      name: u.userName,
      package: u.servicePackageName,
    }));
    console.log("5. 3 User đầu tiên SAU KHI LỌC:", filteredUserDebug);
    console.log("=========================================================");
  }, [
    isLoading,
    error,
    userFilter,
    servicePackages,
    allAccounts,
    individualUsers,
  ]);

  if (isLoading && !activeModal)
    return <div className="user-page loading">Đang tải dữ liệu...</div>;
  if (error && !activeModal)
    return <div className="user-page error">Lỗi tải dữ liệu: {error}</div>;

  return (
    <div className="user-page">
      <h2 className="admin-title">Quản lý Người dùng & Dịch vụ</h2>

      <div className="user-actions">
        <div className="tabs">
          <button
            className={`btn ${activeTab === "users" ? "primary" : "secondary"}`}
            onClick={() => setActiveTab("users")}
          >
            Người dùng
          </button>
          <button
            className={`btn ${
              activeTab === "vehicle" ? "primary" : "secondary"
            }`}
            onClick={() => setActiveTab("vehicle")}
          >
            Thông số xe
          </button>
          <button
            className={`btn ${
              activeTab === "service" ? "primary" : "secondary"
            }`}
            onClick={() => setActiveTab("service")}
          >
            Gói dịch vụ
          </button>
        </div>

        {activeTab === "service" && (
          <button
            className="btn primary icon-btn"
            onClick={() => setActiveModal("addService")}
          >
            <PlusOutlined /> Thêm gói dịch vụ
          </button>
        )}
      </div>

      <div className="filter-container">
        {activeTab === "users" && (
          <UserFilterBar
            userFilter={userFilter}
            setUserFilter={setUserFilter}
            userTypeFilter={userTypeFilter}
            setUserTypeFilter={setUserTypeFilter}
            servicePackages={servicePackages}
          />
        )}

        {activeTab === "vehicle" && (
          <VehicleFilterBar
            vehicleFilter={vehicleFilter}
            setVehicleFilter={setVehicleFilter}
            filterOptions={vehicleFilterOptions}
          />
        )}

        {activeTab === "service" && (
          <ServiceFilterBar
            serviceFilter={serviceFilter}
            setServiceFilter={setServiceFilter}
            setActiveModal={setActiveModal}
          />
        )}

        <div className="filter-group-bottom">
          <button className="btn export">Xuất CSV</button>
        </div>
      </div>

      <div className="data-table-container">
        {activeTab === "users" && (
          <div className="user-tables-group">
            {/** HIỆN BẢNG CÁ NHÂN nếu userTypeFilter là 'all' HOẶC 'individual' **/}
            {(userTypeFilter === "all" || userTypeFilter === "individual") && (
              <UserTables
                filteredData={individualUsers}
                userType="individual"
                setActiveModal={setActiveModal}
                servicePackages={servicePackages}
                subscriptions={subscriptions}
              />
            )}

            {/** HIỆN BẢNG DOANH NGHIỆP nếu userTypeFilter là 'all' HOẶC 'company' **/}
            {(userTypeFilter === "all" || userTypeFilter === "company") && (
              <UserTables
                filteredData={companyUsers}
                userType="company"
                setActiveModal={setActiveModal}
                servicePackages={servicePackages}
                subscriptions={subscriptions}
              />
            )}
          </div>
        )}
        {activeTab === "vehicle" && (
          <VehicleTable
            filteredData={filteredVehicles}
            setActiveModal={setActiveModal}
          />
        )}
        {activeTab === "service" && (
          <ServiceTable
            filteredData={filteredServices}
            setActiveModal={setActiveModal}
          />
        )}
      </div>

      <AdminModals
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        allAccounts={allAccounts}
        allVehicles={allVehicles}
        servicePackages={servicePackages}
        crudActions={crudActions}
      />
    </div>
  );
};

export default UserManagement;
