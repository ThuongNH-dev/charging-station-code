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
  const initialData = entityId
    ? servicePackages.find((pkg) => pkg.id === entityId)
    : null;

  return (
    <>
      <h3>
        {activeModal === "addService"
          ? "Thêm gói dịch vụ mới"
          : `Chỉnh sửa Gói dịch vụ ID: ${entityId}`}
      </h3>

      <div className="modal-content">
        <ServicePackageForm
          initialData={initialData}
          crudActions={crudActions} // Truyền các hàm API
          setActiveModal={setActiveModal}
        />
      </div>
      {/* Các nút hành động đã được di chuyển vào ServicePackageForm để xử lý Submit */}
    </>
  );
};

export default ServiceModal;
