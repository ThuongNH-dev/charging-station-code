import React from "react";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

/* =========================================================
   🔹 TIÊU ĐỀ BẢNG
   ========================================================= */
const getTableTitle = (userType) => {
  switch (userType) {
    case "individual":
      return "Người dùng cá nhân";
    case "company":
      return "Người dùng doanh nghiệp";
    default:
      return "Người dùng";
  }
};

/* =========================================================
   🔹 CỘT BẢNG
   ========================================================= */
const getColumns = (userType) => {
  const cols = [
    { key: "STT", header: "STT" },
    { key: "accountId", header: "ID" },
  ];

  if (userType === "individual") {
    cols.push({ key: "fullName", header: "Tên" });
    cols.push({ key: "phone", header: "SĐT" });
    cols.push({ key: "email", header: "Email" });
    cols.push({ key: "accountType", header: "Loại tài khoản" });
    cols.push({ key: "planName", header: "Gói dịch vụ" });
  } else if (userType === "company") {
    cols.push({ key: "companyName", header: "Công ty" });
    cols.push({ key: "fullName", header: "Người đại diện" });
    cols.push({ key: "phone", header: "SĐT đại diện" });
    cols.push({ key: "email", header: "Email" });
    cols.push({ key: "taxCode", header: "Mã số thuế" });
    cols.push({ key: "scale", header: "Quy mô" });
    cols.push({ key: "address", header: "Địa chỉ" });
    cols.push({ key: "paymentStatus", header: "Thanh toán" });
  }

  cols.push({ key: "role", header: "Vai trò" });
  cols.push({ key: "status", header: "Trạng thái" });
  cols.push({ key: "action", header: "Thao tác" });

  return cols;
};

/* =========================================================
   🔹 HIỂN THỊ DỮ LIỆU CELL
   ========================================================= */
const renderCell = (user, key, index, servicePackages) => {
  const customerInfo =
    user.customers && user.customers.length > 0 ? user.customers[0] : {};
  const companyData = user.company || {};

  switch (key) {
    case "STT":
      return index + 1;
    case "accountId":
      return user.accountId;

    // === Doanh nghiệp ===
    case "companyName":
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {companyData.imageUrl && (
            <img
              src={companyData.imageUrl}
              alt="logo"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          )}
          <span>{companyData.companyName || user.userName || "—"}</span>
        </div>
      );
    case "fullName":
      return customerInfo.fullName || "—";
    case "phone":
      return customerInfo.phone || companyData.companyPhone || "—";
    case "email":
      return (
        customerInfo.email || companyData.companyEmail || user.userName || "—"
      );
    case "taxCode":
      return companyData.taxCode || "—";
    case "scale":
      return companyData.scale || "—";
    case "address":
      return companyData.address || "—";
    case "paymentStatus":
      return companyData.paymentStatus || "—";

    // === Cá nhân ===
    case "planName": {
      try {
        if (!Array.isArray(servicePackages) || servicePackages.length === 0)
          return "—";

        const planId =
          user.subscriptionPlanId ||
          customerInfo.subscriptionPlanId ||
          user.planId ||
          null;

        if (!planId) return "—";

        const plan = servicePackages.find(
          (p) =>
            Number(p.subscriptionPlanId || p.SubscriptionPlanId) ===
            Number(planId)
        );

        return plan?.planName || plan?.PlanName || "—";
      } catch (error) {
        console.error("❌ Lỗi khi render planName:", error);
        return "—";
      }
    }

    case "accountType":
      return "Cá nhân";

    // === Chung ===
    case "role":
      return user.role || "User";
    case "status":
      return user.status || "Inactive";

    default:
      return "—";
  }
};

/* =========================================================
   🔹 COMPONENT CHÍNH
   ========================================================= */
export const UserTables = ({
  filteredData = [],
  userType = "individual",
  setActiveModal,
  servicePackages = [],
}) => {
  const columns = getColumns(userType);

  if (filteredData.length === 0)
    return (
      <div className="user-table-section">
        <h3>Thông tin {getTableTitle(userType)} (0 mục)</h3>
        <p>Không có dữ liệu phù hợp.</p>
      </div>
    );

  return (
    <div className="user-table-section">
      <h3>
        Thông tin {getTableTitle(userType)} ({filteredData.length} mục)
      </h3>
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredData.map((user, index) => (
            <tr key={user.accountId}>
              {columns.map((col) => {
                if (col.key === "action") {
                  return (
                    <td key={col.key} className="action-cell">
                      <button
                        className="icon-btn"
                        onClick={() =>
                          setActiveModal(`editUser-${user.accountId}`)
                        }
                      >
                        <EditOutlined />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() =>
                          setActiveModal(`deleteUser-${user.accountId}`)
                        }
                      >
                        <DeleteOutlined />
                      </button>
                    </td>
                  );
                }

                if (col.key === "status") {
                  return (
                    <td key={col.key}>
                      <span
                        className={`status ${
                          user.status === "Active" ? "active" : "inactive"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                  );
                }

                return (
                  <td key={col.key}>
                    {renderCell(user, col.key, index, servicePackages)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserTables;
