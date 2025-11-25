// src/components/UserManagement/Modals/AdminModals.jsx
import React from "react";
import ServiceModal from "./ServiceModal";
import GeneralDeleteModal from "./GeneralDeleteModal";
import GeneralEditModal from "./GeneralEditModal";
import VehicleModal from "./VehicleModal";
// import StaffModal from "./StaffModal"; // Thay bằng GeneralEditModal cho tính đơn giản

const AdminModals = ({
  activeModal,
  setActiveModal,
  allAccounts = [],
  allVehicles = [],
  servicePackages = [],
  crudActions = {},
  // ✅ THÊM PROPS CHO STAFF
  staffsByStation = {},
}) => {
  if (!activeModal) return null;

  let actionType = null;
  let entityId = null;
  let stationId = null; // ✅ Thêm stationId

  // --- Logic Phân tích activeModal ---
  let entityData = null;

  if (typeof activeModal === "string") {
    // Xử lý các modal cũ (deleteUser-123, editService-456)
    const parts = activeModal.split("-");
    actionType = parts[0];
    entityId = parts.length > 1 ? parts[1] : null;

    // Xử lý modal xóa Staff (deleteStaffFromStation-StationX-StaffY)
    if (actionType === "deleteStaffFromStation" && parts.length === 3) {
      stationId = parts[1].replace("Station", ""); // Lấy Station ID
      entityId = parts[2].replace("Staff", ""); // Lấy Staff ID

      // Tìm thông tin staff để hiển thị trong modal xóa
      const staffList = staffsByStation[stationId] || [];
      entityData = staffList.find(
        (s) => String(s.id) === entityId || String(s.accountId) === entityId
      );
    }

    // Tìm dữ liệu để edit User
    if (actionType.toLowerCase().includes("user") && entityId) {
      entityData = allAccounts.find(
        (u) => String(u.accountId) === entityId || String(u.id) === entityId
      );
    }
  } else if (typeof activeModal === "object" && activeModal.type) {
    // Xử lý modal mới (ví dụ: Thêm Staff)
    actionType = activeModal.type; // addStaff
    stationId = activeModal.stationId; // Station ID cần thêm staff vào
  }
  // --- Hết Logic Phân tích activeModal ---

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {/* ==================================== MODAL THÊM STAFF ==================================== */}
        {actionType === "addStaff" && stationId && (
          <GeneralEditModal
            setActiveModal={setActiveModal}
            // Sử dụng entityData là một đối tượng chứa Station ID để StaffModal biết cần thêm vào đâu
            entityData={{ stationId: stationId, role: "StationStaff" }}
            crudActions={crudActions}
            modalType="addStaff" // ✅ Cờ báo cho GeneralEditModal biết đây là modal Add Staff
          />
        )}

        {/* ==================================== MODAL XÓA STAFF ==================================== */}
        {actionType === "deleteStaffFromStation" && entityData && (
          <GeneralDeleteModal
            setActiveModal={setActiveModal}
            entityId={entityId} // Staff ID
            actionType="staff"
            crudActions={crudActions}
            // ✅ THÔNG TIN ĐẶC BIỆT CHO STAFF DELETE
            entityName={`Nhân viên: ${entityData?.userName} (ID: ${entityId})`}
            stationId={stationId}
          />
        )}

        {/* ==================================== CÁC MODAL CŨ ==================================== */}

        {/* Service Modal */}
        {(actionType === "addService" || actionType === "editService") && (
          <ServiceModal
            activeModal={activeModal}
            setActiveModal={setActiveModal}
            servicePackages={servicePackages}
            entityId={entityId}
            crudActions={crudActions}
          />
        )}

        {/* Edit User Modal */}
        {actionType === "editUser" && entityData && (
          <GeneralEditModal
            setActiveModal={setActiveModal}
            entityData={entityData}
            crudActions={crudActions}
            modalType="editUser"
          />
        )}

        {/* Delete User/Service Modal (General) */}
        {actionType.startsWith("delete") &&
          entityId &&
          !actionType.includes("Vehicle") &&
          actionType !== "deleteStaffFromStation" && ( // Loại trừ Staff
            <GeneralDeleteModal
              setActiveModal={setActiveModal}
              entityId={entityId}
              actionType={actionType.replace("delete", "").toLowerCase()}
              crudActions={crudActions}
            />
          )}

        {/* Edit Vehicle Modal */}
        {actionType === "editVehicle" && entityId && (
          <VehicleModal
            setActiveModal={setActiveModal}
            entityId={entityId}
            allVehicles={allVehicles}
            crudActions={crudActions}
          />
        )}

        {/* Delete Vehicle Modal */}
        {actionType === "deleteVehicle" && entityId && (
          <GeneralDeleteModal
            setActiveModal={setActiveModal}
            entityId={entityId}
            actionType="vehicle"
            crudActions={crudActions}
          />
        )}
      </div>
    </div>
  );
};

export default AdminModals;
