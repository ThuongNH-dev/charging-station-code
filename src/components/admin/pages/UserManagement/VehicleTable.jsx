// src/components/UserManagement/VehicleTable.jsx
import React from "react";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

const VehicleTable = ({ filteredData = [], setActiveModal }) => {
  if (filteredData.length === 0) {
    return <p>Không tìm thấy thông số xe nào phù hợp với bộ lọc.</p>;
  }

  return (
    <div className="user-table-section vehicle-table">
      <h3>Danh sách Thông số xe ({filteredData.length} mục)</h3>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Hãng xe</th>
            <th>Loại xe</th>
            <th>Năm sản xuất</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((vehicle) => (
            <tr key={vehicle.id}>
              <td>{vehicle.id}</td>
              <td>{vehicle.brand}</td>
              <td>{vehicle.model}</td>
              <td>{vehicle.year}</td>
              <td className="action-cell">
                <button
                  className="icon-btn"
                  onClick={() => setActiveModal(`editVehicle-${vehicle.id}`)}
                >
                  <EditOutlined />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setActiveModal(`deleteVehicle-${vehicle.id}`)}
                >
                  <DeleteOutlined />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VehicleTable;
