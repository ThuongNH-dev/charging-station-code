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
  const [invoices, setInvoices] = useState([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [accounts, vehicles, services, subscriptionsData, invoicesData] =
        await Promise.all([
          userApi.fetchAllUsers(),
          userApi.fetchAllVehicles(),
          userApi.fetchAllServicePackages(),
          userApi.fetchAllSubscriptions(),
          userApi.fetchAllInvoices(), // ✅ thêm dòng này
        ]);

      // ===== Map id -> tên gói dịch vụ
      const serviceMap = (services || []).reduce((map, p) => {
        const id = p.subscriptionPlanId ?? p.id ?? p.packageId;
        if (id != null) map[id] = p.planName;
        return map;
      }, {});

      // ===== Lấy sub ACTIVE mới nhất theo customerId
      const pickActiveSubByCustomer = (subs, customerId) => {
        if (!customerId) return null;
        const mine = (subs || []).filter(
          (s) => Number(s?.customerId) === Number(customerId)
        );
        const active = mine.filter((s) => String(s?.status) === "Active");
        if (!active.length) return null;
        active.sort(
          (a, b) =>
            new Date(b?.startDate || b?.updatedAt || 0) -
            new Date(a?.startDate || a?.updatedAt || 0)
        );
        return active[0];
      };

      // ===== Lấy sub ACTIVE mới nhất theo companyId
      const pickActiveSubByCompany = (subs, companyId) => {
        if (!companyId) return null;
        const mine = (subs || []).filter(
          (s) => Number(s?.companyId) === Number(companyId)
        );
        const active = mine.filter((s) => String(s?.status) === "Active");
        if (!active.length) return null;
        active.sort(
          (a, b) =>
            new Date(b?.startDate || b?.updatedAt || b?.createdAt || 0) -
            new Date(a?.startDate || a?.updatedAt || a?.createdAt || 0)
        );
        return active[0];
      };

      // ===== Gắn servicePackageName cho MỌI user (cả cá nhân & DN)
      const accountsWithPackage = (accounts || []).map((u) => {
        const customerId = u?.customers?.[0]?.customerId;
        const companyId = u?.company?.companyId ?? u?.companyId;

        let sub = null;
        if (companyId)
          sub = pickActiveSubByCompany(subscriptionsData, companyId);
        if (!sub && customerId)
          sub = pickActiveSubByCustomer(subscriptionsData, customerId);

        const planName =
          sub?.planName ??
          (sub?.subscriptionPlanId != null
            ? serviceMap[sub.subscriptionPlanId]
            : null);

        return {
          ...u,
          servicePackageName: planName || "Chưa đăng ký",
        };
      });

      setAllAccounts(accountsWithPackage);
      setAllVehicles(vehicles || []);
      setServicePackages(services || []);
      setSubscriptions(subscriptionsData || []);
      setInvoices(invoicesData || []);
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

  // ... bên trong useUserServicesHook
  const handleUpdate = async (apiFunc, id, data, successMsg, role) => {
    if (typeof apiFunc !== "function") {
      console.error("❌ apiFunc không phải function", apiFunc);
      return false;
    }
    setIsLoading(true);
    setError(null);
    try {
      if (id !== undefined && id !== null) {
        await apiFunc(id, data, role);
      } else {
        await apiFunc(data);
      }
      alert(successMsg || "Cập nhật thành công!");
      await fetchData();
      return true;
    } catch (err) {
      const resp = err?.response;
      const pd = resp?.data; // ProblemDetails từ ASP.NET
      const sentBody = resp?.config?.data;

      // 🔎 In ra toàn bộ để debug nhanh
      console.error("❌ AxiosError detail:", {
        status: resp?.status,
        url: resp?.config?.url,
        method: resp?.config?.method,
        sentBody, // <= body FE đã gửi
        problemDetails: pd, // <= ProblemDetails từ BE
      });

      // 🔎 Gom lỗi ModelState cho người dùng
      let msg =
        pd?.title ||
        pd?.message ||
        err?.message ||
        "One or more validation errors occurred.";

      if (pd?.errors && typeof pd.errors === "object") {
        const lines = [];
        for (const [field, arr] of Object.entries(pd.errors)) {
          const joined = Array.isArray(arr) ? arr.join(", ") : String(arr);
          lines.push(`${field}: ${joined}`);
        }
        if (lines.length) msg += `\n\n${lines.join("\n")}`;
      }

      setError(msg);
      alert(`Lỗi: ${msg}`);
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
    invoices,
    isLoading,
    error,
    fetchData,
    updateUser: (id, data, role) =>
      handleUpdate(
        userApi.updateUser,
        id,
        data,
        "Đã cập nhật người dùng.",
        role
      ),
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

  // ✅ BỔ SUNG status cho serviceFilter để lọc theo Active/Inactive/All
  const [serviceFilter, setServiceFilter] = useState({
    search: "",
    category: "all",
    status: "all",
  });

  const [vehicleFilter, setVehicleFilter] = useState({
    ownerType: "all",
    carMaker: "all",
    model: "all",
    ownerId: "",
  });

  const filteredUsers = useMemo(() => {
    const q = (userFilter.search || "").toLowerCase().trim();
    const pkg = (userFilter.servicePackage || "all").toLowerCase();
    const st = userFilter.status;

    return allAccounts.filter((user) => {
      const c = user?.customers?.[0] || {};
      const comp = user?.company || {};

      // Ghép chuỗi để search trên nhiều trường:
      const hay = [
        user?.userName,
        String(user?.accountId ?? user?.id ?? ""),
        c?.fullName,
        c?.email,
        c?.phone,
        comp?.name,
        comp?.email,
        comp?.taxCode,
        comp?.address,
        user?.servicePackageName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchSearch = !q || hay.includes(q);
      const matchStatus = st === "all" || String(user?.status) === st;
      const matchServicePackage =
        pkg === "all" ||
        (user?.servicePackageName &&
          user.servicePackageName.toLowerCase() === pkg);

      const matchRole =
        userTypeFilter === "all" ||
        (userTypeFilter === "individual" && user.role === "Customer") ||
        (userTypeFilter === "company" && user.role === "Company");

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

  // ✅ LỌC GÓI DỊCH VỤ: search + category + status
  const filteredServices = useMemo(() => {
    const search = (serviceFilter.search || "").toLowerCase().trim();
    const cat = serviceFilter.category || "all";
    const status = (serviceFilter.status || "all").toLowerCase();

    return (servicePackages || []).filter((pkg) => {
      const matchSearch =
        !search || (pkg.planName || "").toLowerCase().includes(search);

      const matchCategory = cat === "all" || String(pkg.category) === cat;

      const pkgStatus = String(pkg.status || "").toLowerCase();
      const matchStatus = status === "all" || pkgStatus === status;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [servicePackages, serviceFilter]);

  const filteredVehicles = useMemo(() => {
    return allVehicles.filter((vehicle) => {
      const matchMaker =
        vehicleFilter.carMaker === "all" ||
        vehicle.carMaker?.toLowerCase() ===
          vehicleFilter.carMaker.toLowerCase();

      const matchModel =
        vehicleFilter.model === "all" ||
        vehicle.model?.toLowerCase() === vehicleFilter.model.toLowerCase();

      const filterOwnerId = vehicleFilter.ownerId.trim();
      const currentOwnerId = vehicle.customerId || vehicle.companyId || "";
      const matchOwnerId =
        filterOwnerId === "" ||
        currentOwnerId.toString().includes(filterOwnerId);

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
    const makers = new Set();
    const models = new Set();
    const ownerTypes = ["Cá nhân", "Công ty"];

    allVehicles.forEach((vehicle) => {
      if (vehicle.carMaker) makers.add(vehicle.carMaker);
      if (vehicle.model) models.add(vehicle.model);
    });

    return {
      carMakers: Array.from(makers).sort(),
      models: Array.from(models).sort(),
      ownerTypes,
    };
  }, [allVehicles]);

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
    vehicleFilterOptions,
  };
};

// Thanh lọc Users
const UserFilterBar = ({
  userFilter,
  setUserFilter,
  userTypeFilter,
  setUserTypeFilter,
  servicePackages,
}) => {
  const packageOptions = useMemo(() => {
    const names = new Set(
      (servicePackages || []).map((pkg) => pkg?.planName).filter(Boolean)
    );
    return [...names].sort().map((name) => (
      <option key={name} value={name}>
        {name}
      </option>
    ));
  }, [servicePackages]);

  return (
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
        <label className="filter-label">Loại người dùng:</label>
        <div className="segmented-control">
          <button
            className={`segmented-button ${
              userTypeFilter === "all" ? "active" : ""
            }`}
            onClick={() => setUserTypeFilter("all")}
          >
            Tất cả
          </button>
          <button
            className={`segmented-button ${
              userTypeFilter === "individual" ? "active" : ""
            }`}
            onClick={() => setUserTypeFilter("individual")}
          >
            Cá nhân
          </button>
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
          <option value="Chưa đăng ký">Chưa đăng ký</option>
          {packageOptions}
        </select>
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
    invoices,
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
    vehicleFilter,
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
    console.log("2. Filter hiện tại:", userFilter);
    const availablePackageNames = servicePackages.map((p) => p.planName);
    console.log(
      "3. Tên gói Dịch vụ có sẵn (cho Dropdown):",
      availablePackageNames
    );
    const userPackageDebug = allAccounts.slice(0, 3).map((u) => ({
      id: u.id,
      name: u.userName,
      package: u.servicePackageName,
    }));
    console.log("4. 3 User đầu tiên & Gói Dịch vụ:", userPackageDebug);
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

  // ===== Export CSV helper =====
  const exportCsv = (rows, filename) => {
    if (!rows || rows.length === 0) {
      alert("Không có dữ liệu để xuất CSV.");
      return;
    }
    const headers = Object.keys(rows[0]);
    const escapeCell = (val) => {
      const s = String(val ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [];
    lines.push(headers.join(","));
    rows.forEach((r) =>
      lines.push(headers.map((h) => escapeCell(r[h])).join(","))
    );
    const csv = "\uFEFF" + lines.join("\n"); // BOM
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== Handlers Xuất CSV theo tab =====
  const handleExportCsv = () => {
    if (activeTab === "service") {
      const rows = (filteredServices || []).map((p) => ({
        ID: p.subscriptionPlanId ?? p.id ?? p.packageId ?? "",
        TenGoi: p.planName ?? "",
        Loai: p.category ?? "",
        GiaThang_VND: Number(p.priceMonthly ?? 0),
        GiamGia_Pct: p.discountPercent ?? "",
        DoanhNghiep:
          typeof p.isForCompany === "boolean"
            ? p.isForCompany
              ? "Có"
              : "Không"
            : "",
        TrangThai: p.status ?? "",
        MienPhiIdle_Phut: p.freeIdleMinutes ?? "",
        QuyenLoi: p.benefits ?? p.description ?? "",
      }));
      exportCsv(rows, "subscription_plans.csv");
      return;
    }

    if (activeTab === "vehicle") {
      const rows = (filteredVehicles || []).map((v) => {
        let ownerType = "Khách vãng lai";
        let ownerId = "";

        if (v.customerId) {
          ownerType = "Cá nhân";
          ownerId = v.customerId;
        } else if (v.companyId) {
          ownerType = "Công ty";
          ownerId = v.companyId;
        }

        return {
          ID: v.vehicleId ?? "",
          Hang: v.carMaker ?? "",
          DongXe: v.model ?? "",
          NamSX: v.manufactureYear ?? "",
          ChuSoHuuLoai: ownerType,
          ChuSoHuuID: ownerId,
        };
      });
      exportCsv(rows, "vehicles.csv");
      return;
    }

    // users
    if (activeTab === "users") {
      const allUsersForCsv = [...individualUsers, ...companyUsers];
      const rows = allUsersForCsv.map((u) => ({
        ID: u.id ?? "",
        Ten: u.userName ?? "",
        Email: u.email ?? "",
        VaiTro: u.role ?? "",
        TrangThai: u.status ?? "",
        GoiDichVu: u.servicePackageName ?? "",
      }));
      exportCsv(rows, "users.csv");
    }
  };

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
        </div>
        <div className="tabs">
          <button
            className={`btn ${
              activeTab === "vehicle" ? "primary" : "secondary"
            }`}
            onClick={() => setActiveTab("vehicle")}
          >
            Thông số xe
          </button>
        </div>
        <div className="tabs">
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
          <button className="btn export" onClick={handleExportCsv}>
            Xuất CSV
          </button>
        </div>
      </div>

      <div className="data-table-container">
        {activeTab === "users" && (
          <div className="user-tables-group">
            {(userTypeFilter === "all" || userTypeFilter === "individual") && (
              <UserTables
                filteredData={individualUsers}
                userType="individual"
                setActiveModal={setActiveModal}
                servicePackages={servicePackages}
                subscriptions={subscriptions}
                invoices={invoices}
              />
            )}

            {(userTypeFilter === "all" || userTypeFilter === "company") && (
              <UserTables
                filteredData={companyUsers}
                userType="company"
                setActiveModal={setActiveModal}
                servicePackages={servicePackages}
                subscriptions={subscriptions}
                invoices={invoices}
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
