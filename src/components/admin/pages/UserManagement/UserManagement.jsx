import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PlusOutlined } from "@ant-design/icons";
import "../UserManagement.css";
import { userApi } from "../../../../api/userApi";
import UserTables from "./Usertables";
import VehicleTable from "./VehicleTable";
import ServiceTable from "./ServiceTable";
import AdminModals from "./Modals/AdminModals";
import ServiceFilterBar from "./ServiceFilterBar";

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

const useFilterLogicHook = ({ allAccounts, allVehicles, servicePackages }) => {
  const [userFilter, setUserFilter] = useState({
    search: "",
    status: "all",
    servicePackage: "all",
    role: "all",
  });
  const [vehicleFilter, setVehicleFilter] = useState({
    search: "",
    status: "all",
  });
  const [serviceFilter, setServiceFilter] = useState({
    search: "",
    category: "all",
  });

  const filteredUsers = useMemo(() => {
    return allAccounts.filter((user) => {
      const matchSearch =
        user.userName
          ?.toLowerCase()
          .includes(userFilter.search.toLowerCase()) ||
        userFilter.search === "";
      const matchStatus =
        userFilter.status === "all" || user.status === userFilter.status;

      // 💡 LOGIC LỌC THEO GÓI DỊCH VỤ
      const userPackageNameLower = user.servicePackageName?.toLowerCase() || "";
      const filterPackageNameLower = userFilter.servicePackage.toLowerCase();

      const matchServicePackage =
        userFilter.servicePackage === "all" ||
        userPackageNameLower === filterPackageNameLower;

      return matchSearch && matchStatus && matchServicePackage; // CẬP NHẬT TRẢ VỀ
    });
  }, [allAccounts, userFilter]);

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
      const matchSearch =
        vehicle.carMaker
          ?.toLowerCase()
          .includes(vehicleFilter.search.toLowerCase()) ||
        vehicleFilter.search === "";
      return matchSearch;
    });
  }, [allVehicles, vehicleFilter]);

  return {
    userFilter,
    setUserFilter,
    vehicleFilter,
    setVehicleFilter,
    serviceFilter,
    setServiceFilter,
    individualUsers,
    companyUsers,
    filteredVehicles,
    filteredServices,
  };
};

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState("users");
  const [activeModal, setActiveModal] = useState(null);

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
    serviceFilter,
    setServiceFilter,
    individualUsers,
    companyUsers,
    filteredVehicles,
    filteredServices,
  } = useFilterLogicHook({ allAccounts, allVehicles, servicePackages });

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
          <div className="filter-bar">
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
            {/* 💡 BỘ LỌC GÓI DỊCH VỤ MỚI ĐƯỢC THÊM */}
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
                {/* ✅ THÊM TÙY CHỌN CHƯA ĐĂNG KÝ */}
                <option value="Chưa đăng ký">Chưa đăng ký</option>{" "}
                {/* 💡 Lấy thông tin Gói Dịch Vụ từ state 'servicePackages' */}{" "}
                {servicePackages.map(
                  (
                    pkg // Dùng planName làm cả value và label
                  ) => (
                    <option key={pkg.planName} value={pkg.planName}>
                      {pkg.planName}
                    </option>
                  )
                )}
              </select>
            </div>
            {/* 🛑 KẾT THÚC BỘ LỌC MỚI 🛑 */}
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
            <UserTables
              filteredData={individualUsers}
              userType="individual"
              setActiveModal={setActiveModal}
              servicePackages={servicePackages}
              subscriptions={subscriptions}
            />
            <UserTables
              filteredData={companyUsers}
              userType="company"
              setActiveModal={setActiveModal}
              servicePackages={servicePackages}
              subscriptions={subscriptions}
            />
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
