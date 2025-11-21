import React, { useState } from "react";

const GeneralDeleteModal = ({
  setActiveModal,
  entityId,
  actionType,
  crudActions,
  entityName,
  stationId,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const objectMap = {
    user: "Người dùng",
    vehicle: "Thông số xe",
    service: "Gói dịch vụ",
    staff: "Nhân viên",
  };

  const objectTitle =
    entityName || `${objectMap[actionType] || "Mục"} (ID: ${entityId})`;

  const handleDelete = async () => {
    console.log(
      `Xóa ${actionType} ID: ${entityId}` +
        (actionType === "staff" ? ` tại Station ${stationId}` : "")
    );
    setIsDeleting(true);
    let success = false;

    try {
      if (actionType === "user") {
        success = await crudActions.deleteUser(entityId);
      } else if (actionType === "vehicle") {
        success = await crudActions.deleteVehicle(entityId);
      } else if (actionType === "service") {
        success = await crudActions.deleteServicePackage(entityId);
      } else if (actionType === "staff") {
        if (!stationId) {
          console.error("Lỗi: Thiếu Station ID khi xóa Staff.");
          return;
        }
        success = await crudActions.deleteStaffFromStation(stationId, entityId);
      }
    } catch (error) {
      console.error("Lỗi xóa:", error);
    } finally {
      setIsDeleting(false);
      if (success) {
        setActiveModal(null);
      }
    }
  };

  const stationContext =
    actionType === "staff" && stationId ? `khỏi **Station ${stationId}**` : "";

  return (
    <>
      <h3>Xác nhận xóa {objectMap[actionType] || "Mục"}</h3>
      <p className="text-red-600 font-medium p-4 bg-red-50 rounded-lg">
        Bạn có chắc chắn muốn xóa **{objectTitle}** {stationContext}? Thao tác
        này không thể hoàn tác.
      </p>
      <div className="modal-actions mt-4 flex justify-end space-x-3">
        <button
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "Đang xóa..." : "Xóa vĩnh viễn"}
        </button>
        <button
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
          onClick={() => setActiveModal(null)}
          disabled={isDeleting}
        >
          Hủy
        </button>
      </div>
    </>
  );
};

export default GeneralDeleteModal;
