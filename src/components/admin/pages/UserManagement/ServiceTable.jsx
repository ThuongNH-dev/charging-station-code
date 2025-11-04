// 📁 src/components/UserManagement/ServiceTable.jsx
import React from "react";

/**
 * Bảng danh sách gói dịch vụ (Subscription Plans)
 * @param {Array} filteredData - Danh sách đã lọc từ API /SubscriptionPlans
 * @param {Function} setActiveModal - Hàm mở modal Sửa/Xóa
 * @param {Boolean} isLoading - Trạng thái tải
 */
const ServiceTable = ({
  filteredData = [],
  setActiveModal,
  isLoading = false,
}) => {
  // ======= UI STATES =======
  if (isLoading) {
    return <p>Đang tải dữ liệu gói dịch vụ...</p>;
  }

  if (!Array.isArray(filteredData) || filteredData.length === 0) {
    console.error("❌ filteredData rỗng hoặc không phải mảng.", {
      filteredDataLength: filteredData?.length ?? "N/A",
      isLoading,
    });
    return <p>Không tìm thấy gói dịch vụ nào phù hợp với bộ lọc.</p>;
  }

  // ======= HELPERS =======
  const getId = (pkg) =>
    pkg?.subscriptionPlanId ??
    pkg?.id ??
    pkg?.packageId ??
    String(Math.random());

  const formatCategory = (category) => {
    if (category === "Individual") return "Cá nhân";
    if (category === "Business") return "Doanh nghiệp";
    return category || "—";
  };

  const formatStatus = (status) => {
    if (!status) return "—";
    if (String(status).toLowerCase() === "active") return "Đang hoạt động";
    if (String(status).toLowerCase() === "inactive") return "Ngừng hoạt động";
    return status;
  };

  const formatVND = (num) => {
    const n = Number(num ?? 0);
    return n.toLocaleString("vi-VN");
  };

  const formatBenefits = (pkg) => {
    let benefitStr = pkg?.benefits || pkg?.description || "";
    const freeIdle = Number(pkg?.freeIdleMinutes ?? 0);
    if (freeIdle > 0) {
      benefitStr +=
        (benefitStr ? " | " : "") + `Miễn phí Idle Fee ${freeIdle} phút`;
    }
    return benefitStr || "—";
  };

  // ======= RENDER =======
  return (
    <div className="user-table-section service-package-table">
      <h3>Danh sách Gói dịch vụ ({filteredData.length} mục)</h3>

      <table className="minimal-table">
        <thead>
          <tr>
            <th style={{ width: 220 }}>Tên gói</th>
            <th style={{ width: 140 }}>Loại</th>
            <th style={{ width: 140 }}>Giá/tháng</th>
            <th style={{ width: 110 }}>Giảm giá</th>
            <th style={{ width: 110 }}>Doanh nghiệp?</th>
            <th style={{ width: 140 }}>Trạng thái</th>
            <th>Quyền lợi</th>
            <th style={{ width: 140 }}>Hành động</th>
          </tr>
        </thead>

        <tbody>
          {filteredData.map((pkg) => {
            const rowId = getId(pkg);
            const price = `${formatVND(pkg?.priceMonthly)} VND`;
            const discount =
              pkg?.discountPercent != null
                ? `${Number(pkg.discountPercent)}%`
                : "—";
            const isForCompany =
              typeof pkg?.isForCompany === "boolean"
                ? pkg.isForCompany
                  ? "Có"
                  : "Không"
                : "—";

            const benefitsText = formatBenefits(pkg);

            return (
              <tr key={rowId}>
                {/* 📦 Tên gói */}
                <td title={pkg?.planName || ""}>{pkg?.planName || "—"}</td>

                {/* 🏷️ Loại */}
                <td>{formatCategory(pkg?.category)}</td>

                {/* 💰 Giá */}
                <td>{price}</td>

                {/* ⬇️ Giảm giá */}
                <td>{discount}</td>

                {/* 🏢 DN? */}
                <td>{isForCompany}</td>

                {/* 🧭 Trạng thái */}
                <td>{formatStatus(pkg?.status)}</td>

                {/* 🎁 Quyền lợi */}
                <td className="description-cell" title={benefitsText}>
                  {benefitsText}
                </td>

                {/* ⚙️ Hành động */}
                <td className="action-cell">
                  <button
                    className="text-action-btn edit-btn"
                    onClick={() => setActiveModal(`editService-${rowId}`)}
                    aria-label={`Sửa gói ${pkg?.planName || rowId}`}
                    style={{
                      marginRight: 8,
                      cursor: "pointer",
                      background: "none",
                      border: "none",
                      color: "#007bff",
                      textDecoration: "underline",
                    }}
                  >
                    Sửa
                  </button>

                  <button
                    className="text-action-btn delete-btn"
                    onClick={() => setActiveModal(`deleteService-${rowId}`)}
                    aria-label={`Xóa gói ${pkg?.planName || rowId}`}
                    style={{
                      cursor: "pointer",
                      background: "none",
                      border: "none",
                      color: "red",
                      textDecoration: "underline",
                    }}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ServiceTable;
