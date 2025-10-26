// 📁 src/components/UserManagement/ServiceTable.jsx
import React from "react";

/**
 * Component hiển thị bảng danh sách các gói dịch vụ (Subscription Plans)
 * @param {Array} filteredData - Danh sách các gói dịch vụ đã lọc từ API /SubscriptionPlans.
 * @param {Function} setActiveModal - Hàm để mở modal Sửa/Xóa.
 * @param {Boolean} isLoading - Trạng thái đang tải dữ liệu.
 */
const ServiceTable = ({
  filteredData = [],
  setActiveModal,
  isLoading = false,
}) => {
  // 🌀 TRƯỜNG HỢP 1: Đang tải dữ liệu
  if (isLoading) {
    return <p>Đang tải dữ liệu gói dịch vụ...</p>;
  }

  // 🚫 TRƯỜNG HỢP 2: Không có dữ liệu (sau khi tải xong)
  if (filteredData.length === 0) {
    console.error("❌ Lỗi hiển thị bảng dịch vụ: filteredData rỗng!", {
      filteredDataLength: filteredData.length,
      isLoading,
    });
    return <p>Không tìm thấy gói dịch vụ nào phù hợp với bộ lọc.</p>;
  }

  // 🧮 HÀM HỖ TRỢ CHUYỂN ĐỔI NGỮ NGHĨA
  const formatCategory = (category) => {
    // Dựa theo API cũ: Individual / Business
    if (category === "Individual") return "Cá nhân";
    if (category === "Business") return "Doanh nghiệp";

    // Nếu API mới đổi sang “Trả trước” / “Thuê bao”, cần map lại ở đây
    return category || "—";
  };

  // 🧩 KẾT HỢP MÔ TẢ QUYỀN LỢI & PHÚT CHỜ MIỄN PHÍ
  const formatBenefits = (pkg) => {
    let benefitStr = pkg.benefits || pkg.description || "";

    if (pkg.freeIdleMinutes > 0) {
      benefitStr +=
        (benefitStr ? " | " : "") +
        `Miễn phí Idle Fee ${pkg.freeIdleMinutes} phút`;
    }

    return benefitStr || "—";
  };

  // 📋 TRƯỜNG HỢP 3: HIỂN THỊ DỮ LIỆU TRÊN BẢNG
  return (
    <div className="user-table-section service-package-table">
      <h3>Danh sách Gói dịch vụ ({filteredData.length} mục)</h3>

      <table className="minimal-table">
        <thead>
          <tr>
            <th>Tên gói</th>
            <th>Loại</th>
            <th>Giá</th>
            <th>Quyền lợi</th>
            <th>Hành động</th>
          </tr>
        </thead>

        <tbody>
          {filteredData.map((pkg) => (
            <tr key={pkg.subscriptionPlanId}>
              {/* 📦 Tên gói */}
              <td>{pkg.planName || "—"}</td>

              {/* 🏷️ Loại */}
              <td>{formatCategory(pkg.category)}</td>

              {/* 💰 Giá */}
              <td>
                {pkg.priceMonthly
                  ? `${pkg.priceMonthly.toLocaleString("vi-VN")} VND`
                  : "0 VND"}
              </td>

              {/* 🎁 Quyền lợi */}
              <td className="description-cell">{formatBenefits(pkg)}</td>

              {/* ⚙️ Hành động */}
              <td className="action-cell">
                <button
                  className="text-action-btn edit-btn"
                  onClick={() =>
                    setActiveModal(`editService-${pkg.subscriptionPlanId}`)
                  }
                  style={{
                    marginRight: "8px",
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
                  onClick={() =>
                    setActiveModal(`deleteService-${pkg.subscriptionPlanId}`)
                  }
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
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ServiceTable;
