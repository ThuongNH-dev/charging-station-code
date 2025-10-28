// src/components/UserManagement/Modals/VehicleModal.jsx
import React, { useState, useEffect } from "react";

const VehicleModal = ({
  setActiveModal,
  entityId,
  allVehicles,
  crudActions,
}) => {
  const [vehicleData, setVehicleData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const vehicle = allVehicles.find((v) => v.vehicleId === Number(entityId));
    if (vehicle) setVehicleData(vehicle);
  }, [entityId, allVehicles]);

  if (!entityId || !vehicleData) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await crudActions.updateVehicle(entityId, vehicleData);
      setActiveModal(null);
    } catch (err) {
      console.error("❌ Lỗi khi lưu:", err);
      alert("Lưu thất bại: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>Chỉnh sửa thông số xe</h3>
        <div className="form-group">
          <label>Hãng</label>
          <input
            type="text"
            value={vehicleData.carMaker || ""}
            onChange={(e) =>
              setVehicleData({ ...vehicleData, carMaker: e.target.value })
            }
          />
        </div>
        <div className="form-group">
          <label>Dòng xe</label>
          <input
            type="text"
            value={vehicleData.model || ""}
            onChange={(e) =>
              setVehicleData({ ...vehicleData, model: e.target.value })
            }
          />
        </div>
        <div className="form-group">
          <label>Loại xe</label>
          <input
            type="text"
            value={vehicleData.vehicleType || ""}
            onChange={(e) =>
              setVehicleData({ ...vehicleData, vehicleType: e.target.value })
            }
          />
        </div>
        <div className="form-group">
          <label>Biển số</label>
          <input
            type="text"
            value={vehicleData.licensePlate || ""}
            onChange={(e) =>
              setVehicleData({ ...vehicleData, licensePlate: e.target.value })
            }
          />
        </div>
        <div className="form-group">
          <label>Dung lượng pin (kWh)</label>
          <input
            type="number"
            value={vehicleData.batteryCapacity || ""}
            onChange={(e) =>
              setVehicleData({
                ...vehicleData,
                batteryCapacity: Number(e.target.value),
              })
            }
          />
        </div>
        <div className="form-group">
          <label>Năm sản xuất</label>
          <input
            type="number"
            value={vehicleData.manufactureYear || ""}
            onChange={(e) =>
              setVehicleData({
                ...vehicleData,
                manufactureYear: Number(e.target.value),
              })
            }
          />
        </div>

        <div className="modal-actions">
          <button
            className="btn primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Đang lưu..." : "Lưu"}
          </button>
          <button
            className="btn secondary"
            onClick={() => setActiveModal(null)}
            disabled={isSaving}
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleModal;
