import React, { useState, useMemo, useRef } from "react";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Pagination } from "antd";

/* =========================================================
   🔹 TIÊU ĐỀ
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
   🔹 CỘT BẢNG THEO LOẠI USER & STAFF
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
    cols.push({ key: "paymentStatus", header: "Trạng thái thanh toán" });
  } else if (userType === "company") {
    cols.push({ key: "companyName", header: "Công ty" });
    cols.push({ key: "email", header: "Email" });
    cols.push({ key: "taxCode", header: "Mã số thuế" });
    cols.push({ key: "address", header: "Địa chỉ" });
    cols.push({ key: "companyPlan", header: "Gói dịch vụ" });
    cols.push({ key: "paymentStatus", header: "Trạng thái thanh toán" });
  }

  cols.push({ key: "role", header: "Vai trò" });
  cols.push({ key: "status", header: "Trạng thái" });
  cols.push({ key: "action", header: "Thao tác" });

  return cols;
};

const getStaffColumns = () => {
  return [
    { key: "STT", header: "STT" },
    { key: "stationId", header: "Station ID" },
    { key: "staffId", header: "Nhân viên ID" },
    { key: "staffName", header: "Tên nhân viên" },
    { key: "staffEmail", header: "Email" },
    { key: "action", header: "Thao tác" },
  ];
};

/* =========================================================
   🔹 HELPERS (GIỮ NGUYÊN)
   ========================================================= */

// ... (Các hàm helper: pickUserSubscription, pickCompanySubscription, buildPlanMap,
//      pickCompanyLatestInvoice, pickCustomerLatestInvoice, paymentStatusFromInvoice) ...
const pickUserSubscription = (subs, customerId) => {
  if (!customerId || !Array.isArray(subs)) return null;
  const cid = Number(customerId);

  const mine = subs.filter(
    (s) =>
      Number(s?.customerId) === cid &&
      (s?.companyId == null || Number(s.companyId) === 0)
  );

  if (mine.length === 0) return null; // 👉 Lọc chỉ gói đang ACTIVE

  const active = mine.filter((s) => String(s?.status) === "Active");
  if (active.length === 0) return null; // Lấy gói mới nhất

  const when = (s) => new Date(s?.startDate || s?.updatedAt || 0).getTime();
  active.sort((a, b) => when(b) - when(a));

  return active[0];
};

const pickCompanySubscription = (subs, companyId) => {
  if (!companyId || !Array.isArray(subs)) return null;
  const cid = Number(companyId);

  const mine = subs.filter((s) => Number(s?.companyId) === cid);
  if (mine.length === 0) return null;

  const active = mine.filter((s) => String(s?.status) === "Active");
  if (active.length === 0) return null;

  const when = (s) =>
    new Date(s?.startDate || s?.updatedAt || s?.createdAt || 0).getTime();
  active.sort((a, b) => when(b) - when(a));

  return active[0];
};

const buildPlanMap = (servicePackages = []) =>
  servicePackages.reduce((acc, p) => {
    const id = Number(p?.subscriptionPlanId ?? p?.planId);
    if (!Number.isNaN(id)) acc[id] = p?.planName;
    return acc;
  }, {});

const pickCompanyLatestInvoice = (invoices, companyId) => {
  if (!companyId || !Array.isArray(invoices)) return null;
  const cid = Number(companyId);

  const list = invoices.filter(
    (i) => Number(i?.companyId ?? i?.CompanyId) === cid
  );
  if (list.length === 0) return null;

  const when = (x) =>
    new Date(
      x?.createdAt ??
        x?.CreatedAt ??
        x?.updatedAt ??
        x?.UpdatedAt ??
        x?.dueDate ??
        x?.DueDate ??
        0
    ).getTime();

  return list.slice().sort((a, b) => when(b) - when(a))[0];
};

const pickCustomerLatestInvoice = (invoices, customerId) => {
  if (!customerId || !Array.isArray(invoices)) return null;
  const cid = Number(customerId);

  const list = invoices.filter(
    (i) => Number(i?.customerId ?? i?.CustomerId) === cid
  );
  if (list.length === 0) return null;

  const when = (x) =>
    new Date(
      x?.createdAt ??
        x?.CreatedAt ??
        x?.updatedAt ??
        x?.UpdatedAt ??
        x?.dueDate ??
        x?.DueDate ??
        0
    ).getTime();

  return list.slice().sort((a, b) => when(b) - when(a))[0];
};

