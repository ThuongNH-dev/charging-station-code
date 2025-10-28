// src/components/UserManagement/Modals/AdminModals.jsx
import React from "react";
import ServiceModal from "./ServiceModal";
import GeneralDeleteModal from "./GeneralDeleteModal";
import GeneralEditModal from "./GeneralEditModal";
import VehicleModal from "./VehicleModal";

const AdminModals = ({
  activeModal,
  setActiveModal,
  allAccounts = [],
  allVehicles = [],
  servicePackages = [],
  crudActions = {},
}) => {
  if (!activeModal) return null;

  const parts = activeModal.split("-");
  const actionType = parts[0]; // addService, editService, editUser, deleteUser, editVehicle, deleteVehicle
  const entityId = parts.length > 1 ? parts[1] : null;

  // Tìm dữ liệu để edit User
  const entityData =
    actionType.toLowerCase().includes("user") && entityId
      ? allAccounts.find((u) => u.accountId === Number(entityId))
      : null;

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
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
          />
        )}

        {/* Delete User/Service Modal */}
        {actionType.startsWith("delete") &&
          entityId &&
          !actionType.includes("Vehicle") && (
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
