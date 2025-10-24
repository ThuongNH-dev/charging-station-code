// src/pages/Admin/UserManagement/UserManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PlusOutlined } from "@ant-design/icons";
import "../UserManagement.css";
import { userApi } from "../../../../api/userApi";
import UserTables from "./UserTables";
import VehicleTable from "./VehicleTable";
import ServiceTable from "./ServiceTable";
import AdminModals from "./Modals/AdminModals";
import ServiceFilterBar from "./ServiceFilterBar";

/* =========================================================
   🔹 1. HOOK: FETCH DỮ LIỆU & CRUD
   ========================================================= */
const useUserServicesHook = () => {
  const [allAccounts, setAllAccounts] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [servicePackages, setServicePackages] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [accounts, vehicles, services, subscriptionsData] = await Promise.all([
        userApi.fetchAllUsers(),
        userApi.fetchAllVehicles(),
        userApi.fetchAllServicePackages(),
        userApi.fetchAllSubscriptions(),
      ]);

      setAllAccounts(accounts || []);
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

  const handleUpdate = async (apiFunc, id, data, successMsg) => {
    setIsLoading(true);
    setError(null);
    try {
      await apiFunc(id, data);
      alert(successMsg || "Cập nhật thành công!");
      await fetchData();
      return true;
    } catch (err) {
      console.error("❌ Lỗi cập nhật:", err);
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
    // CRUD USERS
    updateUserStatus: (id, data) =>
      handleUpdate(
        userApi.updateUserStatus,
        id,
        data,
        "Đã cập nhật trạng thái người dùng."
      ),
    deleteUser: (id) =>
      handleUpdate(userApi.deleteUser, id, null, "Đã xóa người dùng."),
    // CRUD SERVICES
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
    // CRUD VEHICLES
    updateVehicle: (id, data) =>
      handleUpdate(userApi.updateVehicle, id, data, "Đã cập nhật thông số xe."),
    deleteVehicle: (id) =>
      handleUpdate(userApi.deleteVehicle, id, null, "Đã xóa thông số xe."),
  };
};

/* =========================================================
   🔹 2. HOOK: FILTER LOGIC (User / Vehicle / Service)
   ========================================================= */
const useFilterLogicHook = ({ allAccounts, allVehicles, servicePackages }) => {
  const [userFilter, setUserFilter] = useState({ search: "", status: "all" });
  const [vehicleFilter, setVehicleFilter] = useState({
    search: "",
    status: "all",
  });
  const [serviceFilter, setServiceFilter] = useState({
    search: "",
    status: "all",
  });

  // --- FILTER USERS ---
  const filteredUsers = useMemo(() => {
    return allAccounts.filter((user) => {
      const matchSearch =
        user.userName
          ?.toLowerCase()
          .includes(userFilter.search.toLowerCase()) ||
        userFilter.search === "";
      const matchStatus =
        userFilter.status === "all" || user.status === userFilter.status;
      return matchSearch && matchStatus;
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

  // --- FILTER SERVICES ---
  const filteredServices = useMemo(() => {
    const validPlans = ["Tiêu chuẩn", "Cao cấp", "Bạc", "Doanh nghiệp", "Vàng"];
    return servicePackages.filter((pkg) => {
      const planMatch =
        pkg.planName &&
        validPlans.some((plan) =>
          pkg.planName.toLowerCase().includes(plan.toLowerCase())
        );
      const searchMatch =
        pkg.planName
          ?.toLowerCase()
          .includes(serviceFilter.search.toLowerCase()) ||
        serviceFilter.search === "";
      const statusMatch =
        serviceFilter.status === "all" || pkg.Status === serviceFilter.status;
      return planMatch && searchMatch && statusMatch;
    });
  }, [servicePackages, serviceFilter]);

  // --- FILTER VEHICLES ---
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

/* =========================================================
   🔹 3. COMPONENT CHÍNH
   ========================================================= */
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
    ...crudActions
  } = useUserServicesHook();

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

  if (isLoading && !activeModal)
    return <div className="user-page loading">Đang tải dữ liệu...</div>;

  if (error && !activeModal)
    return <div className="user-page error">Lỗi tải dữ liệu: {error}</div>;

  return (
    <div className="user-page">
      <h2 className="admin-title">Quản lý Người dùng & Dịch vụ</h2>

      {/* === TAB CHUYỂN === */}
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

      {/* === THANH LỌC === */}
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
          />
        )}

        <div className="filter-group-bottom">
          <button className="btn export">Xuất CSV</button>
        </div>
      </div>

      {/* === DỮ LIỆU === */}
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

      {/* === MODALS === */}
      <AdminModals
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        servicePackages={servicePackages}
        crudActions={crudActions}
      />
    </div>
  );
};

export default UserManagement;
