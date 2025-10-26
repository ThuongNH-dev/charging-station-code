// src/components/UserManagement/Modals/ServiceModal.jsx
import React from "react";
import ServicePackageForm from "../ServicePackageForm";

const ServiceModal = ({
  activeModal,
  setActiveModal,
  servicePackages,
  entityId,
  crudActions,
}) => {
  // Tìm dữ liệu ban đầu cho việc chỉnh sửa
  // Dựa trên API, sử dụng subscriptionPlanId làm ID chính
  const initialData = entityId
    ? servicePackages.find(
        (pkg) => String(pkg.subscriptionPlanId) === String(entityId)
      )
    : null;

  return (
    <div className="modal-container">
      <h3>
        {activeModal === "addService"
          ? "Thêm gói dịch vụ mới"
          : `Chỉnh sửa Gói dịch vụ ID: ${entityId}`}
      </h3>

      {initialData || activeModal === "addService" ? (
        <div className="modal-content">
          <ServicePackageForm
            initialData={initialData}
            crudActions={crudActions}
            setActiveModal={setActiveModal}
          />
        </div>
      ) : (
        <div className="modal-error">
          Không tìm thấy thông tin gói dịch vụ với ID: {entityId}.
        </div>
      )}
    </div>
  );
};

export default ServiceModal;