const paymentStatusFromInvoice = (inv) => {
  if (!inv) return "—";
  const st = String(inv?.status || "").trim();
  if (st === "Paid") return "Đã thanh toán";
  const due = inv?.dueDate ? new Date(inv.dueDate).getTime() : null;
  if (st !== "Paid" && due && Date.now() > due) return "Quá hạn";
  return "Chưa thanh toán";
};

const renderCell = (
  user,
  key,
  index,
  { userType, pageOffset, subscriptions, planMap, invoices }
) => {
  const customerInfo =
    user?.customers && user.customers.length > 0 ? user.customers[0] : {};
  const companyData = user?.company || {};

  switch (key) {
    case "STT":
      return pageOffset + index + 1;

    case "accountId":
      return user?.accountId ?? "—"; // ======== DOANH NGHIỆP ========

    case "companyName":
      return <span>{companyData?.name || user?.userName || "—"}</span>;

    case "email":
      return customerInfo?.email || companyData?.email || user?.userName || "—";

    case "taxCode":
      return companyData?.taxCode || "—";

    case "address":
      return companyData?.address || "—";

    case "companyPlan": {
      const compId =
        companyData?.companyId ??
        companyData?.CompanyId ??
        user?.companyId ??
        user?.CompanyId ??
        null;

      const sub = pickCompanySubscription(subscriptions, compId);
      if (!sub) return "—";
      const nameFromSub = sub?.planName;
      const nameFromPlanMap =
        sub?.subscriptionPlanId != null
          ? planMap?.[Number(sub.subscriptionPlanId)]
          : undefined;
      return nameFromSub || nameFromPlanMap || "—";
    }
    case "paymentStatus": {
      // Nếu là công ty: dùng companyId
      if (userType === "company") {
        const compId =
          companyData?.companyId ??
          companyData?.CompanyId ??
          user?.companyId ??
          user?.CompanyId ??
          customerInfo?.companyId ??
          customerInfo?.CompanyId;

        const inv = pickCompanyLatestInvoice(invoices, compId);
        return paymentStatusFromInvoice(inv);
      } // Nếu là cá nhân: dùng customerId

      const custId =
        customerInfo?.customerId ??
        customerInfo?.CustomerId ??
        user?.customers?.[0]?.customerId ??
        user?.Customers?.[0]?.CustomerId;

      const inv = pickCustomerLatestInvoice(invoices, custId);
      return paymentStatusFromInvoice(inv);
    } // ======== CÁ NHÂN ========

    case "fullName":
      return customerInfo?.fullName || "—";

    case "phone":
      return customerInfo?.phone || "—";

    case "planName": {
      const sub = pickUserSubscription(subscriptions, customerInfo?.customerId);
      if (!sub) return "—";
      const nameFromSub = sub?.planName;
      const nameFromPlanMap =
        sub?.subscriptionPlanId != null
          ? planMap?.[Number(sub.subscriptionPlanId)]
          : undefined;
      return nameFromSub || nameFromPlanMap || "—";
    }

    case "accountType":
      return userType === "company" ? "Doanh nghiệp" : "Cá nhân"; // ======== CHUNG ========

    case "role":
      return user?.role || "User";

    case "status":
      return user?.status || "Inactive";

    default:
      return "—";
  }
};

