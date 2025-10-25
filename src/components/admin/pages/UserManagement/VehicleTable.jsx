import React from "react";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

/* =========================================================
   🔹 HÀM XÁC ĐỊNH CỘT BẢNG
   ========================================================= */
const getColumns = () => {
  return [
    { key: "STT", header: "STT" },
    { key: "vehicleId", header: "ID Xe" },
    { key: "ownerType", header: "Loại chủ sở hữu" }, // 👈 mới thêm
    { key: "ownerId", header: "ID Chủ sở hữu" }, // CustomerId / CompanyId
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
      return vehicle.vehicleId || "—";
    case "ownerType":
      if (vehicle.companyId) return "Công ty";
      if (vehicle.customerId) return "Cá nhân";
      return "Không xác định";
    case "ownerId":
      return vehicle.customerId || vehicle.companyId || "—";
    case "carMaker":
      return vehicle.carMaker || "—";
    case "model":
      return vehicle.model || "—";
    case "vehicleType":
      return vehicle.vehicleType || "—";
    case "batteryCapacity":
      return vehicle.batteryCapacity ? `${vehicle.batteryCapacity} kWh` : "—";
    case "licensePlate":
      return vehicle.licensePlate || "—";
    case "manufactureYear":
      return vehicle.manufactureYear || "—";
    default:
      return "—";
  }
};

/* =========================================================
   🔹 COMPONENT CHÍNH: VehicleTable
   ========================================================= */
const VehicleTable = ({ filteredData = [], setActiveModal }) => {
  const columns = getColumns();

  if (filteredData.length === 0) {
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
            <tr key={vehicle.vehicleId || index}>
              {columns.map((col) => {
                if (col.key === "action") {
                  const vehicleId = vehicle.vehicleId;

                  return (
                    <td key={col.key} className="action-cell">
                      <button
                        className="icon-btn"
                        onClick={() =>
                          setActiveModal(`editVehicle-${vehicleId}`)
                        }
                        disabled={!vehicleId}
                      >
                        <EditOutlined />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() =>
                          setActiveModal(`deleteVehicle-${vehicleId}`)
                        }
                        disabled={!vehicleId}
                      >
                        <DeleteOutlined />
                      </button>
                    </td>
                  );
                }

                // ✅ Ô dữ liệu bình thường
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
