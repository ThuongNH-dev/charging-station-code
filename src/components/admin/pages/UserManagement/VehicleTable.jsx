import React from "react";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

/* =========================================================
   🔹 Helpers
   ========================================================= */
// ID hợp lệ: số nguyên dương > 0
const hasId = (v) => Number.isInteger(v) && v > 0;
// Số hợp lệ (cho year, battery...): là số hữu hạn
const isFiniteNum = (v) => Number.isFinite(v);

/* =========================================================
   🔹 HÀM XÁC ĐỊNH CỘT BẢNG
   ========================================================= */
const getColumns = () => {
  return [
    { key: "STT", header: "STT" },
    { key: "vehicleId", header: "ID Xe" },
    { key: "ownerType", header: "Loại chủ sở hữu" },
    { key: "ownerId", header: "ID Chủ sở hữu" }, // CompanyId / CustomerId
    { key: "carMaker", header: "Hãng" },
    { key: "model", header: "Dòng xe" },
    { key: "vehicleType", header: "Loại xe" },
    { key: "batteryCapacity", header: "Dung lượng pin" },
    { key: "licensePlate", header: "Biển số" },
    { key: "manufactureYear", header: "Năm SX" },
    { key: "action", header: "Thao tác" },
  ];
};

/* =========================================================
   🔹 HÀM RENDER GIÁ TRỊ Ô (CELL)
   ========================================================= */
const renderCell = (vehicle, key, index) => {
  switch (key) {
    case "STT":
      return index + 1;

    case "vehicleId":
      return hasId(vehicle.vehicleId) ? vehicle.vehicleId : "—";

    case "ownerType":
      if (hasId(vehicle.companyId)) return "Công ty";
      if (hasId(vehicle.customerId)) return "Cá nhân";
      return "Không xác định";

    case "ownerId":
      if (hasId(vehicle.companyId)) return vehicle.companyId; // Ưu tiên công ty
      if (hasId(vehicle.customerId)) return vehicle.customerId; // Fallback cá nhân
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
   🔹 COMPONENT CHÍNH: VehicleTable
   ========================================================= */
const VehicleTable = ({ filteredData = [], setActiveModal }) => {
  const columns = getColumns();

  if (!filteredData || filteredData.length === 0) {
    return <p>Không tìm thấy thông số xe nào phù hợp với bộ lọc.</p>;
  }

  return (
    <div className="user-table-section vehicle-table">
      <h3>Danh sách Thông số xe ({filteredData.length} mục)</h3>

      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filteredData.map((vehicle, index) => (
            <tr key={hasId(vehicle.vehicleId) ? vehicle.vehicleId : index}>
              {columns.map((col) => {
                if (col.key === "action") {
                  return (
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
                          setActiveModal?.(`deleteVehicle-${vehicle.vehicleId}`)
                        }
                      />
                    </td>
                  );
                }

                // Ô dữ liệu bình thường
                return (
                  <td key={col.key}>{renderCell(vehicle, col.key, index)}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VehicleTable;