export const UserTables = ({
  filteredData = [],
  userType = "individual",
  setActiveModal,
  servicePackages = [],
  subscriptions = [],
  invoices = [],
}) => {
  const columns = useMemo(() => getColumns(userType), [userType]);
  const planMap = useMemo(
    () => buildPlanMap(servicePackages),
    [servicePackages]
  );

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const total = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const pagedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage]); // Vùng cuộn của bảng: để đưa scrollTop về đầu khi đổi trang

  const wrapRef = useRef(null);
  const handlePageChange = (page) => {
    setCurrentPage(page);
    if (wrapRef.current) wrapRef.current.scrollTop = 0;
  };

  if (total === 0) {
    return (
      <div className="user-table-section user-table--users">
        <h3>Thông tin {getTableTitle(userType)} (0 mục)</h3>
        <p>Không tìm thấy dữ liệu người dùng nào phù hợp với bộ lọc.</p>
      </div>
    );
  }

  const pageOffset = (safePage - 1) * pageSize;

  return (
    <div className="user-table-section user-table--users">
      {/* Header sticky */}
      <div className="table-header">
        <h3>
          Thông tin {getTableTitle(userType)} ({total} mục)
        </h3>
      </div>
      {/* Vùng CUỘN của nội dung bảng */}
      <div className="table-responsive-wrapper" ref={wrapRef}>
        <table className="minimal-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {pagedData.map((user, index) => (
              <tr key={user?.accountId ?? index}>
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
                    const isActive = String(user?.status) === "Active";
                    return (
                      <td key={col.key}>
                        <span
                          className={`status ${
                            isActive ? "active" : "inactive"
                          }`}
                        >
                          {user?.status || "Inactive"}
                        </span>
                      </td>
                    );
                  }

                  return (
                    <td key={col.key}>
                      {renderCell(user, col.key, index, {
                        userType,
                        pageOffset,
                        subscriptions,
                        planMap,
                        invoices,
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* ✅ Phân trang đặt NGOÀI vùng cuộn (luôn ở dưới) */}
      {total > pageSize && (
        <div className="table-pagination table-pagination--outside">
          <Pagination
            current={safePage}
            pageSize={pageSize}
            total={total}
            onChange={handlePageChange}
            showSizeChanger={false}
            hideOnSinglePage
            itemRender={(page, type) => {
              if (type === "prev") return <span>← Trước</span>;
              if (type === "next") return <span>Sau →</span>;
              return <span>{page}</span>;
            }}
          />
        </div>
      )}
    </div>
  );
};

/* =========================================================
🔹 COMPONENT BẢNG NHÂN VIÊN STATION (BỔ SUNG)
========================================================= */
export const StationStaffTable = ({
 staffs = [],
 stationId,
 isLoading,
 setActiveModal,
}) => {
 const columns = useMemo(() => getStaffColumns(), []);
 const total = staffs.length;

 // Render cell đơn giản cho bảng Staff
 const renderStaffCell = (staff, key, index) => {
 switch (key) {
 case "STT":
 return index + 1;
 case "stationId":
 return staff?.StationId ?? staff?.stationId ?? "—";
 case "staffId":
 return staff?.StaffId ?? staff?.staffId ?? "—"; // SỬ DỤNG staff.StaffId / staff.staffId
 case "staffName":
 return staff?.StaffName || staff?.staffName || "—";
 case "staffEmail":
 // DTO chỉ trả về StaffName, nên email sẽ là "—" nếu không fetch thêm Account
 return staff?.StaffEmail || staff?.staffEmail || "—";
 default:
 return "—";
 }
 };

 if (!stationId) {
 return (
 <div className="user-table-section user-table--staffs">
 <h3>Quản lý Nhân viên Station (Chưa chọn Station)</h3>
 <p>Vui lòng chọn một **Station ID** hợp lệ để xem hoặc thêm nhân viên.</p>
 </div>
 );
 }

 return (
 <div className="user-table-section user-table--staffs">
{/* Header */}
 <div className="table-header">
 <h3>
 Nhân viên tại Station **{stationId}** ({total} mục)
 </h3>
 {/* Nút THÊM Nhân viên - Sử dụng cú pháp object cho AdminModals */}
 <button
 className="btn-primary"
 onClick={() => setActiveModal?.({ type: "addStaff", stationId: stationId })}
 disabled={isLoading}
 >
 <PlusOutlined /> Thêm Nhân viên
 </button>
 </div>

 {isLoading ? (
 <p>Đang tải danh sách nhân viên...</p>
 ) : total === 0 ? (
 <p>Station **{stationId}** chưa có nhân viên nào.</p>
 ) : (
 <div className="table-responsive-wrapper">
 <table className="minimal-table">
 <thead>
 <tr>
 {columns.map((col) => (
 <th key={col.key}>{col.header}</th>
 ))}
</tr>
 </thead>

 <tbody>
 {staffs.map((staff, index) => (
// Sử dụng cả staffId và StationId làm key
 <tr key={`${staff.StationId || staff.stationId}-${staff.StaffId || staff.staffId}`}>
 {columns.map((col) => {
 if (col.key === "action") {
 const staffAccountId = staff.StaffId ?? staff.staffId ?? staff.id;
 const currentStationId = staff.StationId ?? staff.stationId;

 return (
 <td key={col.key} className="action-cell">
 <DeleteOutlined
className="action-icon delete-icon"
 title="Xóa nhân viên khỏi Station"
 onClick={() =>
setActiveModal?.(
`deleteStaffFromStation-Station${currentStationId}-Staff${staffAccountId}`
)
 }
/>
 </td>
 );
}

 return (
 <td key={col.key}>
{renderStaffCell(staff, col.key, index)}
 </td>
 );
 })}
</tr>
 ))}
 </tbody>
</table>
 </div>
 )}
</div>
);
};

// Đảm bảo cả hai component đều được export.
export default UserTables;

// Dòng gây lỗi đã được sửa: Loại bỏ UserTables khỏi Named Export vì nó đã là default export
