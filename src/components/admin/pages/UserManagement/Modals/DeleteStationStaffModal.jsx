import React from "react";

export default function DeleteStationStaffModal({
  setActiveModal,
  stationId,
  staffId,
  onSubmit,
}) {
  return (
    <div className="modal-content">
      <h3>Xóa nhân viên khỏi trạm</h3>
      <p>
        Bạn có chắc chắn muốn xóa nhân viên <b>{staffId}</b> khỏi trạm{" "}
        <b>{stationId}</b> ?
      </p>

      <div className="modal-actions">
        <button className="btn cancel" onClick={() => setActiveModal(null)}>
          Hủy
        </button>

        <button
          className="btn danger"
          onClick={() => {
            onSubmit();
            setActiveModal(null);
          }}
        >
          Xóa
        </button>
      </div>
    </div>
  );
}
