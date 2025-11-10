// 📁 src/components/UserManagement/ServiceTable.jsx
import React, { useState } from "react";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

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
  if (isLoading) return <p>Đang tải dữ liệu gói dịch vụ...</p>;
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
    const s = String(status).toLowerCase();
    if (s === "active") return "Đang hoạt động";
    if (s === "inactive") return "Ngừng hoạt động";
    return status;
  };

  const formatVND = (num) => Number(num ?? 0).toLocaleString("vi-VN") + " VND";

  // === “Quyền lợi”: tách & gộp giống trang ServicePlans ===
  const cleanText = (x) => {
    const s = String(x ?? "").trim();
    if (!s || s.toLowerCase() === "string") return "";
    return s;
  };
  const splitToList = (s) =>
    s
      .split(/\r?\n|;|•/g)
      .map((x) => cleanText(x))
      .filter(Boolean);

  const featureListOf = (pkg) => {
    const items = [];
    const desc = cleanText(pkg?.description);
    const bene = cleanText(pkg?.benefits);
    if (desc) items.push(...splitToList(desc));
    if (bene) items.push(...splitToList(bene));

    const freeIdle = Number(pkg?.freeIdleMinutes);
    if (Number.isFinite(freeIdle) && freeIdle > 0) {
      items.push(`Miễn phí chờ ${freeIdle} phút mỗi phiên`);
    }
    const discount = Number(pkg?.discountPercent);
    if (Number.isFinite(discount) && discount > 0) {
      items.push(`Giảm ${discount}% khi thanh toán đủ điều kiện`);
    }

    // unique
    const seen = new Set();
    const uniq = [];
    for (const it of items) {
      const k = it.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        uniq.push(it);
      }
    }
    return uniq;
  };

  // ======= PAGINATION =======
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // 👉 muốn nhiều/ít dòng mỗi trang: chỉnh số này
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const handlePrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  // ======= RENDER =======
  return (
    <div className="user-table-section service-package-table">
      <h3>Danh sách Gói dịch vụ ({filteredData.length} mục)</h3>

      {/* ✅ wrapper cho phép cuộn ngang nếu bảng rộng */}
      <div className="table-responsive-wrapper">
        <table className="minimal-table">
          <thead>
            <tr>
              <th style={{ width: 260 }}>Tên gói</th>
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
            {paginatedData.map((pkg) => {
              const rowId = getId(pkg);
              const planId =
                pkg?.subscriptionPlanId ?? pkg?.id ?? pkg?.packageId;
              const price = formatVND(pkg?.priceMonthly);
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

              const featList = featureListOf(pkg);

              return (
                <tr key={rowId}>
                  {/* 📦 Tên gói: KHÔNG còn dropdown */}
                  <td className="plan-name-cell">
                    <span>{pkg?.planName || "—"}</span>
                  </td>

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

                  {/* 🎁 Quyền lợi: danh sách + cuộn dọc khi dài */}
                  <td className="description-cell">
                    {featList.length ? (
                      <ul
                        className="benefit-list"
                        style={{ paddingLeft: 18, margin: 0 }}
                      >
                        {featList.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    ) : (
                      "—"
                    )}
                  </td>

                  {/* ⚙️ Hành động */}
                  <td className="action-cell">
                    <EditOutlined
                      onClick={() =>
                        setActiveModal(`editService-${planId ?? rowId}`)
                      }
                      className="action-icon edit-icon"
                      title="Chỉnh sửa"
                    />
                    <DeleteOutlined
                      onClick={() =>
                        setActiveModal(`deleteService-${planId ?? rowId}`)
                      }
                      className="action-icon delete-icon"
                      title="Xóa"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ✅ PHÂN TRANG */}
      {totalPages > 1 && (
        <div className="table-pagination">
          <button
            className="pagination-btn"
            onClick={handlePrev}
            disabled={currentPage === 1}
          >
            ← Trước
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              className={`pagination-btn ${
                num === currentPage ? "active" : ""
              }`}
              onClick={() => setCurrentPage(num)}
            >
              {num}
            </button>
          ))}

          <button
            className="pagination-btn"
            onClick={handleNext}
            disabled={currentPage === totalPages}
          >
            Sau →
          </button>
        </div>
      )}
    </div>
  );
};

export default ServiceTable;
