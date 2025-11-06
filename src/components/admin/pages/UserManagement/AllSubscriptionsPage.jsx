// 📁 src/components/admin/pages/UserManagement/AllSubscriptionsPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { userApi } from "../../../../api/userApi";

const fmt = (d) => (d ? new Date(d).toLocaleString("vi-VN") : "—");

export default function AllSubscriptionsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [plans, setPlans] = useState([]);
  const [subs, setSubs] = useState([]);

  // ✅ thay cho users
  const [custMap, setCustMap] = useState(new Map());
  const [compMap, setCompMap] = useState(new Map());

  // Bộ lọc
  const [filters, setFilters] = useState({
    planId: "all",
    role: "all",
    status: "all",
    search: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [planList, allSubs, customers, companies] = await Promise.all([
        userApi.fetchAllServicePackages(),
        userApi.fetchAllSubscriptions(),
        userApi.fetchAllCustomers(), // <- API mới
        userApi.fetchAllCompanies(), // <- API mới
      ]);

      setPlans(planList || []);
      setSubs(allSubs || []);

      // 🔑 build lookup maps
      setCustMap(
        new Map(
          (customers || []).map((c) => [
            String(c.customerId ?? c.CustomerId),
            {
              id: c.customerId ?? c.CustomerId,
              role: "Customer",
              name: c.fullName ?? c.FullName ?? "",
            },
          ])
        )
      );
      setCompMap(
        new Map(
          (companies || []).map((co) => [
            String(co.companyId ?? co.CompanyId),
            {
              id: co.companyId ?? co.CompanyId,
              role: "Company",
              name: co.name ?? co.Name ?? "",
            },
          ])
        )
      );
    } catch (e) {
      setError(e.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const planNameOf = (s) => {
    const pid = s.subscriptionPlanId ?? s.servicePackageId ?? s.planId;
    const p = plans.find(
      (x) => String(x.subscriptionPlanId ?? x.id ?? x.packageId) === String(pid)
    );
    return p?.planName ?? `#${pid}`;
  };

  // ✅ Không dùng users nữa; tra theo 2 map
  const userOf = (s) => {
    const custId = s.customerId ?? s.CustomerId;
    if (custId != null) return custMap.get(String(custId)) || {};
    const compId = s.companyId ?? s.CompanyId;
    if (compId != null) return compMap.get(String(compId)) || {};
    return {};
  };

  const filtered = useMemo(() => {
    return (subs || []).filter((s) => {
      const u = userOf(s);

      // search theo tên đã chuẩn hoá
      const searchHit = (u.name || "")
        .toLowerCase()
        .includes((filters.search || "").toLowerCase());

      // lọc role
      const roleOk =
        filters.role === "all" || String(u.role || "") === String(filters.role);

      // lọc status
      const statusOk =
        filters.status === "all" ||
        String(s.status || "").toLowerCase() ===
          String(filters.status).toLowerCase();

      // lọc plan
      const pid = String(
        s.subscriptionPlanId ?? s.servicePackageId ?? s.planId
      );
      const matchPlan =
        filters.planId === "all" || pid === String(filters.planId);

      return searchHit && roleOk && statusOk && matchPlan;
    });
    // ⬇️ dependency không còn `users`
  }, [subs, custMap, compMap, filters]);

  const changeStatus = async (s, v) => {
    await userApi.changeSubscriptionStatus(s.subscriptionId ?? s.id, v);
    await load();
  };

  const removeSub = async (s) => {
    if (!confirm("Xoá đăng ký này?")) return;
    await userApi.deleteSubscription(s.subscriptionId ?? s.id);
    await load();
  };

  if (loading) return <div className="user-page loading">Đang tải...</div>;
  if (error) return <div className="user-page error">Lỗi: {error}</div>;

  return (
    <div className="user-page">
      <h2 className="admin-title">Người dùng đăng ký (tất cả gói)</h2>

      <div className="user-actions">
        <button className="btn secondary" onClick={() => navigate(-1)}>
          ← Quay lại
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label">Tìm:</label>
          <div className="search-box">
            <input
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              placeholder="Tên người dùng / công ty..."
            />
            <i className="fas fa-search search-icon"></i>
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">Gói:</label>
          <select
            className="filter-dropdown"
            value={filters.planId}
            onChange={(e) => setFilters({ ...filters, planId: e.target.value })}
          >
            <option value="all">Tất cả</option>
            {(plans || []).map((p) => {
              const id = p.subscriptionPlanId ?? p.id ?? p.packageId;
              return (
                <option key={id} value={id}>
                  {p.planName} (#{id})
                </option>
              );
            })}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Loại:</label>
          <select
            className="filter-dropdown"
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
          >
            <option value="all">Tất cả</option>
            <option value="Customer">Cá nhân</option>
            <option value="Company">Doanh nghiệp</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Trạng thái:</label>
          <select
            className="filter-dropdown"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="all">Tất cả</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Pending">Pending</option>
            <option value="Canceled">Canceled</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="data-table-container">
        <div className="user-table-section">
          <h3>Danh sách đăng ký ({filtered.length})</h3>
          <div className="table-responsive-wrapper">
            <table className="minimal-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>ID</th>
                  <th style={{ width: 260 }}>Người dùng</th>
                  <th style={{ width: 110 }}>Loại</th>
                  <th style={{ width: 220 }}>Gói</th>
                  <th style={{ width: 120 }}>Chu kỳ</th>
                  <th style={{ width: 110 }}>Tự gia hạn</th>
                  <th style={{ width: 140 }}>Bắt đầu</th>
                  <th style={{ width: 140 }}>Kết thúc</th>
                  <th style={{ width: 120 }}>Trạng thái</th>
                  <th style={{ width: 220 }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const id = s.subscriptionId ?? s.id;
                  const u = userOf(s);
                  const name = u.name || `User #${u.id}`;
                  return (
                    <tr key={id}>
                      <td>{id}</td>
                      <td title={name}>{name}</td>
                      <td>
                        {u.role === "Company" ? "Doanh nghiệp" : "Cá nhân"}
                      </td>
                      <td>{planNameOf(s)}</td>
                      <td>{s.billingCycle || "—"}</td>
                      <td>{s.autoRenew ? "Có" : "Không"}</td>
                      <td>{fmt(s.startDate)}</td>
                      <td>{fmt(s.endDate)}</td>
                      <td>{s.status || "—"}</td>
                      <td className="action-cell">
                        {String(s.status) !== "Active" ? (
                          <button
                            className="btn primary"
                            onClick={() => changeStatus(s, "Active")}
                          >
                            Kích hoạt
                          </button>
                        ) : (
                          <button
                            className="btn secondary"
                            onClick={() => changeStatus(s, "Inactive")}
                          >
                            Ngừng
                          </button>
                        )}
                        <button
                          className="btn danger"
                          onClick={() => removeSub(s)}
                          style={{ marginLeft: 8 }}
                        >
                          Xoá
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
