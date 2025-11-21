// src/components/admin/pages/UserManagement/StationStaffTable.jsx
import React from "react";
import "./StationStaffTable.css";

export default function StationStaffTable({
  stationStaffs = [],
  stations = [],
  accounts = [], // (không bắt buộc dùng, nhưng giữ để tương thích)
  setActiveModal,
}) {
  // Map stationId -> stationName (fallback nếu tên khác property)
  const stationMap = Object.fromEntries(
    (stations || []).map((s) => [s.stationId ?? s.id, s.stationName ?? s.name ?? "Trạm " + (s.stationId ?? s.id)])
  );

  return (
    <div className="station-staff-table">
      <div className="table-header">
        <h3>Danh sách nhân viên trạm</h3>
        <button
          className="btn primary"
          onClick={() => setActiveModal("addStationStaff")}
        >
          + Thêm nhân viên
        </button>
      </div>

      <table className="styled-table">
        <thead>
          <tr>
            <th>Trạm</th>
            <th>Nhân viên</th>
            <th>Email</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {(stationStaffs || []).length === 0 ? (
            <tr>
              <td colSpan="4" style={{ textAlign: "center", padding: 20 }}>
                Chưa có nhân viên trạm
              </td>
            </tr>
          ) : (
            (stationStaffs || []).map((ss) => {
              // dùng trường trả về từ API:
              const stationId = ss.stationId ?? ss.StationId;
              const staffId = ss.staffId ?? ss.staffId ?? ss.staffAccountId ?? ss.staffAccountId;
              const staffName = ss.staffName ?? ss.staffUsername ?? ss.staffAccountName ?? String(staffId);
              const staffEmail = ss.staffEmail ?? ss.email ?? "";

              return (
                <tr key={`${stationId}-${staffId}`}>
                  <td>{stationMap[stationId] || stationId}</td>
                  <td>{staffName}</td>
                  <td>{staffEmail || "—"}</td>
                  <td>
                    <button
                      className="btn danger"
                      onClick={() =>
                        setActiveModal({
                          type: "deleteStationStaff",
                          stationId,
                          staffId,
                        })
                      }
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
