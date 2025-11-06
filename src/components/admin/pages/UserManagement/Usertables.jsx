import React, { useState } from "react";

import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { Pagination } from "antd";

/* =========================================================
   🔹 HÀM TIÊU ĐỀ BẢNG
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
   🔹 HÀM XÁC ĐỊNH CỘT BẢNG THEO LOẠI USER
   ========================================================= */
const getColumns = (userType) => {
  const cols = [
    { key: "STT", header: "STT" },
    { key: "accountId", header: "ID" },
  ];

  if (userType === "individual") {
    // === CỘT CỦA NGƯỜI DÙNG CÁ NHÂN ===
    cols.push({ key: "fullName", header: "Tên" });
    cols.push({ key: "phone", header: "SĐT" });
    cols.push({ key: "email", header: "Email" });
    cols.push({ key: "accountType", header: "Loại tài khoản" });
    cols.push({ key: "servicePackageName", header: "Gói dịch vụ" });
  } else if (userType === "company") {
    // === CỘT CỦA DOANH NGHIỆP ===
    cols.push({ key: "companyName", header: "Công ty" });
    // ❌ Đã bỏ Người đại diện, SĐT đại diện và Quy mô
    cols.push({ key: "email", header: "Email" });
    cols.push({ key: "taxCode", header: "Mã số thuế" });
    cols.push({ key: "address", header: "Địa chỉ" });
    cols.push({ key: "paymentStatus", header: "Trạng thái thanh toán" });
  }

  cols.push({ key: "role", header: "Vai trò" });
  cols.push({ key: "status", header: "Trạng thái" });
  cols.push({ key: "action", header: "Thao tác" });

  return cols;
};

/* =========================================================
   🔹 HÀM RENDER GIÁ TRỊ Ô (CELL)
   ========================================================= */
const renderCell = (user, key, index, servicePackages, subscriptions) => {
  const customerInfo =
    user.customers && user.customers.length > 0 ? user.customers[0] : {};
  const companyData = user.company || {};

  switch (key) {
    case "STT":
      return index + 1;
    case "accountId":
      return user.accountId;

    // ======== DOANH NGHIỆP ========
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
    case "email":
      return (
        customerInfo.email || companyData.companyEmail || user.userName || "—"
      );
    case "taxCode":
      return companyData.taxCode || "—";
    case "address":
      return companyData.address || "—";
    case "paymentStatus":
      return companyData.paymentStatus || "—";

    // ======== CÁ NHÂN ========
    case "fullName":
      return customerInfo.fullName || "—";
    case "phone":
      return customerInfo.phone || "—";
    case "planName": {
      // user.servicePackageName đã được tính toán trong useUserServicesHook
      // (ví dụ: "Gói Kim Cương" hoặc "Chưa đăng ký")
      return user.servicePackageName || "—";
    }

    case "accountType":
      return "Cá nhân";

    // ======== CHUNG ========
    case "role":
      return user.role || "User";
    case "status":
      return user.status || "Inactive";

    default:
      return "—";
  }
};

/* =========================================================
   🔹 COMPONENT CHÍNH: UserTables
   ========================================================= */
export const UserTables = ({
  filteredData = [],
  userType = "individual",
  setActiveModal,
  servicePackages = [],
  subscriptions = [],
}) => {
  const columns = getColumns(userType);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // số hàng mỗi trang
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Chia dữ liệu theo trang
  const pagedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  if (filteredData.length === 0) {
    return (
      <div className="user-table-section">
        <h3>Thông tin {getTableTitle(userType)} (0 mục)</h3>
        <p>Không tìm thấy dữ liệu người dùng nào phù hợp với bộ lọc.</p>
      </div>
    );
  }

  return (
    <div className="user-table-section">
      <h3>
        Thông tin {getTableTitle(userType)} ({filteredData.length} mục)
      </h3>
      <div className="table-responsive-wrapper">
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
                        <EditOutlined
                          className="action-icon edit-icon"
                          title="Chỉnh sửa"
                          onClick={() =>
                            setActiveModal?.(`editUser-${user.accountId}`)
                          }
                        />
                        <DeleteOutlined
                          className="action-icon delete-icon"
                          title="Xóa"
                          onClick={() =>
                            setActiveModal?.(`deleteUser-${user.accountId}`)
                          }
                        />
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
                      {renderCell(
                        user,
                        col.key,
                        index,
                        servicePackages,
                        subscriptions
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 12, textAlign: "right" }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={filteredData.length}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
          />
        </div>
      </div>
    </div>
  );
};

export default UserTables;
