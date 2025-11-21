import React, { useState } from "react";

export default function AddStationStaffModal({
  setActiveModal,
  stations = [],
  accounts = [],
  onSubmit,
}) {
  const [stationId, setStationId] = useState("");
  const [accountId, setAccountId] = useState("");

  const handleSubmit = () => {
    if (!stationId || !accountId) {
      alert("Vui lòng chọn đầy đủ thông tin.");
      return;
    }
    onSubmit({ stationId, accountId });
    setActiveModal(null);
  };

  return (
    <div className="modal-content">
      <h3>Thêm nhân viên trạm</h3>

      <label>Chọn trạm:</label>
      <select value={stationId} onChange={(e) => setStationId(e.target.value)}>
        <option value="">-- Chọn trạm --</option>
        {stations.map((s) => (
          <option key={s.stationId} value={s.stationId}>
            {s.stationName}
          </option>
        ))}
      </select>

      <label>Chọn tài khoản:</label>
      <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        <option value="">-- Chọn tài khoản --</option>
        {accounts.map((a) => (
          <option key={a.accountId} value={a.accountId}>
            {a.userName} (ID: {a.accountId})
          </option>
        ))}
      </select>

      <div className="modal-actions">
        <button className="btn cancel" onClick={() => setActiveModal(null)}>
          Hủy
        </button>
        <button className="btn primary" onClick={handleSubmit}>
          Thêm
        </button>
      </div>
    </div>
  );
}
