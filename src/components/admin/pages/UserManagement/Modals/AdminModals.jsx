// src/components/UserManagement/Modals/AdminModals.jsx
import React from "react";
import ServiceModal from "./ServiceModal";
import GeneralDeleteModal from "./GeneralDeleteModal";
import GeneralEditModal from "./GeneralEditModal";

// ActiveModal: 'addService', 'editUser-123', 'deleteVehicle-456'

const AdminModals = ({
  activeModal,
  setActiveModal,
  servicePackages,
  crudActions,
}) => {
  if (!activeModal) return null;

  // 1. Phân tích loại hành động và ID
  const parts = activeModal.split("-");
  const actionType = parts[0]; // addService, editUser, deleteVehicle, ...
  const entityId = parts.length > 1 ? parts[1] : null;

  // Lớp phủ (Overlay) cho tất cả các Modal
  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {/* 1. Modal THÊM/CHỈNH SỬA GÓI DỊCH VỤ */}
        {(actionType === "addService" ||
          actionType.includes("editService")) && (
          <ServiceModal
            activeModal={activeModal}
            setActiveModal={setActiveModal}
            servicePackages={servicePackages}
            entityId={entityId}
            crudActions={crudActions}
          />
        )}

        {/* 2. Modal CHỈNH SỬA CHUNG (Người dùng/Xe) - Placeholder */}
        {activeModal.includes("edit") && !activeModal.includes("Service") && (
          <GeneralEditModal
            activeModal={activeModal}
            setActiveModal={setActiveModal}
            actionType={actionType}
            entityId={entityId}
          />
        )}

        {/* 3. Modal XÓA CHUNG */}
        {activeModal.includes("delete") && (
          <GeneralDeleteModal
            activeModal={activeModal}
            setActiveModal={setActiveModal}
            entityId={entityId}
            actionType={actionType.replace("delete", "")} // user, vehicle, service
            crudActions={crudActions}
          />
        )}
      </div>
    </div>
  );
};

export default AdminModals;
