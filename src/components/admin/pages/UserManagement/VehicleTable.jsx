import React, { useMemo, useState, useEffect } from "react";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

/* =========================================================
   🔹 Helpers
   ========================================================= */
const hasId = (v) => Number.isInteger(v) && v > 0;
const isFiniteNum = (v) => Number.isFinite(v);

/* =========================================================
   🔹 Cột
   ========================================================= */
const getColumns = () => [
  { key: "STT", header: "STT" },
  { key: "vehicleId", header: "ID Xe" },
  { key: "ownerType", header: "Loại chủ sở hữu" },
  { key: "ownerId", header: "ID Chủ sở hữu" },
  { key: "carMaker", header: "Hãng" },
  { key: "model", header: "Dòng xe" },
  { key: "vehicleType", header: "Loại xe" },
  { key: "batteryCapacity", header: "Dung lượng pin" },
  { key: "licensePlate", header: "Biển số" },
  { key: "manufactureYear", header: "Năm SX" },
  { key: "action", header: "Thao tác" },
];

/* =========================================================
   🔹 Render cell
   ========================================================= */
const renderCell = (vehicle, key, sttIndex) => {
  switch (key) {
    case "STT":
      return sttIndex + 1;
    case "vehicleId":
      return hasId(vehicle.vehicleId) ? vehicle.vehicleId : "—";
    case "ownerType":
      if (hasId(vehicle.companyId)) return "Công ty";
      if (hasId(vehicle.customerId)) return "Cá nhân";
      return "Khách vãng lai";
    case "ownerId":
      if (hasId(vehicle.companyId)) return vehicle.companyId;
      if (hasId(vehicle.customerId)) return vehicle.customerId;
      return "—";
    case "carMaker":
      return vehicle.carMaker ?? "—";
    case "model":
      return vehicle.model ?? "—";
    case "vehicleType":
      return vehicle.vehicleType ?? "—";
    case "batteryCapacity":
      return isFiniteNum(vehicle.batteryCapacity)
        ? `${vehicle.batteryCapacity} kWh`
        : "—";
    case "licensePlate":
      return vehicle.licensePlate ?? "—";
    case "manufactureYear":
      return isFiniteNum(vehicle.manufactureYear)
        ? vehicle.manufactureYear
        : "—";
    default:
      return "—";
  }
};

/* =========================================================
   🔹 Main component
   ========================================================= */
const VehicleTable = ({ filteredData = [], setActiveModal }) => {
  const columns = getColumns();
  const pageSize = 10;
  const [page, setPage] = useState(1);

  const total = filteredData.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [pageCount]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page]);

  if (total === 0) {
    return <p>Không tìm thấy thông số xe nào phù hợp với bộ lọc.</p>;
  }

  const goToPage = (p) => {
    if (p < 1 || p > pageCount) return;
    setPage(p);
  };

  const renderPagination = () => {
    const maxButtons = 5;
    let start = Math.max(1, page - Math.floor(maxButtons / 2));
    let end = Math.min(pageCount, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);

    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(
        <button
          key={i}
          className={`pagination-btn ${i === page ? "active" : ""}`}
          onClick={() => goToPage(i)}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="table-pagination">
        <button
          className="pagination-btn"
          onClick={() => goToPage(page - 1)}
          disabled={page === 1}
        >
          ← Trước
        </button>
        {pages}
        <button
          className="pagination-btn"
          onClick={() => goToPage(page + 1)}
          disabled={page === pageCount}
        >
          Sau →
        </button>
      </div>
    );
  };

  return (
    <div className="user-table-section vehicle-table">
      <h3>Danh sách Thông số xe ({total} mục)</h3>

      {/* ✅ Vùng cuộn nội dung bảng */}
      <div className="table-scroll-area">
        <table className="minimal-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((vehicle, i) => {
              const globalIndex = (page - 1) * pageSize + i;
              return (
                <tr
                  key={
                    hasId(vehicle.vehicleId) ? vehicle.vehicleId : globalIndex
                  }
                >
                  {columns.map((col) =>
                    col.key === "action" ? (
                      <td key={col.key} className="action-cell">
                        <EditOutlined
                          className="action-icon edit-icon"
                          title="Chỉnh sửa"
                          onClick={() =>
                            setActiveModal?.(`editVehicle-${vehicle.vehicleId}`)
                          }
                        />
                        <DeleteOutlined
                          className="action-icon delete-icon"
                          title="Xóa"
                          onClick={() =>
                            setActiveModal?.(
                              `deleteVehicle-${vehicle.vehicleId}`
                            )
                          }
                        />
                      </td>
                    ) : (
                      <td key={col.key}>
                        {renderCell(vehicle, col.key, globalIndex)}
                      </td>
                    )
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ✅ Phân trang nằm ngoài vùng cuộn */}
      {total > pageSize && renderPagination()}
    </div>
  );
};

export default VehicleTable;
