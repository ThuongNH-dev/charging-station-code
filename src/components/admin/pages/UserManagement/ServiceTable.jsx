// src/components/UserManagement/ServiceTable.jsx
import React from "react";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

const ServiceTable = ({ filteredData = [], setActiveModal }) => {
  if (filteredData.length === 0) {
    return <p>Không tìm thấy gói dịch vụ nào phù hợp với bộ lọc.</p>;
  }

  return (
    <div className="user-table-section service-package-table">
      <h3>Danh sách Gói dịch vụ ({filteredData.length} mục)</h3>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên gói</th>
            <th>Giá</th>
            <th>Thời hạn</th>
            <th>Giới hạn</th>
            <th>Quyền lợi</th>
            <th>Loại</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((pkg) => (
            <tr key={pkg.id}>
              <td>{pkg.id}</td>
              <td>{pkg.name}</td>
              <td>{pkg.price}</td>
              <td>{pkg.duration}</td>
              <td>{pkg.limit}</td>
              <td className="description-cell">{pkg.benefits}</td>
              <td>{pkg.type}</td>
              <td>
                <span
                  className={`status ${
                    pkg.status === "Đang bán" ? "active" : "inactive"
                  }`}
                >
                  {pkg.status}
                </span>
              </td>
              <td className="action-cell">
                <button
                  className="icon-btn"
                  onClick={() => setActiveModal(`editService-${pkg.id}`)}
                >
                  <EditOutlined />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setActiveModal(`deleteService-${pkg.id}`)}
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

export default ServiceTable;
